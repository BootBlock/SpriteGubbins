import type { PaletteReadAnswer, PaletteReadJob } from '../utils/readPalette.ts';
import type { PaletteReadReply } from './paletteReadWorker.ts';

/**
 * The near side of {@link paletteReadWorker}: a thread per reading, ended by its answer or by the
 * reader moving on.
 *
 * Shaped as `sheetWriteSession.ts` is, and for its reason — one question, one reply — with one
 * difference: **no flag and no refusal of a second job.** A download is one button that must not be
 * pressed twice; a palette reading is a file the reader can replace at any moment, and the later
 * file is the one they mean. So a second job is always started, and the first is ended through the
 * `signal` its caller holds, which a `RequestSequence` ticket aborts the moment the reading it
 * started is retired.
 *
 * **Every exit that started a thread terminates it, and every call settles**: an answer, a refusal,
 * a reply that will not deserialise, a thread that will not evaluate, a job that will not be sent,
 * and an abort. A browser that will not build a worker settles without one, and so does a signal
 * already aborted. `paletteReadSession.test.ts` walks all eight.
 *
 * Nothing is retried on the main thread where a worker cannot start: running it there is the freeze
 * this file exists to prevent, and a reader is better told than frozen.
 */
export function readPaletteOffThread<Job extends PaletteReadJob>(
  job: Job,
  signal: AbortSignal,
): Promise<PaletteReadAnswer<Job>> {
  if (signal.aborted) return Promise.reject(abandoned());

  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL('./paletteReadWorker.ts', import.meta.url), { type: 'module' });
    } catch {
      reject(new Error('This browser would not start the thread the colours are read on'));
      return;
    }

    const stop = (): void => {
      finish(() => {
        reject(abandoned());
      });
    };
    const finish = (settle: () => void): void => {
      worker.terminate();
      signal.removeEventListener('abort', stop);
      settle();
    };
    signal.addEventListener('abort', stop);

    worker.addEventListener('message', (event: MessageEvent<PaletteReadReply>) => {
      const reply = event.data;
      // The one cast, where the answer crosses a boundary no type can: the thread answers each job
      // with `readPalette`'s reading of that job, which is `null` only for a `swatch` past its cap.
      finish(() => {
        if (reply.kind === 'read') resolve(reply.entries as PaletteReadAnswer<Job>);
        else reject(new Error(reply.reason));
      });
    });
    // Fires where the module will not evaluate at all, which no reply can report.
    worker.addEventListener('error', () => {
      finish(() => {
        reject(new Error('The thread the colours are read on could not start'));
      });
    });
    // And where a reply was sent but will not deserialise; no `message` follows one of these.
    worker.addEventListener('messageerror', () => {
      finish(() => {
        reject(new Error('The colours could not be read back from their thread'));
      });
    });

    try {
      // Copied rather than transferred. The caller keeps the picture — the custom palette field
      // holds a refused sheet for the reduction it offers, and the identity lock's button hands over
      // the Quantise tab's own result — and a transfer would leave either holding a detached buffer.
      worker.postMessage(job);
    } catch (error: unknown) {
      // A clone the browser would not make, realistically for room. A throw here reaches no
      // listener, so without this the thread would be left running with nothing to answer.
      finish(() => {
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    }
  });
}

/** The rejection a retired reading settles with, which its caller drops without a word. */
function abandoned(): DOMException {
  return new DOMException('The reading was superseded before it finished', 'AbortError');
}
