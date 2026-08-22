import type { Rgba } from '../types/quantiser.ts';
import { imageFrom, soften } from './images.ts';

/**
 * A generated-style armour sheet in miniature — the detailed drifting sheet the readings are
 * calibrated against.
 *
 * Test-only, and shared rather than copied because three suites ask different questions of the same
 * sheet: `estimateProfilePeriod` asks what pitch it repeats at, `boundaryClusters` asks which
 * positions its boundaries sit on, and `boundaryMesh` asks where the cuts land. A second copy of
 * the builder would eventually answer a fourth sheet, and the three would stop being comparable.
 *
 * What makes it the fixture that matters is that it carries all four of the things a clean
 * synthetic grid does not: cells that **drift** between 6 and 7 pixels so no integer lattice
 * collects them, a dark contour ring so the boundary strengths are uneven, **interior detail
 * marks** whose edges sit off the grid entirely and carry several times what a cell boundary
 * carries, and per-pixel wobble under a softening pass. The marks are what defeat any statistic
 * taken over the axis as a whole.
 */

/** The cell boundaries the sheet is drawn on, ascending — 20 cells of 6 or 7 pixels. */
export const DETAILED_STARTS: readonly number[] = buildStarts();

/** The sheet's edge, in pixels: 20 drifting cells with the last one whole. */
export const DETAILED_SIZE = (DETAILED_STARTS[DETAILED_STARTS.length - 1] ?? 0) + 6;

/** The shipped mark pattern: a hard mark through every fourth-by-third cell. */
export const detailedMarks = (cellX: number, cellY: number): boolean => cellX % 4 === 2 && cellY % 3 === 1;

/**
 * The sheet, with the caller choosing where the detail falls — because where it falls is exactly
 * what the regression cases vary, and a reading calibrated to one mark placement rather than to the
 * pitch is a coin flip wearing a threshold's clothes.
 */
export function detailedSheet(mark: (cellX: number, cellY: number) => boolean): ImageData {
  const wobble = (x: number, y: number, channel: number) =>
    (((x * 374761393 + y * 668265263 + channel * 69119) >>> 3) % 7) - 3;

  const crisp = imageFrom(DETAILED_SIZE, DETAILED_SIZE, (x, y) => {
    const cellX = cellAt(x);
    const cellY = cellAt(y);
    // A dark contour ring around the middle of the sheet — cells 5 and 14 on each axis.
    const onRing =
      ((cellX === 5 || cellX === 14) && cellY >= 5 && cellY <= 14) ||
      ((cellY === 5 || cellY === 14) && cellX >= 5 && cellX <= 14);
    // Interior detail: a hard mark through the middle of the marked cells, off the grid entirely.
    const inCellX = x - (DETAILED_STARTS[cellX] ?? 0);
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

/** Which cell a position falls in, read off the drifting starts rather than divided out of them. */
function cellAt(position: number): number {
  let cell = 0;
  for (const [index, start] of DETAILED_STARTS.entries()) if (position >= start) cell = index;
  return cell;
}

/** The 20 starts, accumulated from the spacings the sheet drifts through. */
function buildStarts(): number[] {
  const spacings = [6, 7, 6, 6, 7, 6, 7, 6, 6, 7, 6, 6, 7, 6, 7, 6, 6, 7, 6, 6];
  const starts = [0];
  for (const spacing of spacings) starts.push((starts[starts.length - 1] ?? 0) + spacing);
  starts.length = 20;
  return starts;
}
