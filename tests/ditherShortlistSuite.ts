import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { calibrationSettings } from './calibrationSettings.ts';
import { toConeField, type ConeField } from './cellDistance.ts';
import { ditherFigureRow } from './ditherFigureRow.ts';
import { machineReduction } from './machineReductions.ts';
import { BLUE_NOISE_LEVELS } from '../src/constants/quantiser.ts';
import { countColors } from '../src/utils/imageData.ts';
import { buildPalette } from '../src/utils/wuQuantiser.ts';
import { flatPlanCount, type PlanSearch } from './flatPlanCount.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import type { ColorReduction } from '../src/types/quantiser.ts';

/**
 * The table `DITHER_SHORTLIST` states, re-derived from the reference sheet against the sheet with no
 * palette step, one column per shortlist size. See `calibrationSettings.ts` for why the
 * docblock-figure suites exist.
 *
 * **Each column overrides the constant and re-imports the pipeline**, because the constant also
 * sizes `mixingPlan`'s scratch arrays when the module loads, so there is no argument to pass a
 * different size through. The unrestricted column is the constant at 128, the longest list palette
 * the tab admits, which leaves every entry of every palette here a candidate.
 *
 * For the shipped 2 and for 3 it also counts, per row, the colours the plan search finds no mixture
 * for and draws flat, which is the structural cost the constant's docblock weighs 2 against 3 by.
 *
 * The Game Boy's four greens make every column from 4 up one search, so the table leaves its 6 and
 * 8 cells blank and this does not measure them; its 4 and unrestricted cells are both pinned, which
 * is what holds them equal.
 *
 * Run as two files, `quantiser-figures-dither-shortlist.test.ts` over the five shortlists and
 * `-unrestricted.test.ts` over the unrestricted column alone, because that column's search over
 * every pair of the palette costs more than the other five columns together.
 */

/** Each row is a reading of the whole pipeline, and the unrestricted plan search scans every pair. */
vi.setConfig({ testTimeout: 300_000, hookTimeout: 300_000 });

/** The shortlist sizes the table has columns for, 128 standing for unrestricted. */
export type ShortlistColumn = 2 | 3 | 4 | 6 | 8 | 128;

interface TableRow {
  readonly name: string;
  readonly reduction: ColorReduction;
}

const ROWS: readonly TableRow[] = [64, 16, 8].map((maxColors) => ({
  name: `budget ${String(maxColors)}`,
  reduction: { kind: 'MAX_COLORS', maxColors },
}));

const GAME_BOY_ROW: TableRow = { name: 'Game Boy', reduction: machineReduction('GAME_BOY_DMG') };

/** The table's rows, budget 64, 16 and 8 and then the Game Boy where the column measures it. */
const TABLE: Readonly<Record<ShortlistColumn, readonly (readonly number[])[]>> = {
  2: [
    [1.661, 0.599, 0.343],
    [3.343, 1.264, 0.777],
    [4.915, 1.936, 1.187],
    [92.004, 85.195, 87.896],
  ],
  3: [
    [2.111, 0.677, 0.381],
    [4.334, 1.448, 0.867],
    [6.708, 2.352, 1.344],
    [93.926, 84.982, 87.523],
  ],
  4: [
    [2.634, 0.757, 0.41],
    [5.12, 1.599, 0.929],
    [7.696, 2.548, 1.421],
    [94.357, 85.026, 87.537],
  ],
  6: [
    [3.213, 0.894, 0.478],
    [6.462, 1.968, 1.108],
    [8.968, 2.838, 1.595],
  ],
  8: [
    [3.741, 1.052, 0.572],
    [7.402, 2.212, 1.217],
    [10.913, 3.109, 1.739],
  ],
  128: [
    [7.471, 2.106, 1.132],
    [9.126, 2.586, 1.351],
    [10.913, 3.109, 1.739],
    [94.357, 85.026, 87.537],
  ],
};

/**
 * Of the resolved sheet's colours each row's palette does not hold, how many the plan search draws
 * flat — the structural cost of a short list, stated for the shipped 2 against 3. The rows are the
 * table's, the palette the one `ditherImage` builds, and 64 the blue-noise tile's levels.
 */
const FLAT_PLANS: Readonly<Partial<Record<ShortlistColumn, readonly (readonly number[])[]>>> = {
  2: [
    [9_911, 1_526],
    [9_959, 1_857],
    [9_967, 2_076],
    [9_975, 5_010],
  ],
  3: [
    [9_911, 599],
    [9_959, 1_104],
    [9_967, 744],
    [9_975, 2_738],
  ],
};

export function ditherShortlistSuite(columns: readonly ShortlistColumn[]): void {
  describe('the DITHER_SHORTLIST table', () => {
    let sheet: ImageData;
    let resolved: ImageData;
    let reference: ConeField;
    let width: number;
    let height: number;

    beforeAll(async () => {
      sheet = await loadCorpusSheet('armour.png');
      resolved = quantiseImage(sheet, calibrationSettings({ reduction: null })).image;
      reference = toConeField(resolved);
      ({ width, height } = resolved);
    });

    it('measures against the resolved sheet the docblock names', () => {
      expect(width * height).toBe(43_681);
      expect(countColors(resolved)).toBe(9_975);
      expect(countColors(sheet)).toBe(218_978);
    });

    describe.each(columns)('the column for a shortlist of %i', (size) => {
      let pipeline: typeof import('../src/utils/quantiseImage.ts');
      let search: PlanSearch;

      beforeAll(async () => {
        vi.resetModules();
        vi.doMock('../src/constants/quantiser.ts', async (original) => ({
          ...(await original<object>()),
          DITHER_SHORTLIST: size,
        }));
        pipeline = await import('../src/utils/quantiseImage.ts');
        search = await import('../src/utils/mixingPlan.ts');
      });

      afterAll(() => {
        vi.doUnmock('../src/constants/quantiser.ts');
        vi.resetModules();
      });

      const rows = size <= 4 || size === 128 ? [...ROWS, GAME_BOY_ROW] : ROWS;
      it.each(rows.map((row, index) => ({ ...row, index })))('$name', ({ reduction, index }) => {
        const image = pipeline.quantiseImage(
          sheet,
          calibrationSettings({ dither: 'BLUE_NOISE', reduction }),
        ).image;
        expect(ditherFigureRow(reference, image, width, height)).toEqual(TABLE[size][index]);
      });

      const flatPlans = FLAT_PLANS[size];
      if (flatPlans !== undefined) {
        it('draws flat the colours it finds no pair for', () => {
          const counts = [...ROWS, GAME_BOY_ROW].map(({ reduction }) => {
            const palette =
              reduction.kind === 'MAX_COLORS'
                ? buildPalette(resolved, reduction.maxColors)
                : reduction.kind === 'PALETTE'
                  ? reduction.entries
                  : [];
            const { missing, flat } = flatPlanCount(resolved, palette, search, BLUE_NOISE_LEVELS);
            return [missing, flat];
          });
          expect(counts).toEqual(flatPlans);
        });
      }
    });
  });
}
