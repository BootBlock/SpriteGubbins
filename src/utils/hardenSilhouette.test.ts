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
    //
    // The fourth pixel arrived clear and is copied through carrying its own RGB, which is the
    // boundary on that canonicalisation: extending it to a pixel this pass did not clear would edit
    // something the early-out below hands back unedited.
    expect(Array.from(hardenSilhouette(RAMP, 50).data)).toEqual([
      200, 40, 40, 255, 200, 40, 40, 255, 0, 0, 0, 0, 200, 40, 40, 0,
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

  it('copies a sheet with partial alpha to the same bytes the early-out would have handed back', () => {
    // The two paths have to agree on every pixel the pass does not clear, or what a sheet comes out
    // as depends on whether it happened to hold any partial alpha. The clear pixels here carry a
    // colour, which is the case that separates them: one path copies it, the other cannot help but.
    const coloured = { r: 90, g: 110, b: 140, a: 0 };
    const settled = imageFrom(4, 1, (x) => (x % 2 === 0 ? coloured : { r: 10, g: 20, b: 30, a: 255 }));
    // The same sheet with one partly covered pixel appended, so only the second fails the early-out.
    const withFringe = imageFrom(5, 1, (x) =>
      x === 4 ? { r: 10, g: 20, b: 30, a: 200 } : x % 2 === 0 ? coloured : { r: 10, g: 20, b: 30, a: 255 },
    );

    expect(hardenSilhouette(settled, 50)).toBe(settled);
    const copied = hardenSilhouette(withFringe, 50);
    expect(copied).not.toBe(withFringe);
    expect(Array.from(copied.data).slice(0, 16)).toEqual(Array.from(settled.data));
  });

  it('reads only alpha, so an interior colour ramp at full coverage is untouched', () => {
    // The half of the problem this pass deliberately does not answer: an interior soft boundary is a
    // colour ramp at full alpha, and hardening one is what a colour reduction already does.
    //
    // The last pixel is partly covered on purpose, so the sheet fails the early-out and the copy
    // path actually runs over the ramp. Without it this test would be answered by the by-reference
    // return, and a pass that mangled every RGB it copied would still pass.
    const interior = imageFrom(5, 1, (x) => ({ r: x * 50, g: x * 50, b: x * 50, a: x === 4 ? 64 : 255 }));
    expect(channels(hardenSilhouette(interior, 50))).toEqual(
      channels(
        imageFrom(5, 1, (x) =>
          x === 4 ? { r: 0, g: 0, b: 0, a: 0 } : { r: x * 50, g: x * 50, b: x * 50, a: 255 },
        ),
      ),
    );
  });

  it('does not alias its argument where it does write', () => {
    const hardened = hardenSilhouette(RAMP, 50);
    expect(hardened).not.toBe(RAMP);
    // The source is read throughout rather than written back, so a second run over it agrees.
    expect(channels(hardenSilhouette(RAMP, 50))).toEqual(channels(hardened));
  });
});
