import { useSheetWriteStore } from '../stores/useSheetWriteStore.ts';
import type { EncodedPng } from '../utils/encodePng.ts';
import type { PngReply, PngRequest } from './pngWorker.ts';

/**
 * The near side of {@link pngWorker}: a thread per download, ended by its own answer.
 *
 * Deliberately unlike `quantiseSession.ts`, which keeps one thread and one sheet for a whole
 * session. That arrangement exists because the sheet crosses once and every settings change
 * afterwards is three small numbers — there is something worth keeping. Here there is not: what is
 * encoded is the *result*, which changes under every dial, so it would cross the boundary on each
 * press whatever the thread's lifetime. A thread that ends with the job needs no correlation ids, no
 * map of outstanding work, and no lifecycle to keep in step with the tab — and it releases the image
 * and the file with it.
 *
 * The magnification is a factor rather than an already-magnified image, so what crosses is the sheet
 * and not the file — see `pngWorker.ts`, which says what that is worth.
 *
 * **Every exit that started a thread terminates it, and every call settles**, and the two go
 * together: a thread left running holds the image it was given, and a promise left unsettled leaves
 * the button that returned it reading "Writing…" for the rest of the session — which a store, unlike
 * component state, does not clear by navigating away. **Five ways out have a thread to end**: an
 * answer, a refusal, a reply that will not deserialise, a thread that will not evaluate, and a
 * message that will not be sent. **Two settle without ever starting one** — a browser that will not
 * build a worker, and a press arriving while the last is still being written, which is the only exit
 * that must not clear the flag it found set. `pngSession.test.ts` walks all seven.
 */

/** Said where a press arrives while the last one is still being written; the button also refuses. */
const ALREADY_WRITING = 'A file is already being written';

export function encodeOffThread(image: ImageData, scale: number): Promise<EncodedPng> {
  const writes = useSheetWriteStore.getState();
  if (writes.writing) return Promise.reject(new Error(ALREADY_WRITING));

  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./pngWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      // A browser without module workers. Nothing is retried on the main thread: encoding there is
      // the freeze this file exists to prevent, and a reader is better told than frozen.
      reject(new Error('This browser would not start the thread the file is written on'));
      return;
    }

    writes.began();
    const finish = (settle: () => void): void => {
      worker.terminate();
      useSheetWriteStore.getState().ended();
      settle();
    };

    worker.addEventListener('message', (event: MessageEvent<PngReply>) => {
      const reply = event.data;
      finish(() => (reply.kind === 'encoded' ? resolve(reply.file) : reject(new Error(reply.reason))));
    });
    // Fires where the module will not evaluate at all, which no reply can report.
    worker.addEventListener('error', () => {
      finish(() => {
        reject(new Error('The thread the file is written on could not start'));
      });
    });
    // And where a reply was sent but will not deserialise on arrival — no `message` follows one of
    // these, so without it the promise is never settled and the flag above is never cleared.
    worker.addEventListener('messageerror', () => {
      finish(() => {
        reject(new Error('The finished file could not be read back from its thread'));
      });
    });

    try {
      worker.postMessage({ image, scale } satisfies PngRequest);
    } catch (error: unknown) {
      // A clone the browser would not make — the realistic cause is room, since the sheet can be 67
      // megabytes. Inside the `try` because a throw here reaches no listener, so the thread would be
      // left running with nothing ever to answer.
      finish(() => {
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  });
}
