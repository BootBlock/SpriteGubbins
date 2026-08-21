/// <reference lib="webworker" />
import type { TuneOutcome } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { autoTune } from '../utils/autoTune.ts';

/**
 * The auto-tune sweep, off the thread that has to stay responsive.
 *
 * The sweep runs the whole quantiser pipeline once per candidate — up to sixty-five of them, over
 * three crops — so on the main thread it is not slow, it is a **freeze** of seconds inside a click
 * handler, where React cannot even paint the button as pressed. That is the same argument the sheet
 * writer's thread rests on, and the same argument that put the pipeline itself on a thread.
 *
 * **A thread per press, ended by its own answer**, which is the sheet writer's shape rather than the
 * quantiser's. The quantiser keeps one thread for a whole session because the sheet crosses once and
 * every dial afterwards is three small numbers — there is something worth keeping. Here there is
 * not: a sweep is about the sheet *and the dials in force*, and it runs to completion in one go, so
 * a thread that outlived it would be holding a copy of the sheet for nothing.
 *
 * **The quantiser's own thread is deliberately not reused, and it already holds the sheet.** Two
 * reasons, and the second is the one that decides it. A sweep queued behind that thread's message
 * loop would stall the preview the reader is watching, and a transform asked for during the sweep
 * would wait for the whole of it. And the sweep's crops are chosen by an energy pass over the entire
 * sheet, which on this thread is free and on the reader's thread is up to 16.8 million pixels. A
 * second copy of the sheet per press is a structured clone of tens of milliseconds against a sweep
 * of seconds, which is the cheaper half of that trade by two orders of magnitude.
 *
 * Nothing here is sweep logic. Every line of that is pure in `src/utils/autoTune.ts`, tested without
 * a DOM; this file is the thread it runs on.
 */

declare const self: DedicatedWorkerGlobalScope;

/** A sheet to sweep, and the settings the swept dials sit inside. */
export interface AutoTuneRequest {
  readonly image: ImageData;
  /**
   * The whole of what the pipeline is being asked for, with the dials as the reader has them.
   *
   * The grid, the keying and the colour reduction are held fixed — they are measurements and
   * decisions rather than positions to search — and the swept dials are read back off this as the
   * sweep's starting point. See `TunedDials`.
   */
  readonly settings: QuantiseSettings;
}

/** What comes back: where the dials want to be, or the sentence explaining why there is no answer. */
export type AutoTuneReply =
  | { readonly kind: 'tuned'; readonly outcome: TuneOutcome }
  | { readonly kind: 'failed'; readonly reason: string };

self.addEventListener('message', (event: MessageEvent<AutoTuneRequest>) => {
  sweep(event.data);
});

/**
 * Run the sweep and answer — with **both** halves guarded, because a throw this thread does not
 * handle reaches nobody.
 *
 * Exported for its own test rather than only reachable through the listener above; it is the one
 * thing in this file that is not plumbing, and its guards are exactly the kind of absence a test
 * states and a reading does not.
 *
 * An exception escaping here does reach the near side, but as the wrong thing: it fires `error` on
 * the `Worker` object, which is the event a thread that would not *evaluate* fires, so the reader is
 * told the sweep could not start when it started, ran, and ran out of room. A rejection would be
 * worse still — that fires `unhandledrejection` here and nothing at all there, leaving the promise
 * unsettled and the button reading "Tuning…" for the rest of the session. So the reply is the way
 * out of this file, and every path has to reach one.
 *
 * The two `try` blocks cover different failures and merging them would report one of them wrongly.
 * The first covers the sweep, whose realistic causes are room — the pipeline allocates several
 * full-size intermediates per candidate — and a sheet smaller than one cell of the grid, which
 * `autoTune` refuses in as many words. The second covers the reply itself. Both report through
 * {@link fail}, which cannot throw: a `failed` post that threw would escape as the very silence all
 * of this is arranged to prevent.
 *
 * **Importing this module registers the listener above**, wherever it is imported. In a worker that
 * is the point; in a test it means the suite holds a live `message` listener for the length of the
 * run, which is harmless while nothing else dispatches one and worth knowing before anything does.
 */
export function sweep({ image, settings }: AutoTuneRequest): void {
  let outcome: TuneOutcome;
  try {
    outcome = autoTune(image, settings);
  } catch (error: unknown) {
    fail(error);
    return;
  }

  try {
    post({ kind: 'tuned', outcome });
  } catch (error: unknown) {
    fail(error);
  }
}

/**
 * Report a failure, and never throw doing it.
 *
 * A `failed` reply is a short string, so whatever stopped an outcome crossing is unlikely to stop
 * this. But if even this will not post there is nothing left to try: the reply channel is the only
 * way this thread can say anything, and its own failure is the one state that cannot be reported.
 * Letting it throw would make things strictly worse — the near side would be left in the same
 * silence with an uncaught error beside it. So it is swallowed here, at the last hop, and nowhere
 * else in this file.
 */
function fail(error: unknown): void {
  try {
    post({ kind: 'failed', reason: error instanceof Error ? error.message : String(error) });
  } catch {
    // Nothing above this can hear us.
  }
}

function post(reply: AutoTuneReply): void {
  self.postMessage(reply);
}
