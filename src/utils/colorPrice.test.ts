import { describe, expect, it, vi } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { imageFrom, soften } from '../test/images.ts';
import type { TuneReading, TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { candidateReader } from './candidateReader.ts';
import { colorPrice } from './colorPrice.ts';
import { tuneCrop } from './tuneCrop.ts';
import { tunedDialsOf } from './tuneStage.ts';
import { upscaleNearest } from './upscaleNearest.ts';

const GRID = 4;

const SETTINGS: QuantiseSettings = { ...QUANTISE_DEFAULT_DIALS, grid: GRID, key: null, reduction: null };

/** Four fills and a dark contour, drawn at a scale of 4 and softened, so the readings differ. */
const SHEET = soften(
  upscaleNearest(
    imageFrom(24, 24, (x, y) => {
      if (x === 11) return { r: 14, g: 12, b: 18, a: 255 };
      if (y < 12) return x < 11 ? { r: 60, g: 90, b: 150, a: 255 } : { r: 180, g: 110, b: 70, a: 255 };
      return x < 11 ? { r: 90, g: 160, b: 80, a: 255 } : { r: 230, g: 210, b: 120, a: 255 };
    }),
    GRID,
  ),
);

/** A reader steered by the outline expansion alone, so each frontier below is written out whole. */
const steered =
  (table: Readonly<Record<number, TuneReading>>) =>
  (dials: TunedDials): TuneReading =>
    table[dials.outlineExpansion] ?? { colors: 1000, fidelity: 0 };

describe('colorPrice', () => {
  it('prices a colour at the slope of the chord across the frontier', () => {
    // Cheapest 10 colours at 0.5, most faithful 110 at 0.9: 0.4 of a likeness over 100 colours.
    const read = steered({
      0: { colors: 110, fidelity: 0.9 },
      1: { colors: 60, fidelity: 0.85 },
      2: { colors: 30, fidelity: 0.7 },
      3: { colors: 10, fidelity: 0.5 },
      4: { colors: 80, fidelity: 0.6 },
    });

    const price = colorPrice([], SETTINGS, read);

    expect(price.perColor).toBeCloseTo(0.004, 10);
    expect(price.positions).toBe(15);
  });

  it('ignores a candidate another beats on both counts', () => {
    // A dominated candidate cheaper than the frontier's most faithful end, and one dearer than it:
    // neither may become an end of the chord.
    const ends = { 0: { colors: 110, fidelity: 0.9 }, 3: { colors: 10, fidelity: 0.5 } };
    const dominated = { 1: { colors: 100, fidelity: 0.2 }, 2: { colors: 200, fidelity: 0.1 } };

    expect(colorPrice([], SETTINGS, steered({ ...ends, ...dominated })).perColor).toBeCloseTo(0.004, 10);
  });

  it('is free where the readings offer no trade', () => {
    // Every candidate spends the same colours.
    expect(colorPrice([], SETTINGS, () => ({ colors: 16, fidelity: 0.7 })).perColor).toBe(0);
    // One candidate beats every other on both counts.
    const dominant = steered({
      0: { colors: 10, fidelity: 0.9 },
      1: { colors: 20, fidelity: 0.8 },
      2: { colors: 30, fidelity: 0.7 },
      3: { colors: 40, fidelity: 0.6 },
      4: { colors: 50, fidelity: 0.5 },
    });
    expect(colorPrice([], SETTINGS, dominant).perColor).toBe(0);
  });

  it('reads the tab’s opening dials, not the reader’s', () => {
    // So a second press from where the first ended is charged the same price.
    const reader: QuantiseSettings = { ...SETTINGS, colorMerge: 48, fillCleanup: 40, lineStrength: 4 };
    const read = vi.fn((dials: TunedDials): TuneReading => ({
      colors: 10 + dials.outlineExpansion,
      fidelity: 0.5,
    }));

    colorPrice([], reader, read);

    const opening = tunedDialsOf(QUANTISE_DEFAULT_DIALS);
    expect(read).toHaveBeenCalledTimes(15);
    for (const [dials] of read.mock.calls) {
      expect({ ...dials, vote: opening.vote, outlineExpansion: opening.outlineExpansion }).toEqual(opening);
    }
  });

  it('reads the sheet without the reader’s colour reduction', () => {
    // A budget pins every reading to within a fraction of a colour of the others, so the price is
    // read from the artwork as it would be with none.
    const crops = [tuneCrop(SHEET, SETTINGS)];
    const budgeted: QuantiseSettings = { ...SETTINGS, reduction: { kind: 'MAX_COLORS', maxColors: 2 } };
    const sweepsOwn = vi.fn((): TuneReading => ({ colors: 2, fidelity: 0.5 }));

    const price = colorPrice(crops, budgeted, sweepsOwn);

    expect(sweepsOwn).not.toHaveBeenCalled();
    expect(price).toEqual(colorPrice(crops, SETTINGS, candidateReader(crops, SETTINGS)));
    expect(price.perColor).toBeGreaterThan(0);
  });
});
