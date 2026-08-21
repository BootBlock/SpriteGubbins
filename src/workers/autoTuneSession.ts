import { useAutoTuneStore } from '../stores/useAutoTuneStore.ts';
import type { TuneOutcome } from '../types/autoTune.ts';
import type { AutoTuneReply, AutoTuneRequest } from './autoTuneWorker.ts';

/**
 * The near side of {@link autoTuneWorker}: a thread per press, ended by its own answer.
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
 * **Every exit that started a thread terminates it, and every call settles**, and the two go
 * together: a thread left running holds a copy of the sheet, and a promise left unsettled leaves the
 * button reading "Tuning…" for the rest of the session — which a store, unlike component state, does
 * not clear by navigating away. **Five ways out have a thread to end**: an answer, a refusal from the
 * sweep itself, a reply that will not deserialise, a thread that will not evaluate, and a message
 * that will not be sent. **Two settle without ever starting one** — a browser that will not build a
 * worker, and a press arriving while the last sweep is still running, which is the only exit that
 * must not clear the flag it found set.
 */

export function tuneOffThread(request: AutoTuneRequest): Promise<TuneOutcome | null> {
  const tunes = useAutoTuneStore.getState();
  // No error is filed: the flag already on the store is what the panel is showing, and overwriting
  // it with this would replace "a sweep is running" with "a sweep was refused" while one runs.
  if (tunes.tuning) return Promise.resolve(null);

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./autoTuneWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      // A browser without module workers. Nothing is retried on the main thread: running the sweep
      // there is the freeze this file exists to prevent, and a reader is better told than frozen.
      tunes.failed('This browser would not start the thread the sweep runs on');
      resolve(null);
      return;
    }

    const run = tunes.began();
    /**
     * End the thread, then file the answer — but only where this sweep is still the one being
     * waited on.
     *
     * A sheet dropped mid-sweep moves the store's run number on, and everything this thread has to
     * say is about the sheet that was there before. Disowned, it resolves to nothing and writes
     * nothing, which leaves the flag and the report exactly as the new sheet left them.
     */
    const finish = (file: () => TuneOutcome | null): void => {
      worker.terminate();
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
          useAutoTuneStore.getState().failed(reply.reason);
          return null;
        }
        useAutoTuneStore.getState().settled(reply.outcome);
        return reply.outcome;
      });
    });
    // Fires where the module will not evaluate at all, which no reply can report.
    worker.addEventListener('error', () => {
      finish(() => {
        useAutoTuneStore.getState().failed('The thread the sweep runs on could not start');
        return null;
      });
    });
    // And where a reply was sent but will not deserialise on arrival — no `message` follows one of
    // these, so without it the promise is never settled and the flag above is never cleared.
    worker.addEventListener('messageerror', () => {
      finish(() => {
        useAutoTuneStore.getState().failed('The sweep’s answer could not be read back from its thread');
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
        useAutoTuneStore.getState().failed(error instanceof Error ? error.message : String(error));
        return null;
      });
    }
  });
}
