import { afterEach, describe, expect, it, vi } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { answer } from './paletteReadWorker.ts';
import type { PaletteReadReply } from './paletteReadWorker.ts';

/**
 * That the thread always answers, whatever happens to it.
 *
 * The near side has no other way to learn anything, so a path out of `answer` that posts nothing
 * leaves the reader's palette field waiting for good. `answer` is called directly, never through a
 * dispatched event, because importing the worker registers its `message` listener on this window —
 * see `sheetWriteWorker.test.ts`, which found that out first.
 */

const INK: Rgba = { r: 16, g: 32, b: 48, a: 255 };
const PAPER: Rgba = { r: 159, g: 211, b: 199, a: 255 };

function listen(onPost?: () => void): { readonly posted: PaletteReadReply[] } {
  const posted: PaletteReadReply[] = [];
  vi.spyOn(globalThis, 'postMessage').mockImplementation((message: unknown) => {
    onPost?.();
    posted.push(message as PaletteReadReply);
  });
  return { posted };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('answer', () => {
  it('answers each job with the reading it names', () => {
    const { posted } = listen();
    const image = imageFrom(2, 1, (x) => (x === 0 ? INK : PAPER));

    answer({ kind: 'swatch', image, max: 256 });
    answer({ kind: 'swatch', image, max: 1 });
    answer({ kind: 'reduce', image, max: 1 });
    answer({ kind: 'identity', image, backgroundKey: null });

    expect(posted).toEqual([
      { kind: 'read', entries: ['#102030', '#9FD3C7'] },
      // Past the cap, and nothing more to say about it.
      { kind: 'read', entries: null },
      { kind: 'read', entries: [expect.stringMatching(/^#[0-9A-F]{6}$/)] },
      // Equal coverage, so the packed colour breaks the tie.
      { kind: 'read', entries: ['#102030', '#9FD3C7'] },
    ]);
  });

  it('answers `failed` when the reading itself throws, rather than throwing into nothing', () => {
    const { posted } = listen();
    // An `ImageData` whose channels cannot be read, standing in for a flattening with no room.
    const unreadable = {
      width: 1,
      height: 1,
      get data(): Uint8ClampedArray {
        throw new Error('no room to flatten');
      },
    } as ImageData;

    answer({ kind: 'swatch', image: unreadable, max: 256 });

    expect(posted).toEqual([{ kind: 'failed', reason: 'no room to flatten' }]);
  });

  it('answers `failed` when the reply itself will not post', () => {
    let first = true;
    const { posted } = listen(() => {
      if (!first) return;
      first = false;
      throw new Error('the reply would not cross');
    });

    answer({ kind: 'swatch', image: imageFrom(1, 1, () => INK), max: 256 });

    expect(posted).toEqual([{ kind: 'failed', reason: 'the reply would not cross' }]);
  });

  it('does not throw when even the failure reply will not post', () => {
    listen(() => {
      throw new Error('no room for anything');
    });

    expect(() => {
      answer({ kind: 'swatch', image: imageFrom(1, 1, () => INK), max: 256 });
    }).not.toThrow();
  });
});
