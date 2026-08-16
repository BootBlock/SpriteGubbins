import { describe, expect, it } from 'vitest';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { sameQuantiseSettings } from './quantiseSettings.ts';

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 };
const BLACK = { r: 0, g: 0, b: 0, a: 255 };
const WHITE = { r: 255, g: 255, b: 255, a: 255 };

const BASE: QuantiseSettings = {
  grid: 8,
  key: { color: MAGENTA, tolerance: 32 },
  vote: 'DOMINANT',
  lineStrength: 1.5,
  trimStrength: 0,
  inkThreshold: 64,
  fillCleanup: 0,
  cleanupPasses: 1,
  colorMerge: 0,
  reduction: { kind: 'MAX_COLORS', maxColors: 32 },
};

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
      sameQuantiseSettings(BASE, {
        grid: 8,
        key: { color: { ...MAGENTA }, tolerance: 32 },
        vote: 'DOMINANT',
        lineStrength: 1.5,
        trimStrength: 0,
        inkThreshold: 64,
        fillCleanup: 0,
        cleanupPasses: 1,
        colorMerge: 0,
        reduction: { kind: 'MAX_COLORS', maxColors: 32 },
      }),
    ).toBe(true);
  });

  it('separates every field that changes the sheet', () => {
    expect(sameQuantiseSettings(BASE, { ...BASE, grid: 4 })).toBe(false);
    // The Downscale reading alone changes the sheet, and this comparison is what makes changing
    // the control recompute rather than re-caption a stale result.
    expect(sameQuantiseSettings(BASE, { ...BASE, vote: 'INK_WEIGHTED' })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, vote: 'K_CENTROID' })).toBe(false);
    // The two dials change the sheet too, and each alone must force a recompute.
    expect(sameQuantiseSettings(BASE, { ...BASE, lineStrength: 2.5 })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, fillCleanup: 32 })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, colorMerge: 24 })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, trimStrength: 1 })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, inkThreshold: 80 })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, cleanupPasses: 2 })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, key: { color: MAGENTA, tolerance: 64 } })).toBe(false);
    expect(
      sameQuantiseSettings(BASE, { ...BASE, key: { color: { ...MAGENTA, g: 40 }, tolerance: 32 } }),
    ).toBe(false);
    expect(
      sameQuantiseSettings(BASE, {
        ...BASE,
        vote: 'DOMINANT',
        lineStrength: 1.5,
        trimStrength: 0,
        inkThreshold: 64,
        fillCleanup: 0,
        cleanupPasses: 1,
        colorMerge: 0,
        reduction: { kind: 'MAX_COLORS', maxColors: 64 },
      }),
    ).toBe(false);
  });

  it('separates keying that runs from keying that does not', () => {
    // `null` is the pass being skipped entirely, which is a different sheet from any tolerance around
    // any colour — including a tolerance of zero.
    expect(sameQuantiseSettings(BASE, { ...BASE, key: null })).toBe(false);
    expect(sameQuantiseSettings({ ...BASE, key: null }, { ...BASE, key: null })).toBe(true);
  });

  it('separates the three kinds of colour reduction from each other and from none', () => {
    // A budget, a pinned palette and a channel depth are three different instructions, and
    // `UNRESTRICTED` is the palette step not running at all. None of them is a variant of another, so
    // moving between any two has to count as a change.
    const budget: QuantiseSettings = BASE;
    const pinned: QuantiseSettings = {
      ...BASE,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      colorMerge: 0,
      reduction: { kind: 'PALETTE', entries: [BLACK, WHITE] },
    };
    const depth: QuantiseSettings = {
      ...BASE,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      colorMerge: 0,
      reduction: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 3 },
    };
    const none: QuantiseSettings = {
      ...BASE,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      colorMerge: 0,
      reduction: null,
    };

    for (const [left, right] of [
      [budget, pinned],
      [budget, depth],
      [budget, none],
      [pinned, depth],
      [pinned, none],
      [depth, none],
    ] as const) {
      expect(sameQuantiseSettings(left, right)).toBe(false);
    }

    expect(
      sameQuantiseSettings(none, {
        ...BASE,
        vote: 'DOMINANT',
        lineStrength: 1.5,
        trimStrength: 0,
        inkThreshold: 64,
        fillCleanup: 0,
        cleanupPasses: 1,
        colorMerge: 0,
        reduction: null,
      }),
    ).toBe(true);
    expect(
      sameQuantiseSettings(depth, {
        ...BASE,
        vote: 'DOMINANT',
        lineStrength: 1.5,
        trimStrength: 0,
        inkThreshold: 64,
        fillCleanup: 0,
        cleanupPasses: 1,
        colorMerge: 0,
        reduction: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 3 },
      }),
    ).toBe(true);
  });

  it('compares a pinned palette by its colours, in order', () => {
    // Two palettes of the same length holding the same colours in a different order are not the same
    // palette: `nearestColor` breaks a tie on the earliest entry, so the order decides the sheet.
    const pinned: QuantiseSettings = {
      ...BASE,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      colorMerge: 0,
      reduction: { kind: 'PALETTE', entries: [BLACK, WHITE] },
    };

    expect(
      sameQuantiseSettings(pinned, {
        ...BASE,
        vote: 'DOMINANT',
        lineStrength: 1.5,
        trimStrength: 0,
        inkThreshold: 64,
        fillCleanup: 0,
        cleanupPasses: 1,
        colorMerge: 0,
        reduction: { kind: 'PALETTE', entries: [{ ...BLACK }, WHITE] },
      }),
    ).toBe(true);
    expect(
      sameQuantiseSettings(pinned, {
        ...BASE,
        vote: 'DOMINANT',
        lineStrength: 1.5,
        trimStrength: 0,
        inkThreshold: 64,
        fillCleanup: 0,
        cleanupPasses: 1,
        colorMerge: 0,
        reduction: { kind: 'PALETTE', entries: [WHITE, BLACK] },
      }),
    ).toBe(false);
    expect(
      sameQuantiseSettings(pinned, {
        ...BASE,
        vote: 'DOMINANT',
        lineStrength: 1.5,
        trimStrength: 0,
        inkThreshold: 64,
        fillCleanup: 0,
        cleanupPasses: 1,
        colorMerge: 0,
        reduction: { kind: 'PALETTE', entries: [BLACK] },
      }),
    ).toBe(false);
  });
});
