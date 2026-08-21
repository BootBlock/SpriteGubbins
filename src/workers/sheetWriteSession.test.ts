import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeSheetWriteWorker } from '../test/fakeSheetWriteWorker.ts';
import { useSheetWriteStore } from '../stores/useSheetWriteStore.ts';
import { createImage } from '../utils/imageData.ts';
import type { SheetWriteRequest } from './sheetWriteWorker.ts';
import { writeSheetOffThread } from './sheetWriteSession.ts';

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

function thread(): FakeSheetWriteWorker {
  const started = FakeSheetWriteWorker.started.at(-1);
  if (started === undefined) throw new Error('no thread was started');
  return started;
}

const FILE = {
  format: 'PNG',
  bytes: new Uint8Array([137, 80]) as Uint8Array<ArrayBuffer>,
  paletteEntries: 4,
} as const;

/** One request, since what the seven exits are being walked over is the settling, not the payload. */
function request(scale = 1): SheetWriteRequest {
  return { image: createImage(2, 2), scale, format: 'PNG', boxes: [] };
}

beforeEach(() => {
  FakeSheetWriteWorker.reset();
  useSheetWriteStore.setState({ writing: false });
  vi.stubGlobal('Worker', FakeSheetWriteWorker);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('writeSheetOffThread', () => {
  it('posts the sheet, the magnification and the format, and resolves with the file', async () => {
    const image = createImage(4, 4);
    const boxes = [{ left: 0, top: 0, width: 2, height: 2, pixels: 4 }];
    const encoding = writeSheetOffThread({ image, scale: 8, format: 'ASEPRITE', boxes });
    // The sheet at its own size and the factor, never an already-magnified image: the magnification
    // is the expensive half, and it belongs on the far side of this boundary. The boxes cross at 1:1
    // beside it for the same reason, and are scaled there.
    expect(thread().posted).toEqual([{ image, scale: 8, format: 'ASEPRITE', boxes }]);

    thread().answer({ kind: 'written', file: FILE });
    await expect(encoding).resolves.toEqual(FILE);
    expect(thread().terminated).toBe(true);
  });

  it('rejects with the reason the thread gave, and still ends it', async () => {
    const encoding = writeSheetOffThread(request());
    thread().answer({ kind: 'failed', reason: 'Array buffer allocation failed' });

    await expect(encoding).rejects.toThrow('Array buffer allocation failed');
    expect(thread().terminated).toBe(true);
  });

  it('rejects when the thread itself fails, which no reply can report', async () => {
    const encoding = writeSheetOffThread(request());
    thread().die();

    await expect(encoding).rejects.toThrow(/could not start/);
    expect(thread().terminated).toBe(true);
  });

  it('rejects when a reply arrives but will not deserialise', async () => {
    // No `message` follows one of these, so without its own listener the promise is never settled
    // and the flag below is never cleared — the button stays disabled for good.
    const encoding = writeSheetOffThread(request());
    thread().garble();

    await expect(encoding).rejects.toThrow(/could not be read back/);
    expect(thread().terminated).toBe(true);
  });

  it('rejects and ends the thread when the image will not cross the boundary', async () => {
    FakeSheetWriteWorker.refusePost = true;
    const encoding = writeSheetOffThread(request());
    // A clone the browser would not make. It throws where no listener can see it, so the thread is
    // left running with nothing to answer unless the post is guarded.
    expect(thread().terminated).toBe(true);
    await expect(encoding).rejects.toThrow('would not clone');
  });

  it('rejects rather than falling back to the main thread where a browser has no workers', async () => {
    FakeSheetWriteWorker.refuseToStart = true;
    await expect(writeSheetOffThread(request())).rejects.toThrow(/would not start the thread/);
    expect(FakeSheetWriteWorker.started).toHaveLength(0);
    expect(useSheetWriteStore.getState().writing).toBe(false);
  });

  it('holds the writing flag for exactly as long as the thread runs', async () => {
    const encoding = writeSheetOffThread(request());
    expect(useSheetWriteStore.getState().writing).toBe(true);

    thread().answer({ kind: 'written', file: FILE });
    await encoding;
    expect(useSheetWriteStore.getState().writing).toBe(false);
  });

  it('refuses a second write while one is running, rather than starting a second thread', async () => {
    const first = writeSheetOffThread(request());
    await expect(writeSheetOffThread(request(4))).rejects.toThrow(/already being written/);
    expect(FakeSheetWriteWorker.started).toHaveLength(1);

    thread().answer({ kind: 'written', file: FILE });
    await first;
    // And the refusal is not permanent: the next press starts a thread as the first one did.
    void writeSheetOffThread(request());
    expect(FakeSheetWriteWorker.started).toHaveLength(2);
  });
});
