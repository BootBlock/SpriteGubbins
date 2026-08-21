import { afterEach, describe, expect, it, vi } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { write } from './pngWorker.ts';
import type { PngReply } from './pngWorker.ts';

/**
 * That the thread always answers, whatever happens to it.
 *
 * The near side has no other way to learn anything: an unhandled rejection in a worker fires
 * `unhandledrejection` here and no `error` event there, so a path out of `write` that posts nothing
 * leaves `pngSession`'s promise unsettled and the Download button reading "Writing…" for the rest of
 * the session — across every view, since the flag is a store. Both of the ways that can happen are
 * below, and both were reachable before this file carried its guards.
 *
 * **`write` is called directly, never through a dispatched event**, and that is not a style choice:
 * importing `pngWorker.ts` registers its `message` listener on the window in this environment, so a
 * test that dispatched one would have the worker's own handler answer alongside whatever the test
 * was doing — and the symptom, a stray post nobody asked for, would point nowhere near here.
 */

const OPAQUE: Rgba = { r: 40, g: 80, b: 120, a: 255 };

/** Every message the thread posted, and the transfer list it asked for. */
function listen(onPost?: () => void): { readonly posted: PngReply[] } {
  const posted: PngReply[] = [];
  vi.spyOn(globalThis, 'postMessage').mockImplementation((message: unknown) => {
    onPost?.();
    posted.push(message as PngReply);
  });
  return { posted };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('write', () => {
  it('answers with the file, magnified by the factor it was given', async () => {
    const { posted } = listen();
    await write({ image: imageFrom(3, 2, () => OPAQUE), scale: 4 });

    expect(posted).toHaveLength(1);
    const reply = posted[0];
    expect(reply?.kind).toBe('encoded');
    // 3 × 2 at a factor of 4 is 12 × 8, and one colour is one palette entry whatever the size.
    expect(reply?.kind === 'encoded' && reply.file.paletteEntries).toBe(1);
  });

  it('answers `failed` when the encode itself throws, rather than rejecting into nothing', async () => {
    const { posted } = listen();
    // A scale the magnification cannot allocate for. `upscaleNearest` is synchronous, so without a
    // guard around it this throw escapes as an uncaught exception — which reaches the near side as
    // the thread having failed to *start*, which is not what happened.
    await write({ image: imageFrom(2, 2, () => OPAQUE), scale: Number.MAX_SAFE_INTEGER });

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

    await expect(write({ image: imageFrom(2, 2, () => OPAQUE), scale: 1 })).resolves.toBeUndefined();
    await expect(
      write({ image: imageFrom(2, 2, () => OPAQUE), scale: Number.MAX_SAFE_INTEGER }),
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

    await write({ image: imageFrom(2, 2, () => OPAQUE), scale: 1 });

    expect(posted).toHaveLength(1);
    expect(posted[0]).toEqual({ kind: 'failed', reason: 'the file would not cross' });
  });
});
