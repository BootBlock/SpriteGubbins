import { useQuantiseAnswerStore } from '../stores/useQuantiseAnswerStore.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { sameQuantiseSettings } from '../utils/quantiseSettings.ts';
import { isQuantiseReply } from './quantiseProtocol.ts';
import type { QuantiseCall, QuantiseReply, QuantiseRequest } from './quantiseProtocol.ts';

/**
 * The near side of the quantiser's protocol: one thread, one loaded sheet, from the first drop until
 * the tab is cleared.
 *
 * **The session outlives the tab, and that is the whole point of it.** `App` unmounts the view on
 * navigation, so a thread owned by a React effect is started and terminated on every trip to the
 * studio and back — and a new thread holds no sheet, so the sheet has to cross again: a 67-megabyte
 * structured clone on the main thread, a fresh survey, and a transform the user had already waited
 * for. See `quantiseWorker.ts` for what those figures are measured against.
 *
 * Nothing here is quantiser logic, and nothing here is state. The transform is pure in `src/utils/`,
 * the answers are in `useQuantiseAnswerStore`, and this is the thread between them and the vocabulary
 * for asking.
 */

/** What a call was asking about, so its reply can be filed against the right question. */
type Job = { readonly kind: 'load' } | { readonly kind: 'quantise'; readonly settings: QuantiseSettings };

/** Said for both ways the thread can be unavailable, because they are one thing to a reader. */
const THREAD_LOST = 'The quantiser could not start in this browser';

/** The thread, or `null` before the first sheet, after the tab is cleared, and after {@link lose}. */
let thread: Worker | null = null;

/** Whether this session has given up on having a thread at all. Cleared only by ending the session. */
let abandoned = false;

/** Calls awaiting a reply, by correlation id. Anything not in here is an answer nobody wants. */
const jobs = new Map<number, Job>();

let nextId = 0;

/**
 * The transform the worker is running right now, or `null` while it is idle.
 *
 * **At most one `quantise` call is ever outstanding**, which is what stops a reader who steps a slider
 * paying for every position they passed through. The worker runs each call to completion on one
 * message loop, so a job posted while another is running is not concurrent with it — it is *behind*
 * it, and by the time it starts nobody is waiting for it. Measured in Edge on `test_sprites/armour.png`
 * (1254 × 1254) at its own estimated grid of 6, every dial at its default: one transform settles
 * 1552 ms after the grid is applied, while four steps of one slider 400 ms apart took 3450 ms from the
 * last step, two superseded transforms running to completion first.
 *
 * `QUANTISE_DEBOUNCE_MS` does not reach that. It suppresses the intermediate states of a number being
 * *typed*, which arrive faster than 250 ms apart; a slider step outlives it and is posted.
 */
let running: QuantiseSettings | null = null;

/**
 * The newest question asked while {@link running}, or `null` when there is none.
 *
 * One slot rather than a queue, because every entry but the last is a settings value the reader has
 * already left behind. Superseding it costs nothing: the reply to a transform nobody is waiting for is
 * discarded by {@link receive} anyway, so all a queued job ever bought was the CPU to compute it.
 */
let pending: QuantiseSettings | null = null;

/** Drop everything outstanding — the jobs awaiting a reply, the transform running, and the one queued. */
function forget(): void {
  jobs.clear();
  running = null;
  pending = null;
}

/**
 * File a reply against the question it answered, or drop it.
 *
 * Dropping is how a sheet that has been replaced is handled: {@link loadSheet} abandons the jobs it
 * was about, so their replies arrive with an id nothing is waiting on. That is where staleness *of the
 * sheet* is decided, and the only place — the store holds no image to compare against, because
 * nothing about a superseded sheet ever reaches it. Staleness of the *settings* is a separate question
 * with a separate answer, `sameQuantiseSettings`, asked in `useQuantiseWork`.
 */
function receive(event: MessageEvent<unknown>): void {
  const reply = event.data;
  if (!isQuantiseReply(reply)) return;
  const job = jobs.get(reply.id);
  if (job === undefined) return;
  jobs.delete(reply.id);

  file(reply, job);

  // The queue is one deep, so a transform replying is what lets the next one start — including a
  // transform that *failed*, which has still stopped running. Settled after the answer is filed, so
  // the reader sees the result at the moment it arrives rather than one message loop later.
  if (job.kind === 'quantise') settle();
}

/** Put a reply into the answer store, against the question it answered. */
function file(reply: QuantiseReply, job: Job): void {
  const answers = useQuantiseAnswerStore.getState();
  if (reply.kind === 'loaded') {
    answers.surveyed({ kind: 'facts', facts: reply.facts });
    return;
  }
  if (reply.kind === 'quantised' && job.kind === 'quantise') {
    answers.attempted({ kind: 'quantised', settings: job.settings, result: reply.result });
    return;
  }
  // Every failure is filed against what it was a failure *of* — a transform against its settings, a
  // survey against the sheet — so that changing the thing it was about is what clears it. Neither is
  // terminal: the worker catches its own exception and carries on, and the realistic cause is memory
  // on one very large image, which says nothing about the next one.
  if (reply.kind === 'failed') {
    if (job.kind === 'quantise') {
      answers.attempted({ kind: 'failed', settings: job.settings, reason: reply.reason });
    } else {
      answers.surveyed({ kind: 'failed', reason: reply.reason });
    }
  }
}

/**
 * The worker is free again, so start whatever was asked for while it was busy.
 *
 * Re-entering {@link quantiseSheet} rather than posting directly, so the one place that decides
 * whether a question is worth asking stays the one place — and so a queued job that turns out to be
 * unsendable (a thread lost in the meantime) is handled exactly as a fresh one is.
 */
function settle(): void {
  const next = pending;
  running = null;
  pending = null;
  if (next !== null) quantiseSheet(next);
}

/**
 * Give up on the thread, and stay given up until the session ends.
 *
 * Both causes are properties of the browser rather than of the sheet — `new Worker` throws where
 * module workers are unsupported, and `error` fires where the module will not evaluate — so a later
 * sheet meets the same failure, and a session that quietly reconnected would put a working preview
 * under the banner saying the quantiser could not start.
 *
 * **The thread goes with the flag**, because a terminated worker still accepts `postMessage`: left in
 * place it would take a job that is never answered, leaving {@link running} set on a transform that
 * can never reply — where {@link quantiseSheet} would queue every later question behind it for good.
 */
function lose(): void {
  forget();
  thread?.terminate();
  thread = null;
  abandoned = true;
  useQuantiseAnswerStore.getState().died(THREAD_LOST);
}

/** The thread, started on first use. `null` where this browser will not give us one. */
function connect(): Worker | null {
  if (abandoned) return null;
  if (thread !== null) return thread;

  let started: Worker;
  try {
    started = new Worker(new URL('./quantiseWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    lose();
    return null;
  }

  started.addEventListener('message', receive);
  started.addEventListener('error', lose);
  thread = started;
  return started;
}

/** Post a call, and say whether one was posted — `false` where this session has no thread to post to. */
function send(request: QuantiseRequest, job: Job): boolean {
  const worker = connect();
  if (worker === null) return false;
  const id = nextId++;
  jobs.set(id, job);
  const call: QuantiseCall = { id, request };
  worker.postMessage(call);
  return true;
}

/**
 * Hand the worker a sheet to keep, and abandon everything asked about the last one.
 *
 * The sheet crosses once, here, and every settings change afterwards is three small numbers. Forgetting
 * what was outstanding is not tidying: a transform of the previous sheet may still be running, and its
 * reply carries a correlation id this side would otherwise still recognise — and a transform *queued*
 * behind it would otherwise start against a sheet it was never asked about.
 *
 * A `load` is never itself superseded by a `quantise` and never waits behind one on this side. It is
 * posted the moment it is asked for, and the worker adopts the sheet as soon as its loop reaches it.
 */
export function loadSheet(image: ImageData): void {
  forget();
  send({ kind: 'load', image }, { kind: 'load' });
}

/**
 * Ask for the sheet at these settings, coalescing anything asked while a transform is running.
 *
 * Three cases, and only the first posts a call: the worker is idle, so this starts; it is already
 * running exactly this question, so there is nothing to do and nothing to queue; or it is running an
 * older one, and this becomes the single job that starts when that one replies. The last case also
 * *clears* a queued value the caller has since moved off — the caller only ever asks for the settings
 * in force, so anything queued that differs from them has no reader left.
 *
 * The second case matters beyond coalescing, because the session outlives the tab: a user who sets a
 * grid and navigates away before the answer lands comes back with no result and no memory of having
 * asked. By value rather than by identity for the reason `sameQuantiseSettings` gives.
 */
export function quantiseSheet(settings: QuantiseSettings): void {
  if (running !== null) {
    pending = sameQuantiseSettings(running, settings) ? null : settings;
    return;
  }
  // Only what actually reached the thread counts as running, or a session that has lost its thread
  // would sit holding a transform that will never reply and refuse every question after it.
  running = send({ kind: 'quantise', settings }, { kind: 'quantise', settings }) ? settings : null;
}

/**
 * End the session: no sheet, no thread, nothing outstanding, and no memory of having given up.
 *
 * Terminating rather than asking the worker to drop the sheet, because there is nothing left to keep
 * the thread for. It takes the worker's copy of the sheet, any intermediate a running transform had
 * allocated, and the thread itself, where a message could only ever have taken the first.
 *
 * **This is the one thing that clears {@link lose}**, which is why `clear` in `useQuantiseStore`
 * *resets* the answers rather than merely forgetting them: the two have to agree about whether a fresh
 * start is possible, or the app is left reporting a quantiser that could not start while one is
 * answering. A browser that genuinely cannot build the thread simply fails again, and says so again.
 */
export function releaseSheet(): void {
  forget();
  thread?.terminate();
  thread = null;
  abandoned = false;
}
