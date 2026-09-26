import { beforeAll, describe, expect, it } from 'vitest';
import { CORPUS_SHEETS, loadCorpus } from './sheetCorpus.ts';
import { calibrationSettings } from './calibrationSettings.ts';
import { COLOR_MERGE_RANGE, DEFAULT_PALETTE_SNAP, PALETTE_SNAP_RANGE } from '../src/constants/quantiser.ts';
import { colorHistogram, fromHex, packColor, unpackColor } from '../src/utils/imageData.ts';
import { type LocatedEntry, locateEntries, nearestOklab } from '../src/utils/lockedPalette.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { buildPalette } from '../src/utils/wuQuantiser.ts';
import type { QuantiseSettings, Rgba } from '../src/types/quantiser.ts';

/**
 * The two populations the palette lock sets its snap distance from. See `calibrationSettings.ts`
 * for why the docblock-figure suites exist.
 *
 * **The lock's opening position is argued from these figures.** Its two populations are only
 * re-derivable if both are stated exactly (issue #238), so the drift is measured on the colours the
 * lock is actually handed, never on a 64-colour result it is not applied to, and the colours it must
 * keep are named by hex. Four of those come from three of the other sheets' own palettes, and the
 * ceiling and each lock's distance from black are taken from all eight.
 */
describe('the palette lock — the two populations the snap distance is set from', () => {
  let corpus: ReadonlyMap<string, ImageData>;
  let sheet: ImageData;

  /**
   * The whole corpus, and the reference sheet as the corpus's own copy of it rather than a second
   * decoding — so the lock taken from `sheet` is the one the corpus survey below reads for it too.
   */
  beforeAll(async () => {
    corpus = await loadCorpus();
    sheet = sheetNamed('armour.png');
  }, 300_000);

  const sheetNamed = (name: string): ImageData => {
    const image = corpus.get(name);
    if (image === undefined) throw new Error(`${name} is missing from the corpus`);
    return image;
  };

  /**
   * The lock both docblocks are stated against: the ink-weighted reading's own colours.
   *
   * Taken once per image: five cases read the reference sheet's lock, and each is a whole pass of
   * the pipeline. `quantiseImage` is pure, so a shared lock is the same lock.
   */
  const locks = new WeakMap<ImageData, readonly Rgba[]>();
  const lockFrom = (image: ImageData): readonly Rgba[] => {
    const known = locks.get(image);
    if (known !== undefined) return known;
    const lock = quantiseImage(image, calibrationSettings({ vote: 'INK_WEIGHTED' })).paletteEntries;
    locks.set(image, lock);
    return lock;
  };

  /** How far a colour sits from the lock, in the unit the dial is in. */
  const reachOf = (color: Rgba, lock: readonly LocatedEntry[]): number => {
    const nearest = nearestOklab(color, lock);
    if (nearest === null) throw new Error('an empty lock has no entry to measure against');
    // The root of what `applyLockedPalette` gates on, since it compares the squared figure against
    // `snap × snap` — so this is the distance a snap setting is read against.
    return Math.sqrt(nearest.distance);
  };

  /** Every colour of an image with its distance from the lock and its pixel count, nearest first. */
  const reachesOf = (
    image: ImageData,
    lock: readonly LocatedEntry[],
  ): readonly { reach: number; pixels: number }[] =>
    Array.from(colorHistogram(image), ([key, pixels]) => ({
      reach: reachOf(unpackColor(key), lock),
      pixels,
    })).sort((left, right) => left.reach - right.reach);

  /** The smallest distance within which `share` of the pixels sit. */
  const pixelPercentile = (reaches: readonly { reach: number; pixels: number }[], share: number): number => {
    const total = reaches.reduce((sum, { pixels }) => sum + pixels, 0);
    let covered = 0;
    for (const { reach, pixels } of reaches) {
      covered += pixels;
      if (covered >= share * total) return reach;
    }
    return reaches.at(-1)?.reach ?? 0;
  };

  const round = (figure: number): number => Number(figure.toFixed(2));
  const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };

  /**
   * The re-readings the drift is measured over, and the four of them are the ones a lock can meet.
   *
   * No budget is among them, because a budget is not a re-reading a lock is ever applied to: at any
   * snap above 0 a lock supersedes the budget (`colorPlanFor`), so every budget reads the same while
   * one is reaching. The sheet the lock was taken from, read again, is among them instead — and it is
   * the commonest case, since every dial moved after locking re-reads it.
   */
  const REREADINGS: readonly Partial<QuantiseSettings>[] = [
    { vote: 'INK_WEIGHTED' },
    { vote: 'DOMINANT' },
    { vote: 'K_CENTROID' },
    { vote: 'INK_WEIGHTED', grid: 5 },
  ];

  /**
   * The colours the lock is handed under a re-reading — which is **not** that reading's own result.
   *
   * The lock takes the budget's place in the pipeline, so it runs where the budget would have: ahead
   * of the dominant vote, on the source pixels themselves, and after the two averaging readings, on
   * the cell colours they blended. Measuring it against a 64-colour result instead would measure a
   * second quantisation no locked sheet goes through.
   */
  const handedToTheLock = (over: Partial<QuantiseSettings>): ImageData =>
    over.vote === 'DOMINANT'
      ? sheet
      : quantiseImage(sheet, calibrationSettings({ ...over, reduction: null })).image;

  it('measures the drift where the lock runs: 0.38 at the median, 8.36 to 22.58 at the 99th', () => {
    // The dominant arm hands the lock `sheet` itself only while the outline expansion is off, which
    // is its opening position — a thickened copy is what the budget would otherwise have run on.
    expect(calibrationSettings().outlineExpansion).toBe(0);

    const lock = locateEntries(lockFrom(sheet));
    expect(lock).toHaveLength(64);

    const figures = REREADINGS.map((over) => {
      const reaches = reachesOf(handedToTheLock(over), lock);
      return [pixelPercentile(reaches, 0.5), pixelPercentile(reaches, 0.99), reaches.at(-1)?.reach ?? 0].map(
        round,
      );
    });
    expect(figures).toEqual([
      [0.38, 8.36, 27.06],
      [0.38, 22.58, 44.09],
      [0.38, 9.59, 38.88],
      [0.38, 8.57, 32.4],
    ]);

    // The source's own outline black sits past the dominant reading's ninety-ninth percentile: the
    // averaging reading the lock was taken from blends it into a dark tone, and it is further from
    // the lock than that percentile.
    const black = reachOf(BLACK, lock);
    expect(round(black)).toBe(23.78);
    expect(black).toBeGreaterThan(figures[1]?.[1] ?? Infinity);

    // A share of the source still sits past the opening, which the dominant vote does not all
    // outvote — the next test is where that shows short of 100%.
    const source = reachesOf(sheet, lock);
    const pixelsOf = (reaches: typeof source): number => reaches.reduce((sum, { pixels }) => sum + pixels, 0);
    const beyond = source.filter(({ reach }) => reach > DEFAULT_PALETTE_SNAP);
    expect(round((100 * pixelsOf(beyond)) / pixelsOf(source))).toBe(0.99);
    // Most of that share is the black outline alone.
    const outline = source.filter(({ reach }) => reach === black);
    expect(round((100 * pixelsOf(outline)) / pixelsOf(source))).toBe(0.78);

    // The opening is the first integer past the widest ninety-ninth percentile on this sheet, which
    // is the relationship `DEFAULT_PALETTE_SNAP` argues from.
    expect(DEFAULT_PALETTE_SNAP).toBe(Math.floor(Math.max(...figures.map((row) => row[1] ?? 0))) + 1);
  }, 300_000);

  it('draws the dominant reading 99.03% in locked colours at 23, and the locked sheet in 64 only from 28', () => {
    const entries = lockFrom(sheet);
    const held = new Set(entries.map(packColor));

    /** The share of the result's pixels drawn in a held colour, and how many colours it has. */
    const underLock = (over: Partial<QuantiseSettings>, snap: number): [number, number] => {
      const result = quantiseImage(
        sheet,
        calibrationSettings({ ...over, reduction: { kind: 'LOCKED', entries, snap } }),
      );
      let pixels = 0;
      let locked = 0;
      for (const [key, count] of colorHistogram(result.image)) {
        pixels += count;
        if (held.has(key)) locked += count;
      }
      return [round((100 * locked) / pixels), result.colors];
    };

    expect(REREADINGS.map((over) => underLock(over, DEFAULT_PALETTE_SNAP - 1))).toEqual([
      [99.98, 74],
      [99.02, 64],
      [99.93, 88],
      [99.98, 77],
    ]);
    expect(REREADINGS.map((over) => underLock(over, DEFAULT_PALETTE_SNAP))).toEqual([
      [99.99, 69],
      [99.03, 64],
      [99.94, 86],
      [99.98, 73],
    ]);
    // One step further the black is inside the reach, and the dominant reading is wholly locked.
    expect(underLock({ vote: 'DOMINANT' }, DEFAULT_PALETTE_SNAP + 1)).toEqual([100, 61]);

    // The sheet the lock was taken from comes back in its own 64 colours only once its furthest
    // colour, 27.06, is inside the reach — which is what "a lock does not promise a colour count"
    // costs at the opening.
    expect([27, 28].map((snap) => underLock({ vote: 'INK_WEIGHTED' }, snap)[1])).toEqual([65, 64]);
  }, 600_000);

  /** The twelve fully saturated sRGB hues, 30° apart from red — named by hex so they can be re-read. */
  const HUE_WHEEL = [
    '#FF0000',
    '#FF8000',
    '#FFFF00',
    '#80FF00',
    '#00FF00',
    '#00FF80',
    '#00FFFF',
    '#0080FF',
    '#0000FF',
    '#8000FF',
    '#FF00FF',
    '#FF0080',
  ] as const;

  const colorOf = (hex: string): Rgba => {
    const parsed = fromHex(hex);
    if (parsed === null) throw new Error(`not a colour: ${hex}`);
    return parsed;
  };

  it('keeps every saturated hue the sheet does not hold, the nearest at 26.56', () => {
    const lock = locateEntries(lockFrom(sheet));
    const reaches = HUE_WHEEL.map((hex) => round(reachOf(colorOf(hex), lock)));

    expect(reaches).toEqual([
      56.41, 26.56, 33.59, 48.24, 58.53, 49.64, 48.44, 63.92, 71.77, 44.99, 3.72, 41.08,
    ]);

    // Magenta is the one hue this sheet holds — it is the key field, and these conditions do not key
    // it out — so it is the one left out of the population the opening has to keep.
    const absent = reaches.filter((_, index) => HUE_WHEEL[index] !== '#FF00FF');
    expect(Math.min(...absent)).toBeGreaterThan(DEFAULT_PALETTE_SNAP);
  }, 300_000);

  describe('over the corpus', () => {
    it('finds colours this sheet has no hue for inside the drift, from 15.13', () => {
      const lock = locateEntries(lockFrom(sheet));

      /**
       * A colour of another sheet's own 16-colour palette, which is the population nobody picked: it
       * is what `buildPalette` says that sheet is made of. The four are the ones the docblock names,
       * each in a hue the reference sheet — green and gold, on magenta — has none of.
       */
      const NAMED = [
        { name: 'character_space_marine_blue.png', hex: '#1B2336' },
        { name: 'character_space_marine_blue.png', hex: '#212E49' },
        { name: 'three-quarter-view_tiles1.png', hex: '#056E78' },
        { name: 'cyborg_black_red.png', hex: '#7E191C' },
      ] as const;

      const reaches = NAMED.map(({ name, hex }) => {
        const palette = buildPalette(sheetNamed(name), 16);
        const color = colorOf(hex);
        expect(
          palette.some((entry) => packColor(entry) === packColor(color)),
          `${hex} in ${name}`,
        ).toBe(true);
        return round(reachOf(color, lock));
      });

      expect(reaches).toEqual([15.13, 22.74, 25.95, 26.66]);
    }, 600_000);

    it('puts each sheet furthest colour under the ceiling, and black as far as 38.11 from its own lock', () => {
      const figures = CORPUS_SHEETS.map((name) => {
        const image = sheetNamed(name);
        const lock = locateEntries(lockFrom(image));
        return [round(reachesOf(image, lock).at(-1)?.reach ?? 0), round(reachOf(BLACK, lock))];
      });

      expect(figures).toEqual([
        [44.09, 23.78],
        [53.17, 32.64],
        [44.69, 34.92],
        [44.14, 0],
        [46.83, 31.34],
        [38.52, 34.78],
        [34.27, 31.45],
        [59.52, 38.11],
      ]);

      // The ceiling's claim: at its top the lock reaches every colour any corpus sheet hands it under
      // the dominant reading, which the cleanup dials' own ceiling would not.
      const furthest = figures.map(([reach]) => reach ?? 0);
      expect(Math.max(...furthest)).toBeLessThan(PALETTE_SNAP_RANGE.max);
      expect(furthest.filter((reach) => reach > COLOR_MERGE_RANGE.max)).toHaveLength(2);
    }, 600_000);
  });
});
