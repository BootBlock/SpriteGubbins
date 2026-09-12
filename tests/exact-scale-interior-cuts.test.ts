import { describe, expect, it } from 'vitest';

import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { interiorCells, spottedGrid, type SpottedGrid } from '../src/test/spottedGrid.ts';
import type { PixelGrid, QuantiseSettings } from '../src/types/quantiser.ts';
import { gridInForce } from '../src/utils/gridInForce.ts';
import { countColors } from '../src/utils/imageData.ts';
import { measureSheetScale } from '../src/utils/pixelGrid.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';

/**
 * Crisp art with stray pixels in it is reduced on the art's own lattice — at an adopted grid or a typed
 * one, whether or not the sheet is exactly drawn on it.
 *
 * The chain is the one the Quantise tab runs: `measureSheetScale` reads the sheet, `gridInForce` adopts
 * the reading where it is `EXACT`, and `quantiseImage` reduces the sheet at that grid or at one a reader
 * types. For a while the reading and the reduction disagreed about where the cells were. The detector
 * counts transitions on a phase class; the mesh walked the lines `boundaryClusters` read by magnitude.
 * So crisp art whose stray pixels outweighed its faint cell boundaries read as exactly its own grid,
 * and the walk then cut on the strays — beside every boundary, so that a 40 × 40 sheet drawn at 4
 * reduced to 9 × 10, and the same art at 6 and 8 gained a column instead.
 *
 * **What is asserted is the reduction, against the same art with no strays in it.** A stray is one
 * pixel in a cell of at least four, so the cell's own colour holds it under the vote, and a sheet cut on
 * its lattice reduces to the image its stray-free twin does. A result that differs has moved a cut.
 * That makes the assertion a property of the harm rather than of the mechanism, so it holds whichever
 * way a later change arranges to keep it.
 *
 * **A typed grid runs the same mesh**, and was cut on the strays the same way. So each sheet is also
 * reduced at every grid a reader could type that divides the art's own. Wherever the sheet is exactly
 * drawn on the art's lattice it is exactly drawn on each of those too, since every line of the art's
 * lattice is a line of theirs.
 *
 * **The stray counts run past the threshold, because two fixes are held here and they meet at it.** Up
 * to a tenth of the transitions the sheet is exactly drawn on the art's lattice, and the mesh cuts on
 * that lattice without walking (#276). Past it no lattice of the art's grid is exact, so the mesh walks
 * — and the walk cut on the strays until it read a crisp sheet's lines by their transitions (#279). Twenty-one is the first count past the threshold for a stray at (1, 1) in a cell
 * of four, and sixty-four strays is every interior cell.
 *
 * **The counts are pinned** so the sweep cannot pass by reading nothing exactly. A change to how many of
 * these sheets are adopted is a change to detection, and it has to say so here.
 */

const GRIDS: readonly PixelGrid[] = [2, 3, 4, 5, 6, 8];
const INSETS: readonly number[] = [0, 3];
const STRAY_COUNTS: readonly number[] = [5, 10, 20, 21, 40, 64];

const {
  keyingEnabled: _keyingEnabled,
  keyTolerance: _keyTolerance,
  paletteSnap: _paletteSnap,
  ...TUNING
} = QUANTISE_DEFAULT_DIALS;

function reduce(image: ImageData, grid: PixelGrid): ImageData {
  const settings: QuantiseSettings = { ...TUNING, grid, key: null, reduction: null };
  return quantiseImage(image, settings).image;
}

function sameImage(a: ImageData, b: ImageData): boolean {
  return (
    a.width === b.width && a.height === b.height && a.data.every((value, index) => value === b.data[index])
  );
}

function divisors(grid: PixelGrid): PixelGrid[] {
  return Array.from({ length: grid - 1 }, (_, index) => index + 2).filter(
    (candidate) => grid % candidate === 0,
  );
}

/** Every stray sheet the sweep reads: each grid, inset, stray count and position of the stray in its cell. */
function straySheets(): SpottedGrid[] {
  return GRIDS.flatMap((grid) =>
    INSETS.flatMap((inset) =>
      STRAY_COUNTS.flatMap((count) =>
        Array.from({ length: grid * grid }, (_, index) => ({
          grid,
          inset,
          stray: { x: index % grid, y: Math.floor(index / grid) },
          spoils: interiorCells(count),
        })),
      ),
    ),
  );
}

describe('crisp art with stray pixels', () => {
  it('reduces the sheet #276 reported to the art’s own ten cells a side', () => {
    const image = spottedGrid({ spoils: interiorCells(20) });

    const scale = measureSheetScale(image);
    const grid = gridInForce(null, { scale, colors: countColors(image) });
    const result = reduce(image, 4);

    expect(scale).toEqual({ grid: 4, measurement: 'EXACT' });
    expect(grid).toBe(4);
    expect([result.width, result.height]).toEqual([10, 10]);
    expect(sameImage(result, reduce(spottedGrid({ spoils: () => false }), 4))).toBe(true);
  });

  it('reduces crisp art with stray pixels exactly as it reduces the same art without them', () => {
    let adopted = 0;
    let typed = 0;
    const cleanReductions = new Map<string, ImageData>();
    const clean = (options: SpottedGrid, grid: PixelGrid): ImageData => {
      const key = `${String(options.grid)}/${String(options.inset)}/${String(grid)}`;
      const cached =
        cleanReductions.get(key) ?? reduce(spottedGrid({ ...options, spoils: () => false }), grid);
      cleanReductions.set(key, cached);
      return cached;
    };

    for (const options of straySheets()) {
      const image = spottedGrid(options);
      const where = `drawn at ${String(options.grid)}, inset ${String(options.inset)}, strays at (${String(options.stray?.x)}, ${String(options.stray?.y)})`;

      const inForce = gridInForce(null, { scale: measureSheetScale(image), colors: countColors(image) });
      if (inForce !== null) {
        adopted += 1;
        expect(
          sameImage(reduce(image, inForce), clean(options, inForce)),
          `${where}, adopted ${String(inForce)}`,
        ).toBe(true);
      }

      for (const grid of divisors(options.grid ?? 4)) {
        typed += 1;
        expect(sameImage(reduce(image, grid), clean(options, grid)), `${where}, typed ${String(grid)}`).toBe(
          true,
        );
      }
    }

    // 1,848 sheets in all, and the 196 not adopted are every sheet read as no exact scale — which is
    // the only reading the tab adopts. Two are drawn at 3 with twenty strays in the middle pixel of
    // their cells, the one place in a cell of three where all four of a stray's transitions miss the
    // lattice: with no inset that is 540 of 620 transitions on it, and the margin's own lines do not
    // lift the inset sheet to nine tenths either. The other 194 are past twenty strays, where no lattice
    // the detector tries holds nine tenths. Every typed grid is still reduced and still compared above,
    // and wherever a sheet is not exactly drawn on the grid typed — the 194, and also adopted sheets
    // such as twenty-one strays read as exactly 2 and typed at 4 — the walk places the cuts.
    expect({ adopted, typed }).toEqual({ adopted: 1652, typed: 4440 });
    // About two seconds alone, and past the five-second default beside the rest of the suite.
  }, 60_000);
});
