import { beforeAll, describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../src/constants/backgroundKeyColors.ts';
import { IDENTITY_KEY_SURVIVAL_TOLERANCE } from '../src/constants/identityCapture.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import type {
  BackgroundKeying,
  ImportedImage,
  QuantiseResult,
  QuantiseSettings,
  QuantiseTuning,
} from '../src/types/quantiser.ts';
import { borderKeyShare } from '../src/utils/borderKeyShare.ts';
import { identityPalette } from '../src/utils/identityPalette.ts';
import { quantisedSheetCapture } from '../src/utils/quantisedSheetCapture.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { loadCorpus, type CorpusSheetName } from './sheetCorpus.ts';

/**
 * The measurement `quantisedSheetCapture` refuses an unkeyed result on.
 *
 * That control offers the Quantise tab's result to the identity lock, and it refuses one the tab did
 * not key. **The reason recorded here used to be that the digest would lead with the key**, because
 * `identityPalette` excluded the key by exact RGB while a quantised field is not the exact key —
 * these sheets were resampled on the way out of their generator, so each one's magenta carries the
 * resampler's ringing. That is the defect fixed in `identityPalette`, which now removes the field
 * with the app's own keying pass; measured over this corpus, an unkeyed result's digest leads with a
 * subject colour on all eight.
 *
 * **The refusal survives it, on a different measurement.** What the button offers is the palette the
 * next sheet will be drawn in, and the tab has *already reduced* the result it hands over — so on an
 * unkeyed sheet that reduction spent its budget on a field covering half to three-quarters of the
 * image. The colours that come back are therefore coarser and shifted, whatever the digest does with
 * them afterwards: at a 32-colour budget the keyed and unkeyed digests of these eight sheets share
 * **none** of their six entries, on every one of the eight. So the offer is refused because the
 * answer would be *wrong*, not because it would be magenta. (Under the Wu cut alone, before the
 * rounds that refine it, they shared 4, 3, 1, 0, 0, 2, 4 and 1; the case asserts the count, since a
 * weaker "they differ" survives a palette builder moving them back most of the way.)
 *
 * All three halves are asserted, because only the set makes the refusal the right call rather than
 * an over-cautious one: the key leads neither digest, the keyed one carries no near-key colour, and
 * the two still disagree. Written against the whole corpus rather than `armour.png` alone, since the
 * claim is about what generated sheets are like and not about one of them.
 *
 * Run as two files, `identity-palette-key-first-half.test.ts` and `-second-half.test.ts`, each over
 * one of `CORPUS_HALVES`, so the two halves can take two workers.
 */

const {
  keyingEnabled: _enabled,
  keyTolerance: _tolerance,
  paletteSnap: _snap,
  ...TUNING
} = QUANTISE_DEFAULT_DIALS;
const KEY = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;
// A colour rather than `Rgba | null`: `BACKGROUND_KEY_COLORS` answers `null` for `TRANSPARENT`, and
// narrowing it here once beats a cast at every use.
if (KEY === null) throw new Error('MAGENTA_FF00FF names no colour');

/**
 * How far off the key a colour may sit and still be the key field.
 *
 * Per channel, and generous on purpose: what is being asserted is that the field survives as
 * *something recognisably magenta*, not that it lands on a particular shade. Measured across the
 * corpus the widest key spread is `#db02d9` to `#ef25f5`, which this comfortably contains, and no
 * subject colour on any of the eight comes near it — the keyed half of each case is what proves that.
 */
const NEAR_KEY = 48;

const nearTheKey = (hex: string): boolean => {
  const channels = [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
  const key: readonly number[] = [KEY.r, KEY.g, KEY.b];
  return channels.every((value, at) => Math.abs(value - (key[at] ?? 0)) <= NEAR_KEY);
};

/**
 * The reference sheet's keyed digest, which `quantisedSheetCapture`'s docblock quotes as its sample of
 * what the capture reads. A sample rather than a calibration, as that docblock says, but a stated
 * one: the palette builder moved every entry of it without anything failing.
 */
const ARMOUR_KEYED_DIGEST = ['#175B21', '#020302', '#A18445', '#0D3D14', '#F1DD98', '#E8B421'];

/**
 * The three keying positions this suite measures: off, a pass that ran at `0`, and the tab's default.
 */
const POSITIONS = {
  OFF: null,
  EXACT: { color: KEY, tolerance: 0 },
  DEFAULT: { color: KEY, tolerance: DEFAULT_KEY_TOLERANCE },
} as const satisfies Record<string, BackgroundKeying | null>;

type Position = keyof typeof POSITIONS;

/** One quantised result, with the settings that produced it — the pair the capture decides on. */
type Settled = { settings: QuantiseSettings; result: QuantiseResult };

/** What the tab is asking for at one of those positions. */
const settingsAt = (position: Position): QuantiseSettings => {
  const tuning: QuantiseTuning = TUNING;
  return {
    ...tuning,
    grid: 4,
    key: POSITIONS[position],
    reduction: { kind: 'MAX_COLORS', maxColors: 32 },
  };
};

export function identityPaletteKeySuite(sheets: readonly CorpusSheetName[]): void {
  describe('identityPalette on a quantised result', () => {
    let corpus: ReadonlyMap<CorpusSheetName, ImageData>;

    beforeAll(async () => {
      corpus = await loadCorpus(sheets);
    }, 300_000);

    /**
     * Each sheet quantised once per position, however many cases read it.
     *
     * The four cases below read the same three results of each sheet, and the quantisation is nearly
     * all of their cost: computed afresh per case, the suite ran each sheet through the pipeline seven
     * times rather than three, and was the second-slowest file in the gate. `quantiseImage` is pure, so a
     * shared result is the same result.
     */
    const settled = new Map<string, Settled>();

    const sheetNamed = (name: CorpusSheetName): ImageData => {
      const image = corpus.get(name);
      if (image === undefined) throw new Error(`${name} is missing from the corpus`);
      return image;
    };

    const settledAt = (name: CorpusSheetName, position: Position): Settled => {
      const known = settled.get(`${name} ${position}`);
      if (known !== undefined) return known;
      const settings = settingsAt(position);
      const fresh = { settings, result: quantiseImage(sheetNamed(name), settings) };
      settled.set(`${name} ${position}`, fresh);
      return fresh;
    };

    /** The identity palette of one sheet's quantised result, with the tab's keying on or off. */
    const paletteOf = (name: CorpusSheetName, keyed: boolean): readonly string[] =>
      identityPalette(settledAt(name, keyed ? 'DEFAULT' : 'OFF').result.image, KEY);

    /** What the studio's capture button would decide about one sheet at one keying position. */
    const offerFor = (name: CorpusSheetName, position: Position): string => {
      const settings = settingsAt(position);
      const source: ImportedImage = { name, image: sheetNamed(name) };
      return quantisedSheetCapture({
        source,
        grid: settings.grid,
        settled: settledAt(name, position),
        failed: false,
        keying: POSITIONS[position],
        reduction: settings.reduction,
        studioKey: KEY,
      }).kind;
    };

    it.each(sheets)(
      'leads %s with a subject colour even where the tab did not key it',
      (name) => {
        // The half that used to fail: an unkeyed result's field is a spread of near-magentas covering
        // most of the sheet, and the digest opened with one of them on all eight.
        expect(paletteOf(name, false).filter(nearTheKey)).toHaveLength(0);
      },
      300_000,
    );

    it.each(sheets)(
      'still answers differently for %s depending on whether the tab keyed it',
      (name) => {
        // What the refusal below is actually protecting: the tab reduced the result before handing it
        // over, and on an unkeyed sheet it spent that budget on the field. Six entries each, sharing
        // none — so an unkeyed offer would be a different palette, not merely a magenta one.
        const keyed = paletteOf(name, true);
        expect(paletteOf(name, false).filter((entry) => keyed.includes(entry))).toEqual([]);
      },
      300_000,
    );

    it.runIf(sheets.includes('armour.png'))(
      'reads the reference sheet’s keyed result as the capture’s docblock quotes it',
      () => {
        expect(paletteOf('armour.png', true)).toEqual(ARMOUR_KEYED_DIGEST);
      },
      300_000,
    );

    it.each(sheets)(
      'drops %s’s key when the tab keyed it',
      (name) => {
        expect(paletteOf(name, true).filter(nearTheKey)).toHaveLength(0);
      },
      300_000,
    );

    /**
     * The guard the two halves above justify, at the two positions that both look keyed to a check
     * written against the settings rather than against the pixels.
     *
     * The `0` rung is the one worth a case of its own: it is a keying pass that *ran*, so
     * `settings.key` is not `null`, and on a resampled sheet it removes only the handful of pixels
     * matching the key exactly. Measured over the corpus the border share is 1.000 there and with
     * keying off, against 0.000 at `DEFAULT_KEY_TOLERANCE` — which is what lets the offer be decided
     * by a threshold at all rather than by a fitted one.
     */
    it.each(sheets)(
      'refuses %s until the tab has actually taken the field out',
      (name) => {
        // The shares themselves, to the three places `IDENTITY_KEY_SURVIVAL_TOLERANCE` states them:
        // the outcomes below hold across a whole band of shares, and the docblock claims the extremes.
        const shareAt = (position: Position): string =>
          borderKeyShare(
            settledAt(name, position).result.image,
            POSITIONS.DEFAULT.color,
            IDENTITY_KEY_SURVIVAL_TOLERANCE,
          ).toFixed(3);
        expect([shareAt('OFF'), shareAt('EXACT'), shareAt('DEFAULT')]).toEqual(['1.000', '1.000', '0.000']);
        expect(offerFor(name, 'OFF')).toBe('UNAVAILABLE');
        expect(offerFor(name, 'EXACT')).toBe('UNAVAILABLE');
        expect(offerFor(name, 'DEFAULT')).toBe('READY');
      },
      600_000,
    );
  });
}
