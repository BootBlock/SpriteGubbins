import { describe, expect, it } from 'vitest';
import { imageFrom, soften } from '../test/images.ts';
import { estimateMeshPeriod } from './meshPeriod.ts';
import { estimatePixelGrid } from './pixelPeriod.ts';
import { estimateProfilePeriod } from './profilePeriod.ts';
import { measureSheetScale } from './pixelGrid.ts';

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
    const sheet = sheetWithBoundaries(57, DRIFTING);

    expect(estimatePixelGrid(sheet)).toBeNull();
    expect(estimateMeshPeriod(sheet)).toBe(6);
  });

  it('reads the same sheet through the softening a model applies', () => {
    const sheet = soften(sheetWithBoundaries(57, DRIFTING));

    expect(estimatePixelGrid(sheet)).toBeNull();
    expect(estimateMeshPeriod(sheet)).toBe(6);
  });

  it('reaches the tab through the fourth reading of measureSheetScale, hedged as an estimate', () => {
    // The sheet class this reading stays behind the correlation for: a *small* sheet — eight
    // drifting cells of four-and-five across 35 pixels. The correlation's repeat floor caps its
    // search at floor(35 / 8) = 4, where the drifting pitch has no local peak, so it refuses; the
    // median of the boundary spacings is what still answers, and the offer keeps the estimate's
    // hedge because a median carries the drift's own tolerance.
    const small = sheetWithBoundaries(35, [0, 4, 9, 13, 17, 22, 26, 31]);

    expect(estimateProfilePeriod(small)).toBeNull();
    expect(measureSheetScale(small)).toEqual({ grid: 5, measurement: 'ESTIMATED' });
  });

  it('offers nothing for edges at assorted spacings, which are not a drifting grid', () => {
    // A median exists for any set of lines, so the reading demands agreement: most spacings within
    // a pixel of the median. Panel edges and interface art put boundaries at 5, 9, 17, 31 — real
    // edges, no period, and a confident number here would mean nothing.
    const sheet = sheetWithBoundaries(64, [0, 5, 9, 17, 31, 40, 44, 58]);

    expect(estimateMeshPeriod(sheet)).toBeNull();
  });

  it('offers nothing where there are too few spacings to call a habit', () => {
    expect(estimateMeshPeriod(sheetWithBoundaries(64, [0, 30]))).toBeNull();
  });

  it('offers nothing for smooth artwork with no boundaries in it at all', () => {
    const gradient = imageFrom(128, 128, (x, y) => ({
      r: Math.round((x / 127) * 255),
      g: Math.round((y / 127) * 255),
      b: 128,
      a: 255,
    }));

    expect(estimateMeshPeriod(gradient)).toBeNull();
    expect(measureSheetScale(gradient)).toBeNull();
  });
});
