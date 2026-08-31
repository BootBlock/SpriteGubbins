import { useAutoTuneStore } from '../stores/useAutoTuneStore.ts';
import type { TuneOutcome } from '../types/autoTune.ts';
import type { QuantiseSurroundings } from '../types/quantiser.ts';
import type { AutoTuneReply, AutoTuneRequest } from './autoTuneWorker.ts';

/**
 * The near side of {@link autoTuneWorker}: a thread per press, ended by its own answer or by the
 * sheet it was about being replaced.
 *
 * The same shape as `sheetWriteSession.ts` and for the same reason — a sweep is one job with one
 * caller waiting on it, so a thread that ends with the job needs no correlation ids, no map of
 * outstanding work, and no lifecycle to keep in step with the tab. See `autoTuneWorker.ts` for why
 * the quantiser's long-lived thread is not reused even though it already holds the sheet.
 *
 * **Nothing here rejects, and that is a deliberate departure from the sheet writer next door.** That
 * one rejects because its caller turns a failure into a toast; this one's failures are shown by the
 * panel, which reads them from `useAutoTuneStore` — so a rejection would be a second channel for the
 * same fact, and the press site would need a `catch` whose only job is to swallow it. Instead every
 * outcome resolves: an answer the tab still wants resolves to it, and everything else resolves to
 * `null` with the reason already filed where the panel is looking.
 *
 * **Every answer is filed against the settings it was asked at**, a refusal as much as a report. The
 * sweep holds the grid, the keying and the colour reduction fixed and varies the dials inside them,
 * so what comes back is only true in those surroundings — and this is the one place holding a copy of
 * them that cannot have moved since the press. See `useAutoTuneStore.report`, which keeps them, and
 * `AutoTuneControls`, which is where they are compared with what is in force.
 *
 * **Every exit that started a thread terminates it, and every call settles**, and the two go
 * together: a thread left running holds a copy of the sheet, and a promise left unsettled leaves the
 * button reading "Tuning…" for the rest of the session — which a store, unlike component state, does
 * not clear by navigating away. **Six ways out have a thread to end**: an answer, a refusal from the
 * sweep itself, a reply that will not deserialise, a thread that will not evaluate, a message that
 * will not be sent, and {@link abandonSweep}. **Two settle without ever starting one** — a browser
 * that will not build a worker, and a press arriving while the last sweep is still running, which is
 * the only exit that must not clear the flag it found set.
 *
 * **{@link live} is what makes the last of those six possible, and it exists because clearing the
 * flag is not the same as stopping the work.** A reader who drops the next sheet of a series
 * mid-sweep disowns the answer — but a disown that only moved a run number on left the old thread
 * running for the rest of its several seconds, holding its own copy of the sheet it was given, while
 * the button it re-enabled started a *second* one beside it. So the sheet's arrival ends the thread
 * as well as forgetting what it was going to say.
 */

/** The sweep in flight, if there is one: the thread to end, and the caller to settle. */
let live: { readonly worker: Worker; readonly settle: (outcome: TuneOutcome | null) => void } | null = null;

export function tuneOffThread(request: AutoTuneRequest): Promise<TuneOutcome | null> {
  const tunes = useAutoTuneStore.getState();
  // No error is filed: the flag already on the store is what the panel is showing, and overwriting
  // it with this would replace "a sweep is running" with "a sweep was refused" while one runs.
  if (tunes.tuning) return Promise.resolve(null);

  // The three the sweep holds fixed, taken off the request rather than filed as the whole settings:
  // what a report is conditional on is these, and a copy carrying the dials as well would file the
  // report against the very positions it is about to replace. The annotation is what keeps the list
  // honest — a fourth field added to `QuantiseSettings` beyond the tuning fails to compile here.
  const { grid, key, reduction } = request.settings;
  const surroundings: QuantiseSurroundings = { grid, key, reduction };

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./autoTuneWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      // A browser without module workers. Nothing is retried on the main thread: running the sweep
      // there is the freeze this file exists to prevent, and a reader is better told than frozen.
      tunes.failed('This browser would not start the thread the sweep runs on', surroundings);
      resolve(null);
      return;
    }

    const run = tunes.began();
    live = { worker, settle: resolve };

    /**
     * End the thread, then file the answer — but only where this sweep is still the one being
     * waited on.
     *
     * The run check is what catches a reply that was already queued when {@link abandonSweep}
     * terminated the thread: terminating stops the worker, not a message event this thread has
     * already dispatched. Disowned, it resolves to nothing and writes nothing, which leaves the flag
     * and the report exactly as the new sheet left them.
     */
    const finish = (file: () => TuneOutcome | null): void => {
      worker.terminate();
      if (live?.worker === worker) live = null;
      if (!useAutoTuneStore.getState().owns(run)) {
        resolve(null);
        return;
      }
      resolve(file());
    };

    worker.addEventListener('message', (event: MessageEvent<AutoTuneReply>) => {
      const reply = event.data;
      finish(() => {
        if (reply.kind === 'failed') {
          useAutoTuneStore.getState().failed(reply.reason, surroundings);
          return null;
        }
        useAutoTuneStore.getState().settled(reply.outcome, surroundings);
        return reply.outcome;
      });
    });
    // Fires where the module will not evaluate at all, and where an exception escapes the worker's
    // own listener — neither of which any reply can report.
    worker.addEventListener('error', () => {
      finish(() => {
        useAutoTuneStore.getState().failed('The thread the sweep runs on could not start', surroundings);
        return null;
      });
    });
    // And where a reply was sent but will not deserialise on arrival — no `message` follows one of
    // these, so without it the promise is never settled and the flag above is never cleared.
    worker.addEventListener('messageerror', () => {
      finish(() => {
        useAutoTuneStore
          .getState()
          .failed('The sweep’s answer could not be read back from its thread', surroundings);
        return null;
      });
    });

    try {
      worker.postMessage(request);
    } catch (error: unknown) {
      // A clone the browser would not make — the realistic cause is room, since the sheet can be 67
      // megabytes. Inside the `try` because a throw here reaches no listener, so the thread would be
      // left running with nothing ever to answer.
      finish(() => {
        useAutoTuneStore
          .getState()
          .failed(error instanceof Error ? error.message : String(error), surroundings);
        return null;
      });
    }
  });
}

/**
 * Stop whatever sweep is running and drop what it was going to say, because the sheet it was about
 * is being replaced.
 *
 * Called from `useQuantiseStore`'s `setSource` and `clear`, exactly where `releaseSheet` is called
 * for the quantiser's own thread — and for the same reason. Ending the thread is the half a store
 * cannot do: `useAutoTuneStore.forget()` moves the run number on so the answer is disowned, but a
 * disowned thread that is still running holds its copy of the sheet and burns a core for the rest of
 * its several seconds, and the flag it cleared has re-enabled the button that would start a second
 * one beside it.
 *
 * Safe to call with nothing running, which is the ordinary case: dropping a first sheet, and every
 * sheet dropped after a sweep has finished.
 */
export function abandonSweep(): void {
  const abandoned = live;
  live = null;
  // Forgotten first, so the run number has already moved on if terminating or settling re-enters.
  useAutoTuneStore.getState().forget();
  if (abandoned === null) return;
  abandoned.worker.terminate();
  abandoned.settle(null);
}
