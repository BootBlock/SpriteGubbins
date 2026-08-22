import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { cellMeanField, meanCellDistance, toConeField } from './cellDistance.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import {
  DEFAULT_FILL_CLEANUP,
  DEFAULT_INK_THRESHOLD,
  DIFFERENCE_PRECISION,
  FILL_CLEANUP_RANGE,
} from '../src/constants/quantiser.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import { CHANNELS_PER_PIXEL, countColors, fromHex, pixelOffset } from '../src/utils/imageData.ts';
import { lumaOfChannels } from '../src/utils/lineVote.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import type { ColorReduction, QuantiseSettings, VoteMethod } from '../src/types/quantiser.ts';

/**
 * The calibration figures the quantiser's docblocks state, re-derived from the reference sheet.
 *
 * These figures are read as evidence — a maintainer deciding whether a dial's default is right
 * consults them instead of re-measuring — and four docblocks had drifted silently, each by a
 * different amount, because passes upstream of them changed and nothing recomputed them. All four
 * were stating cell counts through a mesh no version of this app produces. That is what this suite
 * exists to stop: a change to the mesh, the vote, the palette or the cleanup passes fails here,
 * naming the docblock whose figure it moved.
 *
 * **It pins the figures, not the prose.** Whoever makes it fail has to go and restate the docblock,
 * which is the step that was being skipped. A conclusion drawn from a figure — the knee at 1, the
 * unrestricted column being the worst — is still a judgement no assertion can hold.
 *
 * Slow, deliberately: every figure is the real pipeline over a 1.57-megapixel generator sheet,
 * because a synthetic fixture carries none of the resampling this is measuring through.
 */

/** The conditions every figure below is stated at, bar the dial each one varies. */
const CALIBRATION = (over: Partial<QuantiseSettings> = {}): QuantiseSettings => ({
  ...QUANTISE_DEFAULT_DIALS,
  grid: 6,
  key: null,
  reduction: { kind: 'MAX_COLORS', maxColors: 64 },
  ...over,
});

/** Ink is the darkest quarter, which is what the vote's own rescue and these figures both mean. */
function isInkPixel(data: Uint8ClampedArray, at: number): boolean {
  if ((data[at + 3] ?? 0) === 0) return false;
  return lumaOfChannels(data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0) < DEFAULT_INK_THRESHOLD;
}

describe('the figures the quantiser docblocks state', () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  it('lays 209 x 209 cells over the reference sheet at a grid of 6', () => {
    const mesh = boundaryMesh(sheet, 6);
    expect([mesh.x.length, mesh.y.length]).toEqual([209, 209]);
    expect(mesh.x.length * mesh.y.length).toBe(43_681);
  });

  it('DIFFERENCE_SCALES — the per-cell distance ladder the rungs are read off', () => {
    const { difference } = quantiseImage(sheet, CALIBRATION());
    const sorted = Array.from(difference.cells).sort((left, right) => left - right);
    const at = (percentile: number): number =>
      (sorted[Math.floor((percentile / 100) * sorted.length)] ?? 0) / DIFFERENCE_PRECISION;

    expect(at(50)).toBeCloseTo(0.66, 2);
    expect(at(75)).toBeCloseTo(10.2, 1);
    expect(at(90)).toBeCloseTo(55.0, 1);
    expect(at(99)).toBeCloseTo(117.9, 1);
    expect(difference.peak).toBeCloseTo(177.4, 1);
  }, 120_000);

  /** What a second cleanup pass moves: how many cells, and the largest step any one of them took. */
  function cleanupPassShift(vote: VoteMethod, fillCleanup: number): { cells: number; largest: number } {
    const once = quantiseImage(sheet, CALIBRATION({ vote, fillCleanup, cleanupPasses: 1 }));
    const twice = quantiseImage(sheet, CALIBRATION({ vote, fillCleanup, cleanupPasses: 2 }));

    let cells = 0;
    let peak = 0;
    for (let cell = 0; cell < once.difference.cells.length; cell += 1) {
      const step = Math.abs((once.difference.cells[cell] ?? 0) - (twice.difference.cells[cell] ?? 0));
      if (step > 0) cells += 1;
      if (step > peak) peak = step;
    }
    return { cells, largest: peak / DIFFERENCE_PRECISION };
  }

  it.each([
    { vote: 'DOMINANT', moved: 360, largest: 26.84375 },
    { vote: 'INK_WEIGHTED', moved: 930, largest: 14.375 },
  ] satisfies readonly { vote: VoteMethod; moved: number; largest: number }[])(
    'DIFFERENCE_SCALES and differenceMap — what a second cleanup pass moves under $vote',
    ({ vote, moved, largest }) => {
      const shift = cleanupPassShift(vote, FILL_CLEANUP_RANGE.max);

      expect(shift.cells).toBe(moved);
      expect(shift.largest).toBeCloseTo(largest, 5);
    },
    240_000,
  );

  it('DIFFERENCE_SCALES — and moves nothing with the fill cleanup at its opening zero', () => {
    // The half of that claim easiest to leave unstated: the passes multiply this one dial, so the
    // figure above means nothing without the rung it was read at, and this is what says so.
    expect(cleanupPassShift('DOMINANT', DEFAULT_FILL_CLEANUP)).toEqual({ cells: 0, largest: 0 });
  }, 240_000);

  describe('outlineExpansion — the survival and surface-loss ladders', () => {
    /** Each cell's ink share on the sheet **as it arrived**, which is what both ladders sort by. */
    function sourceInkShares(): {
      shares: Float64Array;
      cells: number;
      sheetShare: number;
    } {
      const mesh = boundaryMesh(sheet, 6);
      const width = mesh.x.length;
      const shares = new Float64Array(width * mesh.y.length);
      let ink = 0;
      let opaque = 0;
      for (const [row, top] of mesh.y.entries()) {
        const bottom = Math.min(mesh.y[row + 1] ?? sheet.height, sheet.height);
        for (const [column, left] of mesh.x.entries()) {
          const right = Math.min(mesh.x[column + 1] ?? sheet.width, sheet.width);
          let cellInk = 0;
          let cellOpaque = 0;
          for (let y = top; y < bottom; y += 1) {
            for (let x = left; x < right; x += 1) {
              const at = pixelOffset(sheet.width, x, y);
              if ((sheet.data[at + 3] ?? 0) === 0) continue;
              cellOpaque += 1;
              if (isInkPixel(sheet.data, at)) cellInk += 1;
            }
          }
          shares[row * width + column] = cellOpaque === 0 ? -1 : cellInk / cellOpaque;
          ink += cellInk;
          opaque += cellOpaque;
        }
      }
      return {
        shares,
        cells: width * mesh.y.length,
        sheetShare: (100 * ink) / opaque,
      };
    }

    /** The cells of one population, by index into the result — an empty cell counts for neither. */
    function cellsWhere(shares: Float64Array, test: (share: number) => boolean): readonly number[] {
      const found: number[] = [];
      for (let cell = 0; cell < shares.length; cell += 1) {
        const share = shares[cell] ?? -1;
        if (share >= 0 && test(share)) found.push(cell);
      }
      return found;
    }

    it('sorts the mesh into the populations the ladders are read over', () => {
      const { shares, sheetShare } = sourceInkShares();

      expect(cellsWhere(shares, (share) => share > 0 && share < 0.5).length).toBe(6_433);
      expect(cellsWhere(shares, (share) => share < 0.2).length).toBe(33_575);
      expect(cellsWhere(shares, (share) => share === 0).length).toBe(31_268);
      expect(sheetShare).toBeCloseTo(14.2, 1);
    }, 120_000);

    it.each([
      {
        vote: 'DOMINANT',
        survival: [29.6, 42.7, 54.1, 61.4, 65.4],
        loss: [0.39, 2.7, 5.12, 7.81, 10.51],
        noInkLoss: [0.0, 0.52, 1.73, 3.65, 6.05],
        resultShare: [16.5, 17.2, 18.9, 20.8, 22.9],
      },
      {
        vote: 'INK_WEIGHTED',
        survival: [8.4, 18.0, 32.5, 40.5, 48.5],
        loss: [0.0, 0.47, 2.32, 3.97, 6.08],
        noInkLoss: [0.0, 0.02, 0.59, 1.52, 2.86],
        resultShare: [10.2, 9.8, 12.8, 14.3, 16.1],
      },
    ] satisfies readonly {
      vote: VoteMethod;
      survival: readonly number[];
      loss: readonly number[];
      noInkLoss: readonly number[];
      resultShare: readonly number[];
    }[])(
      'runs the stated ladder under $vote',
      ({ vote, survival, loss, noInkLoss, resultShare }) => {
        const { shares, cells } = sourceInkShares();
        const minority = cellsWhere(shares, (share) => share > 0 && share < 0.5);
        const surface = cellsWhere(shares, (share) => share < 0.2);
        // The cheap reading the docblock rejects, pinned because the gap to `surface` is its whole
        // point — a figure quoted to reject a method drifts as readily as one quoted to justify one.
        const noInk = cellsWhere(shares, (share) => share === 0);

        for (const [thickness, expected] of survival.entries()) {
          const { image } = quantiseImage(sheet, CALIBRATION({ vote, outlineExpansion: thickness }));
          const inkAt = (cell: number): boolean => isInkPixel(image.data, cell * CHANNELS_PER_PIXEL);
          const shareOf = (set: readonly number[]): number => (100 * set.filter(inkAt).length) / set.length;

          expect(shareOf(minority)).toBeCloseTo(expected, 1);
          expect(shareOf(surface)).toBeCloseTo(loss[thickness] ?? 0, 2);
          expect(shareOf(noInk)).toBeCloseTo(noInkLoss[thickness] ?? 0, 2);

          let ink = 0;
          let opaque = 0;
          for (let cell = 0; cell < cells; cell += 1) {
            const at = cell * CHANNELS_PER_PIXEL;
            if ((image.data[at + 3] ?? 0) === 0) continue;
            opaque += 1;
            if (inkAt(cell)) ink += 1;
          }
          expect((100 * ink) / opaque).toBeCloseTo(resultShare[thickness] ?? 0, 1);
        }
      },
      600_000,
    );
  });

  describe('the two dither tables', () => {
    const GAME_BOY = ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'].map((hex) => {
      const parsed = fromHex(hex);
      if (parsed === null) throw new Error(`not a colour: ${hex}`);
      return parsed;
    });

    /** A row of the tables: the three figures, per pixel and over 4 x 4 and 8 x 8 blocks. */
    const rowOf = (
      reference: Float64Array,
      image: ImageData,
      width: number,
      height: number,
    ): readonly number[] => {
      const field = toConeField(image);
      return [1, 4, 8].map((block) =>
        Number(meanCellDistance(reference, field, width, height, block).toFixed(3)),
      );
    };

    it('DITHER_CHOICES — the budget-32 row, against the source cell means', () => {
      const mesh = boundaryMesh(sheet, 6);
      const reference = cellMeanField(sheet, mesh);
      const reduction: ColorReduction = { kind: 'MAX_COLORS', maxColors: 32 };
      const rows = (['NONE', 'BAYER_4', 'BAYER_8', 'BLUE_NOISE'] as const).map((dither) =>
        rowOf(
          reference,
          quantiseImage(sheet, CALIBRATION({ dither, reduction })).image,
          mesh.x.length,
          mesh.y.length,
        ),
      );

      // Three decimals rather than the docblock's own one, because 15.75 rounds either way and the
      // table says 15.7 — a two-decimal pin would not tell the two apart.
      expect(rows).toEqual([
        [14.335, 4.734, 3.377],
        [15.747, 4.44, 3.116],
        [15.812, 4.472, 3.158],
        [15.757, 4.476, 3.133],
      ]);
    }, 240_000);

    it('DITHER_SHORTLIST — the column the constant ships, against the sheet with no palette step', () => {
      const flat = quantiseImage(sheet, CALIBRATION({ reduction: null }));
      const reference = toConeField(flat.image);
      const { width, height } = flat.image;

      expect(width * height).toBe(43_681);
      expect(countColors(flat.image)).toBe(9_975);
      expect(countColors(sheet)).toBe(218_978);

      const budgets: readonly ColorReduction[] = [
        { kind: 'MAX_COLORS', maxColors: 64 },
        { kind: 'MAX_COLORS', maxColors: 16 },
        { kind: 'MAX_COLORS', maxColors: 8 },
        { kind: 'PALETTE', entries: GAME_BOY },
      ];

      expect(
        budgets.map((reduction) =>
          rowOf(
            reference,
            quantiseImage(sheet, CALIBRATION({ dither: 'BLUE_NOISE', reduction })).image,
            width,
            height,
          ),
        ),
      ).toEqual([
        [2.199, 0.75, 0.44],
        [4.264, 1.428, 0.876],
        [6.109, 2.516, 1.645],
        [93.926, 84.982, 87.523],
      ]);
    }, 240_000);
  });
});
