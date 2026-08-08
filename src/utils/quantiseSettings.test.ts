import { describe, expect, it } from 'vitest';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { sameQuantiseSettings } from './quantiseSettings.ts';

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 };

const BASE: QuantiseSettings = { grid: 8, key: { color: MAGENTA, tolerance: 32 }, maxColors: 32 };

/**
 * What the worker's answers are filed against.
 *
 * Getting this wrong is visible in one of two ways and neither is subtle: too strict and the tab
 * shows a spinner that never stops, because no answer ever matches the question; too loose and it
 * shows a sheet computed for settings the user has already moved on from.
 */
describe('sameQuantiseSettings', () => {
  it('holds for two separately-built copies of the same settings', () => {
    // The case reference equality would get wrong. Both sides come from one `useMemo` in one hook and
    // would usually *be* the same object — usually is not a guarantee React makes about a memo.
    expect(
      sameQuantiseSettings(BASE, { grid: 8, key: { color: { ...MAGENTA }, tolerance: 32 }, maxColors: 32 }),
    ).toBe(true);
  });

  it('separates every field that changes the sheet', () => {
    expect(sameQuantiseSettings(BASE, { ...BASE, grid: 4 })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, maxColors: 64 })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, key: { color: MAGENTA, tolerance: 64 } })).toBe(false);
    expect(
      sameQuantiseSettings(BASE, { ...BASE, key: { color: { ...MAGENTA, g: 40 }, tolerance: 32 } }),
    ).toBe(false);
  });

  it('separates keying that runs from keying that does not', () => {
    // `null` is the pass being skipped entirely, which is a different sheet from any tolerance around
    // any colour — including a tolerance of zero.
    expect(sameQuantiseSettings(BASE, { ...BASE, key: null })).toBe(false);
    expect(sameQuantiseSettings({ ...BASE, key: null }, { ...BASE, key: null })).toBe(true);
  });

  it('ignores the one thing that is a colour budget rather than a colour', () => {
    // `maxColors: null` is `UNRESTRICTED` — the palette step not running — and it has to compare equal
    // to itself rather than falling foul of a nullish check written for the key.
    expect(sameQuantiseSettings({ ...BASE, maxColors: null }, { ...BASE, maxColors: null })).toBe(true);
    expect(sameQuantiseSettings({ ...BASE, maxColors: null }, BASE)).toBe(false);
  });
});
