import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { calibrationSettings } from './calibrationSettings.ts';
import { brightSideShare, expandWith, groundTermField, openCloseTail } from './outlineVariants.ts';
import { DEFAULT_INK_THRESHOLD } from '../src/constants/quantiser.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import { CHANNELS_PER_PIXEL, pixelOffset } from '../src/utils/imageData.ts';
import { lumaOfChannels } from '../src/utils/lineVote.ts';
import { outlineExpansion } from '../src/utils/outlineExpansion.ts';
import { outlinePolarity } from '../src/utils/outlinePolarity.ts';
import { quantiseFromPrologue } from '../src/utils/quantiseImage.ts';
import { quantisePrologue } from '../src/utils/quantisePrologue.ts';
import type { QuantisePrologue, VoteMethod } from '../src/types/quantiser.ts';

/** Ink is the darkest quarter, which is what the vote's own rescue and these figures both mean. */
function isInkPixel(data: Uint8ClampedArray, at: number): boolean {
  if ((data[at + 3] ?? 0) === 0) return false;
  return lumaOfChannels(data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0) < DEFAULT_INK_THRESHOLD;
}

/** What one run through the pipeline did to each population, in per cent. */
interface Reading {
  survival: number;
  loss: number;
  noInkLoss: number;
  resultShare: number;
}

/** The grid every figure here is read at. */
const GRID = 6;

/**
 * The survival and surface-loss ladders `outlineExpansion` states, re-derived from the reference
 * sheet, and the two variants its docblock and `outlinePolarity`'s compare the shipped pass against.
 * See `calibrationSettings.ts` for why the docblock-figure suites exist.
 *
 * Every run goes through `quantisePrologue` and `quantiseFromPrologue`, which is `quantiseImage`
 * less the difference map. A variant is its expanded sheet handed in as the prologue's source with
 * the dial at 0, so it is voted over the same mesh the shipped pass is — the mesh is measured before
 * the expansion either way.
 */
describe('outlineExpansion — the survival and surface-loss ladders', () => {
  let sheet: ImageData;
  let populations: { minority: readonly number[]; surface: readonly number[]; noInk: readonly number[] };
  let sheetShare: number;
  const prologues = new Map<VoteMethod, QuantisePrologue>();
  const ladders = new Map<VoteMethod, Reading[]>();

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
    const shares = sourceInkShares();
    // An empty cell counts for none of the three.
    const where = (test: (share: number) => boolean): readonly number[] =>
      shares.flatMap((share, cell) => (share >= 0 && test(share) ? [cell] : []));
    populations = {
      minority: where((share) => share > 0 && share < 0.5),
      surface: where((share) => share < 0.2),
      // The cheap reading the docblock rejects, pinned because the gap to `surface` is its whole
      // point — a figure quoted to reject a method drifts as readily as one quoted to justify one.
      noInk: where((share) => share === 0),
    };
  }, 120_000);

  /** Each cell's ink share on the sheet **as it arrived**, which is what both ladders sort by. */
  function sourceInkShares(): number[] {
    const mesh = boundaryMesh(sheet, GRID);
    const shares: number[] = [];
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
        shares[row * mesh.x.length + column] = cellOpaque === 0 ? -1 : cellInk / cellOpaque;
        ink += cellInk;
        opaque += cellOpaque;
      }
    }
    sheetShare = (100 * ink) / opaque;
    return shares;
  }

  function prologueFor(vote: VoteMethod): QuantisePrologue {
    const found = prologues.get(vote) ?? quantisePrologue(sheet, calibrationSettings({ vote }));
    prologues.set(vote, found);
    return found;
  }

  /** The pipeline over `source` — the prologue's own, or a variant's expansion of it — read four ways. */
  function read(vote: VoteMethod, source: ImageData, thickness = 0): Reading {
    const settings = calibrationSettings({ vote, outlineExpansion: thickness });
    const { image } = quantiseFromPrologue({ ...prologueFor(vote), source }, settings);
    const inkAt = (cell: number): boolean => isInkPixel(image.data, cell * CHANNELS_PER_PIXEL);
    const shareOf = (set: readonly number[]): number => (100 * set.filter(inkAt).length) / set.length;

    let ink = 0;
    let opaque = 0;
    for (let cell = 0; cell < image.width * image.height; cell += 1) {
      if ((image.data[cell * CHANNELS_PER_PIXEL + 3] ?? 0) === 0) continue;
      opaque += 1;
      if (inkAt(cell)) ink += 1;
    }
    return {
      survival: shareOf(populations.minority),
      loss: shareOf(populations.surface),
      noInkLoss: shareOf(populations.noInk),
      resultShare: (100 * ink) / opaque,
    };
  }

  /** The shipped pass's ladder from 0 to 4, run once per vote and shared by every test below. */
  function ladderFor(vote: VoteMethod): Reading[] {
    const found =
      ladders.get(vote) ??
      [0, 1, 2, 3, 4].map((thickness) => read(vote, prologueFor(vote).source, thickness));
    ladders.set(vote, found);
    return found;
  }

  it('sorts the mesh into the populations the ladders are read over', () => {
    expect(populations.minority.length).toBe(6_433);
    expect(populations.surface.length).toBe(33_575);
    expect(populations.noInk.length).toBe(31_268);
    expect(sheetShare).toBeCloseTo(14.2, 1);
  });

  it.each([
    {
      vote: 'DOMINANT',
      survival: [24.4, 40.1, 53.4, 60.9, 64.6],
      loss: [0.25, 2.35, 5.1, 7.69, 10.07],
      noInkLoss: [0.0, 0.43, 1.73, 3.5, 5.58],
      resultShare: [15.4, 16.6, 18.7, 20.6, 22.4],
    },
    {
      vote: 'INK_WEIGHTED',
      survival: [12.7, 20.3, 31.3, 40.0, 47.7],
      loss: [0.0, 0.68, 2.03, 3.82, 5.85],
      noInkLoss: [0.0, 0.01, 0.4, 1.43, 2.7],
      resultShare: [11.0, 10.4, 12.3, 14.1, 15.8],
    },
  ] satisfies readonly ({ vote: VoteMethod } & { [K in keyof Reading]: readonly number[] })[])(
    'runs the stated ladder under $vote',
    ({ vote, survival, loss, noInkLoss, resultShare }) => {
      for (const [thickness, reading] of ladderFor(vote).entries()) {
        expect(reading.survival).toBeCloseTo(survival[thickness] ?? 0, 1);
        expect(reading.loss).toBeCloseTo(loss[thickness] ?? 0, 2);
        expect(reading.noInkLoss).toBeCloseTo(noInkLoss[thickness] ?? 0, 2);
        expect(reading.resultShare).toBeCloseTo(resultShare[thickness] ?? 0, 1);
      }
    },
    600_000,
  );

  it('rebuilds the shipped pass exactly, so the two variants below vary only what they claim to', () => {
    const { source } = prologueFor('DOMINANT');
    const shipped = outlinePolarity(source, GRID);

    // Counted rather than compared with `toEqual`, which walks a six-megabyte array element by
    // element and then prints it.
    const differing = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
      let count = a.length === b.length ? 0 : Number.POSITIVE_INFINITY;
      for (let at = 0; at < a.length; at += 1) if (!Object.is(a[at], b[at])) count += 1;
      return count;
    };

    expect(differing(groundTermField(source, GRID, 0, 1).scores, shipped.scores)).toBe(0);
    for (const thickness of [1, 2]) {
      expect(
        differing(
          expandWith(source, shipped, thickness).data,
          outlineExpansion(source, GRID, thickness).data,
        ),
      ).toBe(0);
    }
  }, 120_000);

  /**
   * Point 5 of `outlineExpansion`'s port notes: PixelOE's opening-and-closing tail carried after the
   * pass, against the shipped ladder interpolated to the carried pass's own surface loss.
   */
  it('measures the opening-and-closing tail the port drops', () => {
    const shipped = ladderFor('DOMINANT');
    const { source } = prologueFor('DOMINANT');
    const uncarriedAt = (loss: number): number => {
      const above = shipped.findIndex((rung) => rung.loss >= loss);
      const upper = above === -1 ? shipped.length - 1 : Math.max(above, 1);
      const low = shipped[upper - 1] ?? shipped[0];
      const high = shipped[upper] ?? low;
      if (low === undefined || high === undefined) throw new Error('The shipped ladder is empty.');
      return low.survival + ((high.survival - low.survival) * (loss - low.loss)) / (high.loss - low.loss);
    };

    for (const [index, expected] of [
      { survival: 36.8, loss: 2.09, uncarried: 38.1 },
      { survival: 45.5, loss: 4.41, uncarried: 50.1 },
      { survival: 53.0, loss: 6.99, uncarried: 58.9 },
    ].entries()) {
      const thickness = index + 1;
      const carried = read('DOMINANT', openCloseTail(outlineExpansion(source, GRID, thickness), thickness));

      expect(carried.survival).toBeCloseTo(expected.survival, 1);
      expect(carried.loss).toBeCloseTo(expected.loss, 2);
      expect(uncarriedAt(carried.loss)).toBeCloseTo(expected.uncarried, 1);
    }
  }, 600_000);

  /** `outlinePolarity`'s ground term, restored at each weighting it states, at a thickness of 2. */
  it('measures the polarity ground term the port drops', () => {
    const { source } = prologueFor('DOMINANT');

    expect(brightSideShare(source, groundTermField(source, GRID, 10, 3))).toBeCloseTo(96, 0);
    for (const { ground, reach, survival } of [
      { ground: 10, reach: 3, survival: 12.5 },
      { ground: 9, reach: 4, survival: 14.6 },
      { ground: 5, reach: 5, survival: 22.6 },
      { ground: 2, reach: 8, survival: 42.0 },
    ]) {
      const expanded = expandWith(source, groundTermField(source, GRID, ground, reach), 2);
      expect(read('DOMINANT', expanded).survival).toBeCloseTo(survival, 1);
    }
  }, 600_000);
});
