import { useQuantiseAnswerStore } from '../stores/useQuantiseAnswerStore.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { sameQuantiseSettings } from '../utils/quantiseSettings.ts';
import { isQuantiseReply } from './quantiseProtocol.ts';
import type { QuantiseCall, QuantiseRequest } from './quantiseProtocol.ts';

/**
 * The near side of the quantiser's protocol: one thread, one loaded sheet, for as long as it is
 * needed.
 *
 * **The session outlives the tab, and that is the whole point of it.** `App` unmounts the view on
 * navigation, so a thread owned by a React effect is started and terminated on every trip to the
 * studio and back — and a thread that has just been started holds no sheet, so the sheet has to cross
 * the boundary again. On the largest image the app admits that is a 67-megabyte structured clone on
 * the main thread, a fresh survey of 16.8 million pixels, and then a transform the user had already
 * waited for once. Owned here instead, the thread is started when a sheet is first dropped and ends
 * when the tab is cleared, and navigating away costs nothing.
 *
 * Nothing here is quantiser logic, and nothing here is state. The transform is pure in `src/utils/`,
 * the answers are in `useQuantiseAnswerStore`, and this is the thread between them and the vocabulary
 * for asking — the same division `quantiseWorker.ts` describes from the other end.
 */

/** What a call was asking about, so its reply can be filed against the right question. */
type Job = { readonly kind: 'load' } | { readonly kind: 'quantise'; readonly settings: QuantiseSettings };

/**
 * Said for both ways the thread can be unavailable, because they are the same thing to a reader.
 *
 * `new Worker` throws synchronously where module workers are unsupported or the URL is blocked, and
 * fires `error` where the module fails to evaluate. Neither is recoverable and neither is the user's
 * doing.
 */
const THREAD_LOST = 'The quantiser could not start in this browser';

/** The thread, or `null` before the first sheet and after the tab is cleared. */
let thread: Worker | null = null;

/** Calls awaiting a reply, by correlation id. Anything not in here is an answer nobody wants. */
const jobs = new Map<number, Job>();

let nextId = 0;

/**
 * File a reply against the question it answered, or drop it.
 *
 * Dropping is how a sheet that has been replaced is handled: {@link loadSheet} abandons the jobs it
 * was about, so their replies arrive with an id nothing is waiting on. That is the only staleness
 * check in the pipeline — the store holds no image to compare against, because nothing about a
 * superseded sheet ever reaches it.
 */
function receive(event: MessageEvent<unknown>): void {
  const reply = event.data;
  if (!isQuantiseReply(reply)) return;
  const job = jobs.get(reply.id);
  if (job === undefined) return;
  jobs.delete(reply.id);

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

/** The thread, started on first use. `null` where this browser will not give us one. */
function connect(): Worker | null {
  if (thread !== null) return thread;

  let started: Worker;
  try {
    started = new Worker(new URL('./quantiseWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    useQuantiseAnswerStore.getState().died(THREAD_LOST);
    return null;
  }

  started.addEventListener('message', receive);
  started.addEventListener('error', () => {
    useQuantiseAnswerStore.getState().died(THREAD_LOST);
  });
  thread = started;
  return started;
}

function send(request: QuantiseRequest, job: Job): void {
  const worker = connect();
  if (worker === null) return;
  const id = nextId++;
  jobs.set(id, job);
  const call: QuantiseCall = { id, request };
  worker.postMessage(call);
}

/**
 * Hand the worker a sheet to keep, and abandon everything asked about the last one.
 *
 * The sheet crosses once, here, and every settings change afterwards is three small numbers — see
 * `quantiseWorker.ts` for what that saves. Clearing the jobs is not tidying: a transform of the
 * previous sheet may still be running, and its reply carries a correlation id this side would
 * otherwise still recognise.
 */
export function loadSheet(image: ImageData): void {
  jobs.clear();
  send({ kind: 'load', image }, { kind: 'load' });
}

/**
 * Ask for the sheet at these settings, unless that question is already outstanding.
 *
 * The guard matters because the session outlives the tab. A user who sets a grid and navigates away
 * before the answer lands comes back to a tab that has no result yet and no memory of having asked —
 * and asking again would put a second copy of a transform that runs for seconds behind the one
 * already running. Compared by value rather than by identity for the reason `sameQuantiseSettings`
 * gives: a `useMemo` that React discarded would make two identical questions look different.
 */
export function quantiseSheet(settings: QuantiseSettings): void {
  for (const job of jobs.values()) {
    if (job.kind === 'quantise' && sameQuantiseSettings(job.settings, settings)) return;
  }
  send({ kind: 'quantise', settings }, { kind: 'quantise', settings });
}

/**
 * End the session: no sheet, no thread, nothing outstanding.
 *
 * Terminating rather than asking the worker to drop the sheet, because there is nothing left to keep
 * the thread for — this is the user saying they are finished with this image. It takes the worker's
 * copy of the sheet, any intermediate a running transform had allocated, and the thread itself,
 * where a message could only ever have taken the first. The next sheet starts a new one.
 */
export function releaseSheet(): void {
  jobs.clear();
  thread?.terminate();
  thread = null;
}
