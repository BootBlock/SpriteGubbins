import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { calibrationSettings } from './calibrationSettings.ts';
import { DEFAULT_INK_THRESHOLD } from '../src/constants/quantiser.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import { CHANNELS_PER_PIXEL, pixelOffset } from '../src/utils/imageData.ts';
import { lumaOfChannels } from '../src/utils/lineVote.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import type { VoteMethod } from '../src/types/quantiser.ts';

/** Ink is the darkest quarter, which is what the vote's own rescue and these figures both mean. */
function isInkPixel(data: Uint8ClampedArray, at: number): boolean {
  if ((data[at + 3] ?? 0) === 0) return false;
  return lumaOfChannels(data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0) < DEFAULT_INK_THRESHOLD;
}

/**
 * The survival and surface-loss ladders `outlineExpansion` states, re-derived from the reference
 * sheet. See `calibrationSettings.ts` for why the docblock-figure suites exist.
 */
describe('outlineExpansion — the survival and surface-loss ladders', () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

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
        const { image } = quantiseImage(sheet, calibrationSettings({ vote, outlineExpansion: thickness }));
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
