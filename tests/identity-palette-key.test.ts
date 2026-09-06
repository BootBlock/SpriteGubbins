import { beforeAll, describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../src/constants/backgroundKeyColors.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import type {
  BackgroundKeying,
  ImportedImage,
  QuantiseSettings,
  QuantiseTuning,
} from '../src/types/quantiser.ts';
import { identityPalette } from '../src/utils/identityPalette.ts';
import { quantisedSheetCapture } from '../src/utils/quantisedSheetCapture.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { CORPUS_SHEETS, loadCorpus, type CorpusSheetName } from './sheetCorpus.ts';

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
 * between **0 and 4** of their six entries, and on `cyborg_monk.png` they share none at all. So the
 * offer is refused because the answer would be *wrong*, not because it would be magenta.
 *
 * All three halves are asserted, because only the set makes the refusal the right call rather than
 * an over-cautious one: the key leads neither digest, the keyed one carries no near-key colour, and
 * the two still disagree. Written against the whole corpus rather than `armour.png` alone, since the
 * claim is about what generated sheets are like and not about one of them.
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

/** What the tab is asking for, at one of the three keying positions this file measures. */
const settingsAt = (key: BackgroundKeying | null): QuantiseSettings => {
  const tuning: QuantiseTuning = TUNING;
  return { ...tuning, grid: 4, key, reduction: { kind: 'MAX_COLORS', maxColors: 32 } };
};

/** The identity palette of one sheet's quantised result, with the tab's keying on or off. */
const paletteOf = (image: ImageData, keyed: boolean): readonly string[] => {
  const settings = settingsAt(keyed ? { color: KEY, tolerance: DEFAULT_KEY_TOLERANCE } : null);
  return identityPalette(quantiseImage(image, settings).image, KEY);
};

/** What the studio's capture button would decide about one sheet at one keying position. */
const offerFor = (name: string, image: ImageData, key: BackgroundKeying | null): string => {
  const settings = settingsAt(key);
  const source: ImportedImage = { name, image };
  return quantisedSheetCapture({
    source,
    grid: settings.grid,
    settled: { settings, result: quantiseImage(image, settings) },
    failed: false,
    keying: key,
    reduction: settings.reduction,
    studioKey: KEY,
  }).kind;
};

describe('identityPalette on a quantised result', () => {
  let corpus: ReadonlyMap<CorpusSheetName, ImageData>;

  beforeAll(async () => {
    corpus = await loadCorpus();
  }, 300_000);

  it.each(CORPUS_SHEETS)(
    'leads %s with a subject colour even where the tab did not key it',
    (name) => {
      const image = corpus.get(name);
      expect(image).toBeDefined();
      if (image === undefined) return;

      // The half that used to fail: an unkeyed result's field is a spread of near-magentas covering
      // most of the sheet, and the digest opened with one of them on all eight.
      expect(paletteOf(image, false).filter(nearTheKey)).toHaveLength(0);
    },
    300_000,
  );

  it.each(CORPUS_SHEETS)(
    'still answers differently for %s depending on whether the tab keyed it',
    (name) => {
      const image = corpus.get(name);
      expect(image).toBeDefined();
      if (image === undefined) return;

      // What the refusal below is actually protecting: the tab reduced the result before handing it
      // over, and on an unkeyed sheet it spent that budget on the field. Six entries each, sharing
      // between none and four — so an unkeyed offer would be a different palette, not merely a
      // magenta one.
      expect(paletteOf(image, false)).not.toEqual(paletteOf(image, true));
    },
    300_000,
  );

  it.each(CORPUS_SHEETS)(
    'drops %s’s key when the tab keyed it',
    (name) => {
      const image = corpus.get(name);
      expect(image).toBeDefined();
      if (image === undefined) return;

      expect(paletteOf(image, true).filter(nearTheKey)).toHaveLength(0);
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
  it.each(CORPUS_SHEETS)(
    'refuses %s until the tab has actually taken the field out',
    (name) => {
      const image = corpus.get(name);
      expect(image).toBeDefined();
      if (image === undefined) return;

      expect(offerFor(name, image, null)).toBe('UNAVAILABLE');
      expect(offerFor(name, image, { color: KEY, tolerance: 0 })).toBe('UNAVAILABLE');
      expect(offerFor(name, image, { color: KEY, tolerance: DEFAULT_KEY_TOLERANCE })).toBe('READY');
    },
    600_000,
  );
});
