import { describe, expect, it } from 'vitest';
import {
  CLAIM_ABOVE,
  CLAIM_BELOW,
  CLAIM_LEFT,
  CLAIM_NONE,
  CLAIM_PRECISION,
  CLAIM_RIGHT,
  edgeClaims,
  type ClaimSettings,
} from './edgeClaims.ts';
import { CHANNELS_PER_PIXEL, FULLY_OPAQUE, FULLY_TRANSPARENT, createImage } from './imageData.ts';
import type { Rgba } from '../types/quantiser.ts';

const INK: Rgba = { r: 20, g: 20, b: 20, a: FULLY_OPAQUE };
const PAPER: Rgba = { r: 235, g: 235, b: 235, a: FULLY_OPAQUE };
/** One step of a shading ramp away from `PAPER` — about 9 in the scaled OKLab the floor is stated in. */
const SHADE: Rgba = { r: 214, g: 214, b: 214, a: FULLY_OPAQUE };
const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

function imageFrom(width: number, height: number, at: (x: number, y: number) => Rgba): ImageData {
  const image = createImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = at(x, y);
      const offset = (y * width + x) * CHANNELS_PER_PIXEL;
      image.data[offset] = color.r;
      image.data[offset + 1] = color.g;
      image.data[offset + 2] = color.b;
      image.data[offset + 3] = color.a;
    }
  }
  return image;
}

/**
 * A twelve-wide sheet whose one contour steps down a row halfway across.
 *
 * Everything above the step is `top`, everything below is `bottom`, and the boundary sits between
 * rows 1 and 2 for the left half and between rows 2 and 3 for the right. That gives two six-pixel
 * runs sharing one crossing edge, which is the smallest fixture that exercises a terminated run at
 * each of its two possible ends.
 */
const stepped = (top: Rgba, bottom: Rgba): ImageData =>
  imageFrom(12, 6, (x, y) => (y < (x < 6 ? 2 : 3) ? top : bottom));

const SETTINGS: ClaimSettings = { mode: 'BOTH', threshold: 24, strength: 1, shortestRun: 2 };

/** The claims as `{ pixel: [coverage, side] }`, which is what every assertion below reads. */
function claimsOf(image: ImageData, settings: ClaimSettings = SETTINGS) {
  const { coverage, side, count } = edgeClaims(image, settings);
  const found = new Map<number, readonly [number, number]>();
  for (let pixel = 0; pixel < coverage.length; pixel += 1) {
    const scaled = coverage[pixel] ?? 0;
    if (scaled > 0) found.set(pixel, [scaled, side[pixel] ?? CLAIM_NONE]);
  }
  expect(found.size).toBe(count);
  return found;
}

/** `area × CLAIM_PRECISION`, as the buffer stores it. */
const scaled = (area: number): number => Math.round(area * CLAIM_PRECISION);

describe('edgeClaims', () => {
  it('claims nothing on a sheet with no contour in it', () => {
    expect(claimsOf(imageFrom(12, 6, () => PAPER)).size).toBe(0);
  });

  it('claims the pixels a run terminated at its far end owes to the other side', () => {
    const found = claimsOf(stepped(PAPER, INK));

    // The left run spans columns 0–5 of the boundary between rows 1 and 2, and only its right end
    // turns — the left end is the image border. So the reconstruction reaches the second half alone,
    // and it claims the *lower* row, whose pixels are partly the upper region.
    expect([...found.keys()].sort((a, b) => a - b)).toEqual([
      // Row 2, columns 3–5, from the left run.
      2 * 12 + 3,
      2 * 12 + 4,
      2 * 12 + 5,
      // Row 2, columns 6–8, from the right run, whose left end turns and whose right end is the
      // border. Same row, claimed the other way: a contour stepping down claims the row it steps
      // into on one side of the step and the row it steps out of on the other.
      2 * 12 + 6,
      2 * 12 + 7,
      2 * 12 + 8,
    ]);
    expect(found.get(2 * 12 + 3)).toEqual([scaled(0.5 / 6), CLAIM_ABOVE]);
    expect(found.get(2 * 12 + 4)).toEqual([scaled(1.5 / 6), CLAIM_ABOVE]);
    expect(found.get(2 * 12 + 5)).toEqual([scaled(2.5 / 6), CLAIM_ABOVE]);
    expect(found.get(2 * 12 + 6)).toEqual([scaled(2.5 / 6), CLAIM_BELOW]);
    expect(found.get(2 * 12 + 7)).toEqual([scaled(1.5 / 6), CLAIM_BELOW]);
    expect(found.get(2 * 12 + 8)).toEqual([scaled(0.5 / 6), CLAIM_BELOW]);
  });

  it('claims across a vertical contour the same way it does a horizontal one', () => {
    // The same fixture on its side, so the runs are columns and the claims point left and right.
    const found = claimsOf(imageFrom(6, 12, (x, y) => (x < (y < 6 ? 2 : 3) ? PAPER : INK)));
    expect(found.get(3 * 6 + 2)).toEqual([scaled(0.5 / 6), CLAIM_LEFT]);
    expect(found.get(6 * 6 + 2)).toEqual([scaled(2.5 / 6), CLAIM_RIGHT]);
  });

  it('leaves a boundary below the contrast floor alone', () => {
    // One step of a shading ramp rather than a contour. The geometry is identical — the same two
    // runs, the same crossing edge — so what refuses it is the floor and nothing else.
    expect(claimsOf(stepped(PAPER, SHADE)).size).toBe(0);
    expect(claimsOf(stepped(PAPER, SHADE), { ...SETTINGS, threshold: 4 }).size).toBe(6);
  });

  it('scales every claim by the strength', () => {
    const found = claimsOf(stepped(PAPER, INK), { ...SETTINGS, strength: 0.5 });
    expect(found.get(2 * 12 + 5)).toEqual([scaled((2.5 / 6) * 0.5), CLAIM_ABOVE]);
  });

  it('drops a run shorter than the floor', () => {
    expect(claimsOf(stepped(PAPER, INK), { ...SETTINGS, shortestRun: 7 }).size).toBe(0);
  });

  it('claims nothing along a 45° staircase', () => {
    // Every run is one pixel long, so the reconstruction cuts as much off one side of each pixel as
    // the other — see `walkEdgeRuns`. The floor is at its own minimum here, so nothing but the
    // geometry is refusing these.
    const diagonal = imageFrom(12, 12, (x, y) => (y < x ? PAPER : INK));
    expect(claimsOf(diagonal, { ...SETTINGS, shortestRun: 2 }).size).toBe(0);
  });

  describe('scope', () => {
    /** The same step, with the lower region cleared instead of inked — so the contour is a silhouette. */
    const silhouette = stepped(PAPER, CLEAR);

    it('takes only the boundaries between two solid pixels under INTERIOR', () => {
      expect(claimsOf(silhouette, { ...SETTINGS, mode: 'INTERIOR' }).size).toBe(0);
      expect(claimsOf(stepped(PAPER, INK), { ...SETTINGS, mode: 'INTERIOR' }).size).toBe(6);
    });

    it('takes only the boundaries against a cleared pixel under SILHOUETTE', () => {
      expect(claimsOf(silhouette, { ...SETTINGS, mode: 'SILHOUETTE' }).size).toBe(6);
      expect(claimsOf(stepped(PAPER, INK), { ...SETTINGS, mode: 'SILHOUETTE' }).size).toBe(0);
    });

    it('takes both under BOTH', () => {
      expect(claimsOf(silhouette).size).toBe(6);
      expect(claimsOf(stepped(PAPER, INK)).size).toBe(6);
    });
  });

  it('keeps the stronger of the two claims a corner pixel attracts', () => {
    // The corner pixel of a right angle is reached by the horizontal run along one arm and the
    // vertical run along the other. Applying both in turn would compound two coverages into a colour
    // neither contour asked for, at exactly the position where blending twice is most visible.
    //
    // The two arms are deliberately different lengths, so the two candidate coverages differ and the
    // assertion has something to separate. The vertical arm is twice the horizontal one, so its
    // reconstruction is the shallower and the stronger — and it is also the *second* sweep, which is
    // what makes this a test of the comparison rather than of the order the sweeps happen to run in.
    const tall = imageFrom(12, 16, (x, y) => (y >= 8 && x >= 8 ? INK : PAPER));
    const corner = claimsOf(tall).get(8 * 12 + 8);
    expect(corner).toEqual([scaled(3.5 / 8), CLAIM_LEFT]);

    // The same shape with the arms swapped: now the horizontal run is the longer, and the first
    // sweep's claim is the one that stands.
    const wide = imageFrom(16, 12, (x, y) => (y >= 8 && x >= 8 ? INK : PAPER));
    expect(claimsOf(wide).get(8 * 16 + 8)).toEqual([scaled(3.5 / 8), CLAIM_ABOVE]);
  });
});
