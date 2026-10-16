import { describe, expect, it } from 'vitest';
import { imageFrom, soften } from '../test/images.ts';
import { estimateMeshPeriod } from './meshPeriod.ts';
import { estimatePixelGrid } from './pixelPeriod.ts';
import { estimateProfilePeriod } from './profilePeriod.ts';
import { measureSheetScale } from './pixelGrid.ts';
import { stepProfile } from './stepProfile.ts';

/** Cells of distinct colours whose column and row boundaries sit at the positions given. */
function sheetWithBoundaries(size: number, starts: readonly number[]): ImageData {
  const cellOf = (position: number): number => {
    let cell = 0;
    for (const [index, start] of starts.entries()) if (position >= start) cell = index;
    return cell;
  };
  return imageFrom(size, size, (x, y) => {
    const index = cellOf(y) * 32 + cellOf(x);
    return { r: (index * 71 + 40) % 256, g: (index * 149 + 80) % 256, b: (index * 37 + 120) % 256, a: 255 };
  });
}

/** Spacings wandering between 6 and 7 — the drift a generator leaves, and no integer period. */
const DRIFTING = [0, 6, 12, 19, 25, 31, 38, 44, 51];

describe('estimateMeshPeriod', () => {
  it('reads the typical spacing of a drifting sheet both integer readings refuse', () => {
    // The commonest sheet this tab meets, and the one that used to come back as "no pixel scale in
    // this image": the spacings wander between 6 and 7, so no lattice at any phase collects nine
    // tenths of the change — but the boundaries are plainly there, and their median gap is the
    // scale the art was drawn at.
    const profile = stepProfile(sheetWithBoundaries(57, DRIFTING));

    expect(estimatePixelGrid(profile)).toBeNull();
    expect(estimateMeshPeriod(profile)).toBe(6);
  });

  it('reads the same sheet through the softening a model applies', () => {
    const profile = stepProfile(soften(sheetWithBoundaries(57, DRIFTING)));

    expect(estimatePixelGrid(profile)).toBeNull();
    expect(estimateMeshPeriod(profile)).toBe(6);
  });

  it('reaches the tab through the fourth reading of measureSheetScale, hedged as an estimate', () => {
    // The sheet class this reading stays behind the correlation for: a *small* sheet — eight
    // drifting cells of four-and-five across 35 pixels. The correlation's repeat floor caps its
    // search at floor(35 / 8) = 4, where the drifting pitch has no local peak, so it refuses; the
    // boundary spacings are what still answer, and the offer keeps the estimate's hedge because
    // the spacings carry the drift's own tolerance. Their median is 5, but they average 27 / 6 =
    // 4.5, and 4 is the scale that cuts every cell the art has — 5 merges one (#479).
    const small = sheetWithBoundaries(35, [0, 4, 9, 13, 17, 22, 26, 31]);

    expect(estimateProfilePeriod(stepProfile(small))).toBeNull();
    expect(measureSheetScale(small)).toEqual({ grid: 4, measurement: 'BOUNDARY_SPACING' });
  });

  it('offers a fractional pitch as the scale below it, never the nearer one above', () => {
    // Spacings of 5, 5, 5 and 4 — art at 4.75, drifting. Their median is 5 and so was the offer,
    // which merges a cell in every twenty; the mean of the spacings that keep the habit is the 4.75
    // the art was drawn at, and the whole scale at or below it is 4.
    const starts = Array.from({ length: 14 }, (_, cell) => Math.floor(cell * 4.75));

    expect(estimateMeshPeriod(stepProfile(sheetWithBoundaries(64, starts)))).toBe(4);
  });

  it('keeps a whole pitch whole through one boundary a pixel out of place', () => {
    // Forty spacings of 6 and one of 5 on each axis: the mean falls 1/41 short of 6, which across
    // the sheet is a slip of more than a pixel, so the sheet's extent alone would offer 5. Rounding
    // each boundary to a pixel measures a run of spacings to within one, and this is that pixel.
    const starts = Array.from({ length: 42 }, (_, cell) => cell * 6 - (cell > 20 ? 1 : 0));

    expect(estimateMeshPeriod(stepProfile(sheetWithBoundaries(252, starts)))).toBe(6);
  });

  it('offers nothing for edges at assorted spacings, which are not a drifting grid', () => {
    // A median exists for any set of lines, so the reading demands agreement: most spacings within
    // a pixel of the median. Panel edges and interface art put boundaries at 5, 9, 17, 31 — real
    // edges, no period, and a confident number here would mean nothing.
    const sheet = sheetWithBoundaries(64, [0, 5, 9, 17, 31, 40, 44, 58]);

    expect(estimateMeshPeriod(stepProfile(sheet))).toBeNull();
  });

  it('offers nothing where there are too few spacings to call a habit', () => {
    expect(estimateMeshPeriod(stepProfile(sheetWithBoundaries(64, [0, 30])))).toBeNull();
  });

  it('offers nothing for smooth artwork with no boundaries in it at all', () => {
    const gradient = imageFrom(128, 128, (x, y) => ({
      r: Math.round((x / 127) * 255),
      g: Math.round((y / 127) * 255),
      b: 128,
      a: 255,
    }));

    expect(estimateMeshPeriod(stepProfile(gradient))).toBeNull();
  });
});
