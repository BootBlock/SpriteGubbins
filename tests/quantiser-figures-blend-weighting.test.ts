import { beforeAll, describe, expect, it, vi } from 'vitest';
import { artError, artKept, scatteredFixture, seamedFixture, type BlendFixture } from './blendFixtures.ts';
import { meanPaletteError } from './meanPaletteError.ts';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { colorHistogram, packColor } from '../src/utils/imageData.ts';
import { buildPalette } from '../src/utils/wuQuantiser.ts';
import type { Rgba } from '../src/types/quantiser.ts';

/**
 * The figures the four `BLEND_*` docblocks in `constants/quantiser.ts` state, and `wuQuantiser`'s
 * comparison of the weighted search against an unweighted one, re-derived. See
 * `calibrationSettings.ts` for why the docblock-figure suites exist.
 *
 * **Every figure is read through the shipped `buildPalette`**, the Wu cut and the rounds that refine
 * it, because that is the search the weighting feeds. The fixture figures were first stated from the
 * cut alone, and the refinement moved both columns — the unweighted one down, and the weighting's
 * plateau from 1/64 to 1/1024 — so a figure read off either half of the search on its own describes
 * a pipeline this app does not run.
 *
 * The dials are varied by replacing their four exports with getters, so the reading being measured
 * is `blendWeightedHistogram` itself rather than a copy of it. A vote weight of 1 is the unweighted
 * histogram exactly: every colour counts every pixel it has, which is what `colorHistogram` counts.
 */

const dials = vi.hoisted(() => ({ gap: 0, end: 0, straightness: 0, weight: 0 }));

vi.mock('../src/constants/quantiser.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/constants/quantiser.ts')>();
  Object.assign(dials, {
    gap: actual.BLEND_EDGE_GAP,
    end: actual.BLEND_END_GAP,
    straightness: actual.BLEND_STRAIGHTNESS,
    weight: actual.BLEND_VOTE_WEIGHT,
  });
  return Object.defineProperties(
    { ...actual },
    {
      BLEND_EDGE_GAP: { get: () => dials.gap, enumerable: true },
      BLEND_END_GAP: { get: () => dials.end, enumerable: true },
      BLEND_STRAIGHTNESS: { get: () => dials.straightness, enumerable: true },
      BLEND_VOTE_WEIGHT: { get: () => dials.weight, enumerable: true },
    },
  );
});

type Dials = typeof dials;

/** `read` with the dials moved by `over`, and every one of them back where it was afterwards. */
function withDials<T>(over: Partial<Dials>, read: () => T): T {
  const shipped = { ...dials };
  Object.assign(dials, over);
  try {
    return read();
  } finally {
    Object.assign(dials, shipped);
  }
}

const UNWEIGHTED: Partial<Dials> = { weight: 1 };

/** A palette as its sorted packed colours, so two runs compare exactly whatever their order. */
const signature = (palette: readonly Rgba[]): string =>
  [...palette]
    .map(packColor)
    .sort((left, right) => left - right)
    .join(',');

describe('the blend weighting’s fixture figures', () => {
  const ART_COUNTS = [8, 12, 16, 24];
  const scattered = ART_COUNTS.map(scatteredFixture);
  const seamed = seamedFixture();

  /** Art colours kept on each scattered fixture at a budget of its own colour count. */
  const keptAcross = (over: Partial<Dials>): number[] =>
    withDials(over, () =>
      scattered.map((fixture) => artKept(fixture, buildPalette(fixture.sheet, fixture.art.length))),
    );

  /** Art colours kept, blend entries spent and the error at the art, on the seamed fixture at 24. */
  const seamAt24 = (over: Partial<Dials>): [kept: number, blends: number, error: number] =>
    withDials(over, () => {
      const palette = buildPalette(seamed.sheet, 24);
      const kept = artKept(seamed, palette);
      return [kept, palette.length - kept, Number(artError(seamed, palette).toFixed(2))];
    });

  it('builds the fixtures the figures were measured on', () => {
    expect(scattered.map((fixture: BlendFixture) => colorHistogram(fixture.sheet).size)).toEqual([
      164, 297, 306, 390,
    ]);
    expect(colorHistogram(seamed.sheet).size).toBe(550);
  });

  /** The palette each fixture and budget chooses, as sorted packed colours, to compare runs exactly. */
  const palettesAt = (over: Partial<Dials>): string[] =>
    withDials(over, () => [
      ...scattered.map((fixture) => signature(buildPalette(fixture.sheet, fixture.art.length))),
      ...[16, 24, 32].map((budget) => signature(buildPalette(seamed.sheet, budget))),
    ]);

  it('BLEND_EDGE_GAP: the defect, the fix, and where the gap stops mattering', () => {
    expect(keptAcross(UNWEIGHTED)).toEqual([6, 8, 10, 13]);
    expect(keptAcross({})).toEqual([8, 11, 16, 22]);
    expect(keptAcross({ gap: 8 })).toEqual([8, 11, 16, 22]);
    expect(seamAt24({ gap: 8 })).toEqual(seamAt24({}));
    expect(keptAcross({ gap: 24 })).toEqual([8, 11, 14, 21]);
    expect(keptAcross({ gap: 32 })).toEqual([8, 8, 11, 17]);
  });

  /** Each fixture and budget the end gap was chosen across, as the fixture and the budget. */
  const END_GAP_READINGS: readonly (readonly [BlendFixture, number])[] = [
    ...scattered.flatMap((fixture) =>
      [0.5, 0.75, 1].map((share) => [fixture, Math.round(fixture.art.length * share)] as const),
    ),
    ...[8, 12, 16, 20, 24, 32].map((budget) => [seamed, budget] as const),
  ];

  /** Every reading's palette, and how many art colours each one keeps. */
  const endGapReadings = (over: Partial<Dials>): { palettes: string[]; kept: number[] } =>
    withDials(over, () => {
      const read = END_GAP_READINGS.map(([fixture, budget]) => {
        const palette = buildPalette(fixture.sheet, budget);
        return { palette: signature(palette), kept: artKept(fixture, palette) };
      });
      return { palettes: read.map(({ palette }) => palette), kept: read.map(({ kept }) => kept) };
    });

  /** Art colours kept on the seamed fixture at `budget`. */
  const seamKept = (over: Partial<Dials>, budget: number): number =>
    withDials(over, () => artKept(seamed, buildPalette(seamed.sheet, budget)));

  it('BLEND_END_GAP: 1 to 5 choose the same palettes, 6 to 9 the same art, and 0 and 10 move it', () => {
    const shipped = endGapReadings({});
    for (const end of [1, 2, 3, 5]) expect(endGapReadings({ end }).palettes).toEqual(shipped.palettes);
    for (const end of [6, 7, 8, 9]) {
      const reading = endGapReadings({ end });
      expect(reading.palettes).not.toEqual(shipped.palettes);
      expect(reading.kept).toEqual(shipped.kept);
    }
    expect(keptAcross({ end: 10 })).toEqual([8, 11, 14, 22]);
    expect(seamAt24({ end: 10 })).toEqual([22, 2, 0.55]);
    // At 0 the answer moves both ways on the seamed fixture.
    expect([seamKept({ end: 0 }, 16), seamKept({}, 16)]).toEqual([16, 12]);
    expect([seamKept({ end: 0 }, 8), seamKept({}, 8)]).toEqual([4, 8]);
  });

  it('BLEND_STRAIGHTNESS: nothing at zero slack, and a plateau from 4', () => {
    expect(keptAcross({ straightness: 0 })).toEqual(keptAcross(UNWEIGHTED));
    expect(seamAt24({ straightness: 0 })).toEqual(seamAt24(UNWEIGHTED));
    for (const straightness of [8, 16]) {
      expect(keptAcross({ straightness })).toEqual([8, 11, 16, 22]);
      expect(seamAt24({ straightness })).toEqual(seamAt24({}));
    }
  });

  it('BLEND_VOTE_WEIGHT: the seam fixture, the weights above 1/1024, and the ones below it', () => {
    expect(seamAt24(UNWEIGHTED)).toEqual([21, 3, 1.83]);
    expect(seamAt24({})).toEqual([24, 0, 0]);
    expect(keptAcross({ weight: 1 / 4 })).toEqual([8, 9, 12, 17]);
    expect(keptAcross({ weight: 1 / 16 })).toEqual([8, 10, 13, 20]);
    expect(keptAcross({ weight: 1 / 32 })).toEqual([8, 11, 14, 22]);
    expect(keptAcross({ weight: 1 / 64 })).toEqual([8, 11, 15, 22]);
    expect(keptAcross({ weight: 1 / 512 })).toEqual([8, 11, 15, 22]);
    // Where the answer stops moving: every palette on every fixture and budget is the shipped one.
    const shipped = palettesAt({});
    for (const weight of [1 / 2048, 1 / 4096, 1 / 65536, 1e-6]) {
      expect(palettesAt({ weight })).toEqual(shipped);
    }
  });
});

describe('the weighted search against an unweighted one, on the reference sheet', () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  it('the four budgets `wuQuantiser` compares the two at', () => {
    const ladder = (over: Partial<Dials>): number[] =>
      withDials(over, () =>
        [16, 32, 64, 256].map((budget) =>
          Number(meanPaletteError(sheet, buildPalette(sheet, budget)).toFixed(3)),
        ),
      );
    expect(ladder(UNWEIGHTED)).toEqual([3.62, 2.567, 1.842, 1.228]);
    expect(ladder({})).toEqual([3.673, 2.675, 2.029, 1.3]);
  }, 240_000);
});
