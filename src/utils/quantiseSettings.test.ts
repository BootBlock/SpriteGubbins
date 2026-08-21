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
  spriteGap: 1,
  symmetry: 'OFF' as const,
  symmetryTolerance: 8,
  symmetryConfidence: 90,
  dither: 'NONE',
  outlineExpansion: 0,
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
        spriteGap: 1,
        symmetry: 'OFF' as const,
        symmetryTolerance: 8,
        symmetryConfidence: 90,
        dither: 'NONE',
        outlineExpansion: 0,
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
    // The dither moves the whole palette step as well as patterning the result, so a change of
    // pattern is as much a different sheet as a change of reading is — and without this arm nothing
    // would catch its comparison being dropped, which presents as a stale result behind a spinner
    // that never clears.
    expect(sameQuantiseSettings(BASE, { ...BASE, dither: 'BAYER_8' })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, dither: 'BLUE_NOISE' })).toBe(false);
    // The sprite gap is the one dial on this shape that changes no pixel of the result — it changes
    // the *reading* of it that travels back with the pixels. So this arm is the only thing making a
    // sheet re-read when it moves: without it the tab would keep the previous segmentation, and the
    // count beside a gap the reader had just changed would be the count for the gap before it.
    expect(sameQuantiseSettings(BASE, { ...BASE, spriteGap: 4 })).toBe(false);
    // The three symmetry dials, for the same reason and one step further: the mode decides whether
    // a reading is taken at all, the tolerance decides what that reading says, and the floor decides
    // whether the pass then rewrites the artwork. Without these arms a sheet snapped at one floor
    // would stay on screen while the panel described another.
    expect(sameQuantiseSettings(BASE, { ...BASE, symmetry: 'CHECK' })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, symmetry: 'SNAP' })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, symmetryTolerance: 24 })).toBe(false);
    expect(sameQuantiseSettings(BASE, { ...BASE, symmetryConfidence: 75 })).toBe(false);
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
        spriteGap: 1,
        symmetry: 'OFF' as const,
        symmetryTolerance: 8,
        symmetryConfidence: 90,
        dither: 'NONE',
        outlineExpansion: 0,
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
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      dither: 'NONE',
      outlineExpansion: 0,
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
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      dither: 'NONE',
      outlineExpansion: 0,
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
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      dither: 'NONE',
      outlineExpansion: 0,
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
        spriteGap: 1,
        symmetry: 'OFF' as const,
        symmetryTolerance: 8,
        symmetryConfidence: 90,
        dither: 'NONE',
        outlineExpansion: 0,
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
        spriteGap: 1,
        symmetry: 'OFF' as const,
        symmetryTolerance: 8,
        symmetryConfidence: 90,
        dither: 'NONE',
        outlineExpansion: 0,
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
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      dither: 'NONE',
      outlineExpansion: 0,
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
        spriteGap: 1,
        symmetry: 'OFF' as const,
        symmetryTolerance: 8,
        symmetryConfidence: 90,
        dither: 'NONE',
        outlineExpansion: 0,
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
        spriteGap: 1,
        symmetry: 'OFF' as const,
        symmetryTolerance: 8,
        symmetryConfidence: 90,
        dither: 'NONE',
        outlineExpansion: 0,
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
        spriteGap: 1,
        symmetry: 'OFF' as const,
        symmetryTolerance: 8,
        symmetryConfidence: 90,
        dither: 'NONE',
        outlineExpansion: 0,
        colorMerge: 0,
        reduction: { kind: 'PALETTE', entries: [BLACK] },
      }),
    ).toBe(false);
  });
});

/**
 * The locked-palette arm, which is the one reduction carrying a dial inside it.
 *
 * The other three are described entirely by their kind and one number or list. A lock's snap
 * distance decides which of this sheet's colours the entries are applied to at all, so a comparison
 * that ignored it would file the answer to one question against another — the tab would settle, and
 * show a sheet snapped at a distance the reader had already moved off.
 */
describe('sameQuantiseSettings — a locked palette', () => {
  const ENTRIES = [BLACK, WHITE];

  it('holds for two separately-built copies of one lock', () => {
    expect(
      sameQuantiseSettings(
        { ...BASE, reduction: { kind: 'LOCKED', entries: ENTRIES, snap: 20 } },
        { ...BASE, reduction: { kind: 'LOCKED', entries: [{ ...BLACK }, { ...WHITE }], snap: 20 } },
      ),
    ).toBe(true);
  });

  it('fails on a moved snap distance, which is a different sheet', () => {
    expect(
      sameQuantiseSettings(
        { ...BASE, reduction: { kind: 'LOCKED', entries: ENTRIES, snap: 20 } },
        { ...BASE, reduction: { kind: 'LOCKED', entries: ENTRIES, snap: 21 } },
      ),
    ).toBe(false);
  });

  it('fails on different colours, and on a lock against a pinned palette holding the same ones', () => {
    expect(
      sameQuantiseSettings(
        { ...BASE, reduction: { kind: 'LOCKED', entries: ENTRIES, snap: 20 } },
        { ...BASE, reduction: { kind: 'LOCKED', entries: [WHITE, BLACK], snap: 20 } },
      ),
    ).toBe(false);
    expect(
      sameQuantiseSettings(
        { ...BASE, reduction: { kind: 'LOCKED', entries: ENTRIES, snap: 20 } },
        { ...BASE, reduction: { kind: 'PALETTE', entries: ENTRIES } },
      ),
    ).toBe(false);
  });
});
