import { afterEach, describe, expect, it, vi } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { imageFrom } from '../test/images.ts';
import { TUNE_STAGE_NAMES } from '../types/autoTune.ts';
import type { QuantiseSettings, Rgba } from '../types/quantiser.ts';
import { upscaleNearest } from '../utils/upscaleNearest.ts';
import { sweep } from './autoTuneWorker.ts';
import type { AutoTuneReply } from './autoTuneWorker.ts';

/**
 * That the thread always answers, whatever happens to it.
 *
 * The near side has no other way to learn anything: an exception escaping the listener fires no
 * `error` event on the `Worker` object once the module has evaluated, so a path out of `sweep` that
 * posts nothing leaves `autoTuneSession`'s promise unsettled and the Auto button reading "Tuning…"
 * for the rest of the session — across every view, since the flag is a store. Both of the ways that
 * can happen are below.
 *
 * **`sweep` is called directly, never through a dispatched event**, and that is not a style choice:
 * importing `autoTuneWorker.ts` registers its `message` listener on the window in this environment,
 * so a test that dispatched one would have the worker's own handler answer alongside whatever the
 * test was doing — and the symptom, a stray post nobody asked for, would point nowhere near here.
 */

const INK: Rgba = { r: 16, g: 14, b: 20, a: 255 };
const FILL: Rgba = { r: 150, g: 100, b: 60, a: 255 };

/** A 48 × 48 sheet: 12 × 12 of art at a scale of 4. */
const SHEET = upscaleNearest(
  imageFrom(12, 12, (x, y) => (x === 6 || y === 6 ? INK : FILL)),
  4,
);

const SETTINGS: QuantiseSettings = {
  ...QUANTISE_DEFAULT_DIALS,
  grid: 4,
  key: null,
  reduction: null,
};

/** Every message the thread posted. */
function listen(onPost?: () => void): { readonly posted: AutoTuneReply[] } {
  const posted: AutoTuneReply[] = [];
  vi.spyOn(globalThis, 'postMessage').mockImplementation((message: unknown) => {
    onPost?.();
    posted.push(message as AutoTuneReply);
  });
  return { posted };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('sweep', () => {
  it('answers with the outcome the sweep produced', () => {
    const { posted } = listen();

    sweep({ image: SHEET, settings: SETTINGS });

    expect(posted).toHaveLength(1);
    const reply = posted[0];
    expect(reply?.kind).toBe('tuned');
    if (reply?.kind !== 'tuned') return;
    expect(reply.outcome.candidates).toBeGreaterThan(1);
    expect(reply.outcome.stages).toHaveLength(TUNE_STAGE_NAMES.length);
  });

  it('answers with a sentence rather than throwing when the sweep refuses', () => {
    const { posted } = listen();

    // A sheet smaller than one cell of the grid: no window to read, and nothing to say about it.
    sweep({ image: imageFrom(6, 6, () => FILL), settings: { ...SETTINGS, grid: 8 } });

    expect(posted).toEqual([
      {
        kind: 'failed',
        reason: 'This sheet is smaller than one cell of the grid in force, so there is nothing to sweep',
      },
    ]);
  });

  it('answers a failure when the outcome itself will not post', () => {
    // The guard the near side depends on: an unguarded success post that throws escapes the
    // listener, reaches nobody, and leaves the promise unsettled for good.
    let first = true;
    const { posted } = listen(() => {
      if (!first) return;
      first = false;
      throw new Error('the outcome would not clone');
    });

    sweep({ image: SHEET, settings: SETTINGS });

    expect(posted).toEqual([{ kind: 'failed', reason: 'the outcome would not clone' }]);
  });

  it('stays silent rather than throwing when even the failure will not post', () => {
    // The one state that cannot be reported. Letting it throw would leave the near side in the same
    // silence with an uncaught error beside it, which is strictly worse.
    listen(() => {
      throw new Error('nothing can be posted');
    });

    expect(() => {
      sweep({ image: imageFrom(6, 6, () => FILL), settings: { ...SETTINGS, grid: 8 } });
    }).not.toThrow();
  });
});
