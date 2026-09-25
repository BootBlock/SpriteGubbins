import { afterEach, describe, expect, it, vi } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { imageFrom } from '../test/images.ts';
import type { QuantiseSettings, Rgba } from '../types/quantiser.ts';
import { quantiseImage } from '../utils/quantiseImage.ts';
import type { QuantiseReply } from './quantiseProtocol.ts';
import { answer } from './quantiseWorker.ts';

/**
 * That a result crosses by transfer, and that the transfer never takes the sheet the thread keeps.
 *
 * **The post is stood in for by one that detaches what it is handed**, as a browser's does. A spy
 * that only recorded the transfer list could not tell a transfer that took the kept sheet from one
 * that did not; this one empties every listed buffer, so a later transform of a detached sheet is
 * visible as one.
 *
 * **`answer` is called directly, never through a dispatched event**, for the reason
 * `autoTuneWorker.test.ts` gives: importing the worker registers its listener on the window here.
 */

vi.mock('../utils/quantiseImage.ts', async (actual) => {
  const real = await actual<typeof import('../utils/quantiseImage.ts')>();
  return { ...real, quantiseImage: vi.fn(real.quantiseImage) };
});

const INK: Rgba = { r: 16, g: 14, b: 20, a: 255 };
const FILL: Rgba = { r: 150, g: 100, b: 60, a: 255 };

/** A fresh sheet per test, since a test that fails may leave its buffer detached. */
function sheet(): ImageData {
  return imageFrom(16, 16, (x, y) => (x === y ? INK : FILL));
}

/** A grid of 1 with nothing keyed and nothing reduced: the path that does least to its input. */
const SETTINGS: QuantiseSettings = { ...QUANTISE_DEFAULT_DIALS, grid: 1, key: null, reduction: null };

interface Post {
  readonly reply: QuantiseReply;
  readonly transfer: readonly Transferable[];
}

function listen(): { readonly posted: Post[] } {
  const posted: Post[] = [];
  vi.spyOn(globalThis, 'postMessage').mockImplementation((reply: unknown, transfer?: unknown) => {
    const list = Array.isArray(transfer) ? (transfer as Transferable[]) : [];
    structuredClone(list, { transfer: list });
    posted.push({ reply: reply as QuantiseReply, transfer: list });
  });
  return { posted };
}

/** Load a sheet and quantise it twice, returning both posts of the result. */
function quantiseTwice(image: ImageData): readonly Post[] {
  const { posted } = listen();
  answer({ id: 1, request: { kind: 'load', image } });
  answer({ id: 2, request: { kind: 'quantise', settings: SETTINGS } });
  answer({ id: 3, request: { kind: 'quantise', settings: SETTINGS } });
  return posted.slice(1);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('answer', () => {
  it('transfers the result’s pixels and difference map, and keeps the sheet', () => {
    const image = sheet();
    const expected = quantiseImage(sheet(), SETTINGS);

    const posts = quantiseTwice(image);

    expect(image.data.byteLength).toBe(16 * 16 * 4);
    for (const { reply, transfer } of posts) {
      expect(reply.kind).toBe('quantised');
      if (reply.kind !== 'quantised') return;
      // By identity, since every detached buffer is equal to every other one by content.
      expect(transfer).toHaveLength(2);
      expect(transfer[0]).toBe(reply.result.difference.cells.buffer);
      expect(transfer[1]).toBe(reply.result.image.data.buffer);
      expect(transfer).not.toContain(image.data.buffer);
    }
    // The second transform read the same sheet as the first, not an emptied one.
    const second = posts[1]?.reply;
    expect(second?.kind === 'quantised' && second.result.colors).toBe(expected.colors);
  });

  it('clones rather than transfers a result that shares the kept sheet’s buffer', () => {
    const image = sheet();
    vi.mocked(quantiseImage).mockImplementationOnce((kept, settings) => ({
      ...quantiseImage(kept, settings),
      image: kept,
    }));

    const [first, second] = quantiseTwice(image);

    expect(first?.transfer).not.toContain(image.data.buffer);
    expect(first?.transfer).toHaveLength(1);
    expect(image.data.byteLength).toBe(16 * 16 * 4);
    expect(second?.reply.kind).toBe('quantised');
  });
});
