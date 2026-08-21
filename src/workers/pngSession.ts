import type { EncodedPng } from '../utils/encodePng.ts';
import type { PngReply } from './pngWorker.ts';

/**
 * The near side of {@link pngWorker}: a thread per download, ended by its own answer.
 *
 * Deliberately unlike `quantiseSession.ts`, which keeps one thread and one sheet for a whole
 * session. That arrangement exists because the sheet crosses once and every settings change
 * afterwards is three small numbers — there is something worth keeping. Here there is not: what is
 * encoded is the *result*, magnified to whatever the Save At control says, so it is a different
 * picture on every press and would cross the boundary each time whatever the thread's lifetime.
 * A thread that ends with the job needs no correlation ids, no map of outstanding work, and no
 * lifecycle to keep in step with the tab — and it releases the image and the file with it.
 *
 * Nothing here is encoder logic, and nothing here is state.
 */
export function encodeOffThread(image: ImageData): Promise<EncodedPng> {
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

    const finish = (settle: () => void): void => {
      worker.terminate();
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

    worker.postMessage(image);
  });
}
