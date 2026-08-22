import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodeAseprite } from '../test/decodeAseprite.ts';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { sheetWriteJob } from '../test/sheetWriteJob.ts';
import { write } from './sheetWriteWorker.ts';
import type { SheetWriteReply } from './sheetWriteWorker.ts';

/**
 * That the thread always answers, whatever happens to it.
 *
 * The near side has no other way to learn anything: an unhandled rejection in a worker fires
 * `unhandledrejection` here and no `error` event there, so a path out of `write` that posts nothing
 * leaves `sheetWriteSession`'s promise unsettled and the Download button reading "Writing…" for the rest of
 * the session — across every view, since the flag is a store. Both of the ways that can happen are
 * below, and both were reachable before this file carried its guards.
 *
 * **`write` is called directly, never through a dispatched event**, and that is not a style choice:
 * importing `sheetWriteWorker.ts` registers its `message` listener on the window in this environment, so a
 * test that dispatched one would have the worker's own handler answer alongside whatever the test
 * was doing — and the symptom, a stray post nobody asked for, would point nowhere near here.
 */

const OPAQUE: Rgba = { r: 40, g: 80, b: 120, a: 255 };
const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** Every message the thread posted, and the transfer list it asked for. */
function listen(onPost?: () => void): { readonly posted: SheetWriteReply[] } {
  const posted: SheetWriteReply[] = [];
  vi.spyOn(globalThis, 'postMessage').mockImplementation((message: unknown) => {
    onPost?.();
    posted.push(message as SheetWriteReply);
  });
  return { posted };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('write', () => {
  it('answers with the file, magnified by the factor it was given', async () => {
    const { posted } = listen();
    await write(sheetWriteJob({ image: imageFrom(3, 2, () => OPAQUE), scale: 4 }));

    expect(posted).toHaveLength(1);
    const reply = posted[0];
    expect(reply?.kind).toBe('written');
    // 3 × 2 at a factor of 4 is 12 × 8, and one colour is one palette entry whatever the size.
    expect(reply?.kind === 'written' && reply.file.format === 'PNG' && reply.file.paletteEntries).toBe(1);
  });

  it('writes the format it was asked for, with the boxes magnified beside the sheet', async () => {
    const { posted } = listen();
    await write(
      sheetWriteJob({
        // One 2 × 2 sprite in the corner of a keyed sheet, at a factor of 2.
        image: imageFrom(4, 4, (x, y) => (x < 2 && y < 2 ? OPAQUE : CLEAR)),
        scale: 2,
        format: 'ASEPRITE',
        boxes: [{ left: 0, top: 0, width: 2, height: 2, pixels: 4 }],
      }),
    );

    const reply = posted[0];
    expect(reply?.kind === 'written' && reply.file.format).toBe('ASEPRITE');
    if (reply?.kind !== 'written') return;
    const decoded = await decodeAseprite(reply.file.bytes);
    // The boxes cross at 1:1 and are scaled here beside the image. Left unscaled, the cel would be
    // the 2 × 2 corner of a sheet that is now 8 × 8 — a quarter of the sprite, silently.
    expect([decoded.width, decoded.height]).toEqual([4, 4]);
    expect([decoded.frames[0]?.cels[0]?.width, decoded.frames[0]?.cels[0]?.height]).toEqual([4, 4]);
  });

  it('answers `failed` when the write itself throws, rather than rejecting into nothing', async () => {
    const { posted } = listen();
    // A scale the magnification cannot allocate for. `upscaleNearest` is synchronous, so without a
    // guard around it this throw escapes as an uncaught exception — which reaches the near side as
    // the thread having failed to *start*, which is not what happened.
    await write(sheetWriteJob({ image: imageFrom(2, 2, () => OPAQUE), scale: Number.MAX_SAFE_INTEGER }));

    expect(posted).toHaveLength(1);
    expect(posted[0]?.kind).toBe('failed');
  });

  it('does not reject when even the failure reply will not post', async () => {
    // The one state that cannot be reported: the reply channel is how this thread says anything, so
    // its own failure has nothing to say it with. What must not happen is a rejection escaping into
    // `void write(…)`, which would leave the near side in the same silence with an uncaught error
    // beside it — so this asserts the resolve, not a message.
    listen(() => {
      throw new Error('no room for anything');
    });

    await expect(write(sheetWriteJob({ image: imageFrom(2, 2, () => OPAQUE) }))).resolves.toBeUndefined();
    await expect(
      write(sheetWriteJob({ image: imageFrom(2, 2, () => OPAQUE), scale: Number.MAX_SAFE_INTEGER })),
    ).resolves.toBeUndefined();
  });

  it('answers `failed` when the reply itself will not post', async () => {
    // The success post throwing — a clone the browser will not make, or no room to build the
    // message. A throw in a `.then` fulfilment arm does not reach that call's rejection arm, so
    // before the guard this posted nothing at all and settled nothing.
    let first = true;
    const { posted } = listen(() => {
      if (!first) return;
      first = false;
      throw new Error('the file would not cross');
    });

    await write(sheetWriteJob({ image: imageFrom(2, 2, () => OPAQUE) }));

    expect(posted).toHaveLength(1);
    expect(posted[0]).toEqual({ kind: 'failed', reason: 'the file would not cross' });
  });
});
