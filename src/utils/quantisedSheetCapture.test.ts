import { describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../constants/backgroundKeyColors.ts';
import { IDENTITY_CAPTURE_UNAVAILABLE } from '../constants/identityCapture.ts';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import type {
  BackgroundKeying,
  ColorReduction,
  ImportedImage,
  QuantiseSettings,
} from '../types/quantiser.ts';
import { quantiseImage } from './quantiseImage.ts';
import { quantisedSheetCapture, type QuantisedSheetOffer } from './quantisedSheetCapture.ts';

const {
  keyingEnabled: _enabled,
  keyTolerance: _tolerance,
  paletteSnap: _snap,
  ...TUNING
} = QUANTISE_DEFAULT_DIALS;
const MAGENTA = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;
// A colour rather than `Rgba | null`: `BACKGROUND_KEY_COLORS` answers `null` for `TRANSPARENT`, and
// narrowing it here once beats a cast at every use.
if (MAGENTA === null) throw new Error('MAGENTA_FF00FF names no colour');
const WHITE = BACKGROUND_KEY_COLORS.PURE_WHITE;
if (WHITE === null) throw new Error('PURE_WHITE names no colour');
const CHARCOAL = { r: 30, g: 30, b: 36, a: 255 };

/**
 * A sheet on a magenta field, at its own pixel scale.
 *
 * Wider than it looks: the guard that decides whether the field survived reads the outer **border**,
 * so a fixture whose subject reaches an edge would be measuring something else. Here the subject sits
 * in the middle two rows and columns of a 12 × 8 sheet, which leaves the whole border on the key.
 */
const SHEET: ImportedImage = {
  name: 'accepted-sheet.png',
  image: imageFrom(12, 8, (x, y) => (x >= 4 && x <= 7 && y >= 3 && y <= 4 ? CHARCOAL : MAGENTA)),
};

const KEYED: BackgroundKeying = { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE };
const REDUCTION: ColorReduction = { kind: 'MAX_COLORS', maxColors: 8 };

/** The pipeline's real answer, so the shape under test is the one the store actually holds. */
function settledAt(key: BackgroundKeying | null, reduction: ColorReduction | null = REDUCTION) {
  const settings: QuantiseSettings = { ...TUNING, grid: 1, key, reduction };
  return { settings, result: quantiseImage(SHEET.image, settings) };
}

/** The offer the studio would build with the tab settled on {@link KEYED} and nothing since moved. */
function offer(patch: Partial<QuantisedSheetOffer> = {}): QuantisedSheetOffer {
  return {
    source: SHEET,
    grid: 1,
    settled: settledAt(KEYED),
    failed: false,
    keying: KEYED,
    reduction: REDUCTION,
    studioKey: MAGENTA,
    ...patch,
  };
}

const refused = (reason: string) => ({ kind: 'UNAVAILABLE', reason });

describe('quantisedSheetCapture', () => {
  it('offers the result rather than the sheet that was dropped', () => {
    const settled = settledAt(KEYED);

    expect(quantisedSheetCapture(offer({ settled }))).toEqual({
      kind: 'READY',
      // The name is the dropped file's, because that is what the confirmation names — but the pixels
      // are the transform's, which is the whole point of the route.
      sheet: { name: 'accepted-sheet.png', image: settled.result.image },
    });
  });

  it('refuses a tab holding no sheet', () => {
    expect(quantisedSheetCapture(offer({ source: null, settled: null, grid: null }))).toEqual(
      refused(IDENTITY_CAPTURE_UNAVAILABLE.noSheet),
    );
  });

  it('refuses a sheet with no scale in force', () => {
    expect(quantisedSheetCapture(offer({ grid: null }))).toEqual(
      refused(IDENTITY_CAPTURE_UNAVAILABLE.noResult),
    );
  });

  it('refuses a sheet the tab has produced no result for', () => {
    expect(quantisedSheetCapture(offer({ settled: null }))).toEqual(
      refused(IDENTITY_CAPTURE_UNAVAILABLE.noResult),
    );
  });

  it('names the failure rather than the missing scale when a transform failed', () => {
    expect(quantisedSheetCapture(offer({ settled: null, failed: true }))).toEqual(
      refused(IDENTITY_CAPTURE_UNAVAILABLE.failed),
    );
  });

  it('refuses a result the tab did not key, because the field would lead the palette', () => {
    expect(quantisedSheetCapture(offer({ settled: settledAt(null), keying: null }))).toEqual(
      refused(IDENTITY_CAPTURE_UNAVAILABLE.keyStillOn),
    );
  });

  it('refuses a result keyed at the ladder’s zero rung, where the pass removed almost nothing', () => {
    // The state a settings-only guard reports as keyed: `key` is non-null, the pass ran, and on a
    // sheet whose field drifts it took out only the pixels that matched the key exactly.
    const exact: BackgroundKeying = { color: MAGENTA, tolerance: 0 };
    const drifted: ImportedImage = {
      name: SHEET.name,
      image: imageFrom(12, 8, (x, y) =>
        x >= 4 && x <= 7 && y >= 3 && y <= 4 ? CHARCOAL : { r: 245, g: 3, b: 248, a: 255 },
      ),
    };
    const settings: QuantiseSettings = { ...TUNING, grid: 1, key: exact, reduction: REDUCTION };

    expect(
      quantisedSheetCapture(
        offer({
          source: drifted,
          settled: { settings, result: quantiseImage(drifted.image, settings) },
          keying: exact,
        }),
      ),
    ).toEqual(refused(IDENTITY_CAPTURE_UNAVAILABLE.keyStillOn));
  });

  it('offers a result whose field is not the studio’s key at all, which is the app’s blind spot', () => {
    // The studio names white while this sheet is on magenta, so keying ran and removed nothing —
    // and the guard cannot see it, because it measures the border against the key the app was told
    // about. Neither can `identityPalette`, which excludes white and writes the magenta into the
    // lock. Pinned as the limit it is: the studio's key is this app's only statement of what
    // background *is*, the file route takes it on the same faith, and nothing here can second-guess
    // it. The Quantise tab is where a reader sees that the field did not come out.
    const white: BackgroundKeying = { color: WHITE, tolerance: DEFAULT_KEY_TOLERANCE };

    expect(
      quantisedSheetCapture(offer({ settled: settledAt(white), keying: white, studioKey: WHITE })).kind,
    ).toBe('READY');
  });

  it('refuses a result computed before the studio’s key moved', () => {
    expect(quantisedSheetCapture(offer({ keying: null }))).toEqual(
      refused(IDENTITY_CAPTURE_UNAVAILABLE.stale),
    );
  });

  it('refuses a result computed before the studio’s colour setting moved', () => {
    expect(quantisedSheetCapture(offer({ reduction: { kind: 'MAX_COLORS', maxColors: 4 } }))).toEqual(
      refused(IDENTITY_CAPTURE_UNAVAILABLE.stale),
    );
  });

  it('accepts an unkeyed result where the studio names no key colour', () => {
    // `TRANSPARENT`: the tab's keying pass cannot run at all, so there is no colour to measure a
    // surviving field against and the sheet is taken at its word.
    expect(
      quantisedSheetCapture(offer({ settled: settledAt(null), keying: null, studioKey: null })).kind,
    ).toBe('READY');
  });
});
