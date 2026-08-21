import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakePngWorker } from '../test/fakePngWorker.ts';
import { useSheetWriteStore } from '../stores/useSheetWriteStore.ts';
import { createImage } from '../utils/imageData.ts';
import { encodeOffThread } from './pngSession.ts';

/**
 * The bridge, without the thread: what is posted, which reply is believed, and — the property this
 * file exists for — that every way out ends the thread and settles the promise.
 *
 * A thread per download only stays cheap if every exit that started one ends it: an answer, a
 * refusal, a reply that will not deserialise, a thread that will not evaluate, and a message that
 * will not be sent. Two more settle without a thread to end — a browser that will not build a
 * worker, and a press arriving while the last is still being written. Each of the seven missed is a
 * leaked thread holding a sheet, or a promise nobody settles, which leaves the button reading
 * "Writing…" for the rest of the session.
 */

function thread(): FakePngWorker {
  const started = FakePngWorker.started.at(-1);
  if (started === undefined) throw new Error('no thread was started');
  return started;
}

const FILE = { bytes: new Uint8Array([137, 80]) as Uint8Array<ArrayBuffer>, paletteEntries: 4 };

beforeEach(() => {
  FakePngWorker.reset();
  useSheetWriteStore.setState({ writing: false });
  vi.stubGlobal('Worker', FakePngWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('encodeOffThread', () => {
  it('posts the sheet and the magnification, and resolves with the file that came back', async () => {
    const image = createImage(4, 4);
    const encoding = encodeOffThread(image, 8);
    // The sheet at its own size and the factor, never an already-magnified image: the magnification
    // is the expensive half, and it belongs on the far side of this boundary.
    expect(thread().posted).toEqual([{ image, scale: 8 }]);

    thread().answer({ kind: 'encoded', file: FILE });
    await expect(encoding).resolves.toEqual(FILE);
    expect(thread().terminated).toBe(true);
  });

  it('rejects with the reason the thread gave, and still ends it', async () => {
    const encoding = encodeOffThread(createImage(2, 2), 1);
    thread().answer({ kind: 'failed', reason: 'Array buffer allocation failed' });

    await expect(encoding).rejects.toThrow('Array buffer allocation failed');
    expect(thread().terminated).toBe(true);
  });

  it('rejects when the thread itself fails, which no reply can report', async () => {
    const encoding = encodeOffThread(createImage(2, 2), 1);
    thread().die();

    await expect(encoding).rejects.toThrow(/could not start/);
    expect(thread().terminated).toBe(true);
  });

  it('rejects when a reply arrives but will not deserialise', async () => {
    // No `message` follows one of these, so without its own listener the promise is never settled
    // and the flag below is never cleared — the button stays disabled for good.
    const encoding = encodeOffThread(createImage(2, 2), 1);
    thread().garble();

    await expect(encoding).rejects.toThrow(/could not be read back/);
    expect(thread().terminated).toBe(true);
  });

  it('rejects and ends the thread when the image will not cross the boundary', async () => {
    FakePngWorker.refusePost = true;
    const encoding = encodeOffThread(createImage(2, 2), 1);
    // A clone the browser would not make. It throws where no listener can see it, so the thread is
    // left running with nothing to answer unless the post is guarded.
    expect(thread().terminated).toBe(true);
    await expect(encoding).rejects.toThrow('would not clone');
  });

  it('rejects rather than falling back to the main thread where a browser has no workers', async () => {
    FakePngWorker.refuseToStart = true;
    await expect(encodeOffThread(createImage(2, 2), 1)).rejects.toThrow(/would not start the thread/);
    expect(FakePngWorker.started).toHaveLength(0);
    expect(useSheetWriteStore.getState().writing).toBe(false);
  });

  it('holds the writing flag for exactly as long as the thread runs', async () => {
    const encoding = encodeOffThread(createImage(2, 2), 1);
    expect(useSheetWriteStore.getState().writing).toBe(true);

    thread().answer({ kind: 'encoded', file: FILE });
    await encoding;
    expect(useSheetWriteStore.getState().writing).toBe(false);
  });

  it('refuses a second encode while one is running, rather than starting a second thread', async () => {
    const first = encodeOffThread(createImage(2, 2), 1);
    await expect(encodeOffThread(createImage(2, 2), 4)).rejects.toThrow(/already being written/);
    expect(FakePngWorker.started).toHaveLength(1);

    thread().answer({ kind: 'encoded', file: FILE });
    await first;
    // And the refusal is not permanent: the next press starts a thread as the first one did.
    void encodeOffThread(createImage(2, 2), 1);
    expect(FakePngWorker.started).toHaveLength(2);
  });
});
