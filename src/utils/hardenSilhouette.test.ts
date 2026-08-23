import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import { hardenSilhouette } from './hardenSilhouette.ts';

/** A red sprite whose left column is solid and whose right three columns ramp down to nothing. */
const RAMP = imageFrom(4, 1, (x) => ({ r: 200, g: 40, b: 40, a: [255, 192, 64, 0][x] ?? 0 }));

describe('hardenSilhouette', () => {
  it('is the same image, by reference, at the off position', () => {
    // Guarded rather than called and returning a copy: the copy alone is 67MB at the ceiling this
    // app admits, and it would be paid by every reader who never touches the control.
    expect(hardenSilhouette(RAMP, 0)).toBe(RAMP);
  });

  it('clears what falls below the threshold and makes solid what does not', () => {
    // 50% is 127.5 of 255, so 192 is kept and 64 goes. The kept pixel keeps its own colour and takes
    // full alpha; the cleared one is the canonical `{0, 0, 0, 0}` the modal vote downstream needs.
    expect(Array.from(hardenSilhouette(RAMP, 50).data)).toEqual([
      200, 40, 40, 255, 200, 40, 40, 255, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
  });

  it('grows the silhouette at a low threshold and tightens it at a high one', () => {
    const alphas = (threshold: number): number[] =>
      Array.from(hardenSilhouette(RAMP, threshold).data).filter((_, index) => index % 4 === 3);

    // At 10 the coverage floor is 25.5, so both partial pixels are artwork; at 90 it is 229.5 and
    // neither is. The fully clear pixel is untouched either way — it carries no coverage to compare.
    expect(alphas(10)).toEqual([255, 255, 255, 0]);
    expect(alphas(90)).toEqual([255, 0, 0, 0]);
  });

  it('leaves a sheet that carries no partial alpha alone, by reference', () => {
    // The contract `snapSymmetric`, `snapFrames` and `antiAlias` all keep, and the ordinary state of
    // a sheet the passes above this one produced.
    const flat = imageFrom(4, 2, (x, y) => ({ r: 10, g: 20, b: 30, a: (x + y) % 2 === 0 ? 255 : 0 }));
    expect(hardenSilhouette(flat, 50)).toBe(flat);
  });

  it('reads only alpha, so an interior colour ramp at full coverage is untouched', () => {
    // The half of the problem this pass deliberately does not answer: an interior soft boundary is a
    // colour ramp at full alpha, and hardening one is what a colour reduction already does.
    const interior = imageFrom(4, 1, (x) => ({ r: x * 60, g: x * 60, b: x * 60, a: 255 }));
    expect(channels(hardenSilhouette(interior, 50))).toEqual(channels(interior));
  });

  it('does not alias its argument where it does write', () => {
    const hardened = hardenSilhouette(RAMP, 50);
    expect(hardened).not.toBe(RAMP);
    // The source is read throughout rather than written back, so a second run over it agrees.
    expect(channels(hardenSilhouette(RAMP, 50))).toEqual(channels(hardened));
  });
});
