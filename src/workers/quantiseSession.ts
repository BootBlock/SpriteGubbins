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

/** Said for a reply the thread sent and this side could not read back. */
const REPLY_LOST = 'The quantiser’s answer could not be read back from its thread';

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
 * it, and by the time it starts nobody is waiting for it.
 *
 * Driven in Edge on `test_sprites/armour.png` (1254 × 1254) at a grid of 6, every other dial at its
 * default, stepping the outline slider four times 400 ms apart. Without the slot, four runs of four:
 * every position computed, settling 3407 ms, 4082 ms and 6345 ms after the last step. With it, **two**
 * transforms in three of four runs and three in the other — the position they started from and the one
 * they stopped on — settling in 1524–2117 ms.
 *
 * **Two is the floor and the count varies above it**, because the slot holds the next question and not
 * the running one: a pass that has started cannot be cancelled, so how many run depends on how the pass
 * duration falls against the step spacing. The one run of three caught a step arriving just after a
 * queued pass had begun. There is no yield point inside `quantiseImage` to notice a newer call at, and
 * putting one there would make a pure function aware of the thread it happens to run on.
 *
 * `QUANTISE_DEBOUNCE_MS` does not reach any of this. It suppresses the intermediate states of a number
 * being *typed*, which arrive faster than 250 ms apart; a slider step outlives it and is posted.
 */
let running: QuantiseSettings | null = null;

/**
 * The newest question asked while {@link running}, or `null` when there is none.
 *
 * One slot rather than a queue, because every entry but the last is a settings value the reader has
 * already left behind. Superseding one costs nothing that was worth having: a job that never runs files
 * no answer, and an answer to settings the reader has moved off is one `useQuantiseWork` finds stale
 * the moment it arrives — so all a queued job ever bought was the CPU it took to compute.
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
  // transform that *failed*, which has still stopped running. The answer is filed first so that the
  // store already holds it if starting the next question throws.
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
 * A reply the worker sent that will not deserialise on arrival.
 *
 * **No `message` follows one of these and no `error` fires**, so nothing else settles the job it was
 * the answer to. Before the slot existed that stranded one entry in {@link jobs} and suppressed that
 * one question; now it would leave {@link running} set on a transform that can never reply, and every
 * later question would queue behind it for the rest of the session. `autoTuneSession.ts` and
 * `sheetWriteSession.ts` both guard the same gap, in the same place, for the same reason.
 *
 * The event carries no correlation id, so there is no telling which outstanding call it belonged to.
 * Everything outstanding is failed together, which is honest about what is now unknown and is what
 * puts a sentence on screen in place of a tab that spins for ever. A `QuantiseResult` is much the
 * largest thing this protocol sends back, so the transform is the realistic one either way.
 *
 * **The thread is kept**, unlike {@link lose}: it still holds the sheet, and a reply that would not
 * come back says nothing about the next one. So the reader moves a dial and is asked again.
 */
function unreadable(): void {
  for (const job of jobs.values()) fail(job, REPLY_LOST);
  forget();
}

/**
 * File a failure against what a job was a failure *of*, which is what settles the wait for it.
 *
 * The same filing {@link file} gives the worker's own `failed` replies, and for the same reason:
 * `useQuantiseWork` derives `busy` from whether an answer matches the question in force, so a job
 * that leaves {@link jobs} without one leaves the tab reporting work that nothing is doing.
 */
function fail(job: Job, reason: string): void {
  const answers = useQuantiseAnswerStore.getState();
  if (job.kind === 'quantise') {
    answers.attempted({ kind: 'failed', settings: job.settings, reason });
  } else {
    answers.surveyed({ kind: 'failed', reason });
  }
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
  started.addEventListener('messageerror', unreadable);
  thread = started;
  return started;
}

/**
 * Post a call, and say whether one was posted — `false` where this session has no thread to post to,
 * and where the browser would not clone the call.
 *
 * **The job is recorded only once the browser has taken it, and the order is the point.** A clone the
 * browser will not make throws here — the realistic cause is room, since `load` carries the whole
 * sheet and that reaches 67 megabytes — and a job recorded before the throw is one no reply will ever
 * remove: it would leave {@link running} set on a transform that never started, where
 * {@link quantiseSheet} queues every later question behind it for the rest of the session. That is
 * the same consequence {@link unreadable} exists to prevent, by a route no listener ever hears about.
 * Recording afterwards is safe because a reply cannot arrive first: it is delivered as an event, and
 * this function has returned before the loop can run one.
 *
 * The throw is filed rather than propagated because there is nowhere for it to go — `loadSheet` is
 * called straight out of a drop handler with no error boundary above it, and `quantiseSheet` from a
 * timer, where it would be an uncaught exception. A sentence the tab can show is what a reader can
 * act on. `autoTuneSession.ts` and `sheetWriteSession.ts` both guard the same throw, in the same
 * place, for the same reason.
 */
function send(request: QuantiseRequest, job: Job): boolean {
  const worker = connect();
  if (worker === null) return false;
  const id = nextId++;
  const call: QuantiseCall = { id, request };
  try {
    worker.postMessage(call);
  } catch (error: unknown) {
    fail(job, error instanceof Error ? error.message : String(error));
    return false;
  }
  jobs.set(id, job);
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
 * Three cases, and only the first posts a call:
 *
 * - The worker is idle, so this question starts now.
 * - It is already running exactly this question, so nothing is posted and the queue is *emptied* —
 *   the caller only ever asks for the settings in force, so a queued value it has since moved back
 *   off has no reader left, and running it would recompute the answer about to arrive.
 * - It is running an older question, so this becomes the single job that starts when that one
 *   replies, displacing whatever was queued before it for the same reason.
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
  // Only what actually reached the thread counts as running, so that the slot means what its name
  // says. Today every path that stops {@link send} posting has already run {@link forget}, so nothing
  // observable turns on it — the alternative is a variable that is true of the code and false of the
  // world, which is what the next reader of it would be misled by.
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
