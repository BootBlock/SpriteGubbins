import { describe, expect, it } from 'vitest';
import { imageFrom, soften } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { estimateMeshPeriod } from './meshPeriod.ts';
import { estimateProfilePeriod } from './profilePeriod.ts';
import { measureSheetScale } from './pixelGrid.ts';

/**
 * A generated-style armour sheet in miniature: drifting ~6px cells, a dark contour ring, interior
 * detail marks — the strong off-grid edges that pollute every line-list statistic — per-pixel
 * wobble, and softening. The mark pattern is the caller's, because where the detail falls is
 * exactly what the regression cases below vary.
 */
function armourSheet(mark: (cellX: number, cellY: number) => boolean): ImageData {
  const spacings = [6, 7, 6, 6, 7, 6, 7, 6, 6, 7, 6, 6, 7, 6, 7, 6, 6, 7, 6, 6];
  const starts = [0];
  for (const spacing of spacings) starts.push((starts[starts.length - 1] ?? 0) + spacing);
  starts.length = 20;
  const size = (starts[19] ?? 0) + 6;
  const cellOf = (position: number): number => {
    let cell = 0;
    for (const [index, start] of starts.entries()) if (position >= start) cell = index;
    return cell;
  };
  const wobble = (x: number, y: number, channel: number) =>
    (((x * 374761393 + y * 668265263 + channel * 69119) >>> 3) % 7) - 3;

  const crisp = imageFrom(size, size, (x, y) => {
    const cellX = cellOf(x);
    const cellY = cellOf(y);
    // A dark contour ring around the middle of the sheet — cells 5 and 14 on each axis.
    const onRing =
      ((cellX === 5 || cellX === 14) && cellY >= 5 && cellY <= 14) ||
      ((cellY === 5 || cellY === 14) && cellX >= 5 && cellX <= 14);
    // Interior detail: a hard mark through the middle of the marked cells, off the grid entirely.
    const inCellX = x - (starts[cellX] ?? 0);
    const onMark = mark(cellX, cellY) && inCellX >= 2 && inCellX < 4;
    const base: Rgba = onRing
      ? { r: 12, g: 12, b: 14, a: 255 }
      : onMark
        ? { r: 230, g: 200, b: 60, a: 255 }
        : {
            r: 40 + (cellX % 3) * 30,
            g: 90 + (cellY % 3) * 25,
            b: 50 + ((cellX + cellY) % 3) * 20,
            a: 255,
          };
    return {
      r: Math.max(0, Math.min(255, base.r + wobble(x, y, 1))),
      g: Math.max(0, Math.min(255, base.g + wobble(x, y, 2))),
      b: Math.max(0, Math.min(255, base.b + wobble(x, y, 3))),
      a: 255,
    };
  });
  return soften(crisp);
}

/** The shipped armour miniature: a hard mark through every fourth-by-third cell. */
const armourMarks = (cellX: number, cellY: number): boolean => cellX % 4 === 2 && cellY % 3 === 1;

describe('estimateProfilePeriod', () => {
  it('reads a detailed drifting sheet through the pollution that defeats the line list', () => {
    // The reported failure in miniature: a real generated sheet offered no candidate at all,
    // because its interior detail — straps, crosses, rivets — puts strong edges between the cell
    // boundaries, and the median-of-spacings reading demands agreement those extra gaps destroy.
    // Autocorrelation uses the whole profile unthresholded, and the pixel grid's periodic
    // component peaks at the pitch however much detail rides on top.
    const sheet = armourSheet(armourMarks);

    expect(estimateMeshPeriod(sheet)).toBeNull();
    expect(estimateProfilePeriod(sheet)).toBe(6);
    expect(measureSheetScale(sheet)).toEqual({ grid: 6, measurement: 'ESTIMATED' });
  });

  it('reads the same sheet wherever the marks fall, not just where the fixture put them', () => {
    // The same sheet with its detail phase-shifted one cell each way. An estimator calibrated to
    // the mark placement rather than the pitch would answer one of these and refuse the other,
    // which is a coin flip wearing a threshold's clothes.
    const shifted = armourSheet((cellX, cellY) => cellX % 4 === 3 && cellY % 3 === 0);
    expect(estimateProfilePeriod(shifted)).toBe(6);
  });

  it('never lets one axis’s detail cancel the other’s fundamental into a doubled offer', () => {
    // Marks in every second column-cell anticorrelate the columns profile at the true pitch. When
    // the axes were summed before reading, that cancellation erased the rows axis's clean 6/7
    // fundamental and the reading offered 13 — the double, which merges the art's cells for good —
    // on a sheet the pipeline previously refused outright. Read per axis, the polluted axis
    // disagrees or refuses, and either way no doubled offer survives; whether the answer is the
    // true 6 or an honest refusal, it must never be the ghost.
    const alternatingColumns = armourSheet((cellX) => cellX % 2 === 0);
    expect(estimateProfilePeriod(alternatingColumns)).not.toBe(13);

    const alternatingBoth = armourSheet((cellX, cellY) => cellX % 2 === 0 && cellY % 2 === 0);
    expect(estimateProfilePeriod(alternatingBoth)).not.toBe(13);
  });

  it('settles a fractional pitch on a neighbouring integer, not on its doubled ghost', () => {
    // Art at six and a half pixels puts its sharpest integer-lag peak at thirteen — twice the
    // truth. The harmonic descent asks whether the half-lag's window carries nearly the peak's own
    // support, which a split fundamental does, and offering either neighbouring integer is right:
    // the mesh snaps cut by cut, so six or seven both follow the art.
    const pitch = 6.5;
    const cells = 18;
    const size = Math.round(cells * pitch);
    const sheet = soften(
      imageFrom(size, size, (x, y) => {
        const cellX = Math.floor(x / pitch);
        const cellY = Math.floor(y / pitch);
        const index = cellY * cells + cellX;
        return {
          r: (index * 71 + 40) % 200,
          g: (index * 149 + 80) % 200,
          b: (index * 37 + 120) % 200,
          a: 255,
        };
      }),
    );

    const period = estimateProfilePeriod(sheet);
    expect(period === 6 || period === 7, `settled on ${String(period)}`).toBe(true);
  });

  it('settles a small fractional pitch off its tripled ghost, which no halving reaches', () => {
    // Art at four and a third puts its sharpest integer-lag peak at thirteen — *three* times the
    // truth, so a descent that only halves lands on six-and-a-half's neighbours and stops. The
    // divisor-of-three leg is what brings it home; either neighbour of the true pitch is right.
    const pitch = 4.35;
    const cells = 28;
    const size = Math.round(cells * pitch);
    const sheet = soften(
      imageFrom(size, size, (x, y) => {
        const cellX = Math.floor(x / pitch);
        const cellY = Math.floor(y / pitch);
        const index = cellY * cells + cellX;
        return {
          r: (index * 71 + 40) % 200,
          g: (index * 149 + 80) % 200,
          b: (index * 37 + 120) % 200,
          a: 255,
        };
      }),
    );

    const period = estimateProfilePeriod(sheet);
    expect(period === 4 || period === 5, `settled on ${String(period)}`).toBe(true);
  });

  it('refuses smooth artwork, whose profile has no structure to correlate', () => {
    const gradient = imageFrom(128, 128, (x, y) => ({
      r: Math.round((x / 127) * 255),
      g: Math.round((y / 127) * 255),
      b: 128,
      a: 255,
    }));

    expect(estimateProfilePeriod(gradient)).toBeNull();
    expect(measureSheetScale(gradient)).toBeNull();
  });

  it('refuses noise, which correlates with nothing', () => {
    const noise = imageFrom(96, 96, (x, y) => ({
      r: ((x * 374761393 + y * 668265263) >>> 3) % 256,
      g: ((x * 668265263 + y * 374761393) >>> 5) % 256,
      b: ((x * 69119 + y * 374761393) >>> 7) % 256,
      a: 255,
    }));

    expect(estimateProfilePeriod(noise)).toBeNull();
  });

  it('refuses edges at assorted spacings, which fit no period', () => {
    const boundaries = [0, 5, 9, 17, 31, 40, 44, 58];
    const cellOf = (position: number): number => {
      let cell = 0;
      for (const [index, start] of boundaries.entries()) if (position >= start) cell = index;
      return cell;
    };
    const sheet = imageFrom(64, 64, (x, y) => {
      const index = cellOf(y) * 32 + cellOf(x);
      return { r: (index * 71 + 40) % 256, g: (index * 149 + 80) % 256, b: (index * 37 + 120) % 256, a: 255 };
    });

    expect(estimateProfilePeriod(sheet)).toBeNull();
  });

  it('refuses a component layout masquerading as a pixel pitch, via the repeat floor', () => {
    // Five sprites laid out evenly repeat at a spacing well inside the manual range's ceiling —
    // content periodicity, not a pixel grid. Eight repeats across the shorter edge is what a
    // layout never has, so the ceiling this reading searches under excludes the layout's spacing
    // before its correlation is ever consulted.
    const sheet = imageFrom(320, 320, (x, y) => {
      const inSprite = x % 64 < 40 && y % 64 < 40;
      return inSprite ? { r: 40, g: 160, b: 70, a: 255 } : { r: 250, g: 240, b: 235, a: 255 };
    });

    // The layout pitch of 64 is above floor(320 / 8) = 40, so it is out of the search range; the
    // sprites are internally flat, so nothing else offers a pitch either.
    expect(estimateProfilePeriod(sheet)).toBeNull();
  });

  it('reads plain regular pitch too, where the earlier readings would normally answer first', () => {
    const sheet = soften(
      imageFrom(64, 64, (x, y) => {
        const index = Math.floor(y / 8) * 8 + Math.floor(x / 8);
        return {
          r: (index * 71 + 40) % 200,
          g: (index * 149 + 80) % 200,
          b: (index * 37 + 120) % 200,
          a: 255,
        };
      }),
    );

    expect(estimateProfilePeriod(sheet)).toBe(8);
  });
});
