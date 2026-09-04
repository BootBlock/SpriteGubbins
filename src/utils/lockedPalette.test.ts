import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { colorHistogram, packColor, readPixel } from './imageData.ts';
import { applyLockedPalette } from './lockedPalette.ts';
import { srgbToOklab } from './oklab.ts';

const RED: Rgba = { r: 200, g: 40, b: 40, a: 255 };
const GREEN: Rgba = { r: 40, g: 160, b: 60, a: 255 };
const BLUE: Rgba = { r: 40, g: 60, b: 200, a: 255 };

/** Twelve red, six green, two blue — plus the same green at two partial coverages, and a keyed field. */
const SHEET = imageFrom(6, 4, (x, y) => {
  const n = y * 6 + x;
  if (n < 12) return RED;
  if (n === 12) return { ...GREEN, a: 128 };
  if (n === 13) return { ...GREEN, a: 20 };
  if (n < 20) return GREEN;
  if (n < 22) return BLUE;
  return { r: 255, g: 0, b: 255, a: 0 };
});

describe('applyLockedPalette', () => {
  const ENTRIES = [RED, GREEN, BLUE];

  it('draws the sheet in the locked colours alone where every colour is within reach', () => {
    const drifted = imageFrom(4, 4, (x, y) => ({
      r: RED.r - x * 3,
      g: RED.g + y * 3,
      b: RED.b + x,
      a: 255,
    }));

    const applied = applyLockedPalette(drifted, ENTRIES, 20);

    const allowed = new Set(ENTRIES.map(packColor));
    for (const key of colorHistogram(applied).keys()) {
      expect(allowed.has(key), `${String(key)} is not a locked colour`).toBe(true);
    }
  });

  it('keeps each pixel its own coverage rather than the entry it was snapped to', () => {
    const soft = imageFrom(2, 1, (x) => ({
      r: GREEN.r + 4,
      g: GREEN.g - 4,
      b: GREEN.b,
      a: x === 0 ? 255 : 96,
    }));

    const applied = applyLockedPalette(soft, ENTRIES, 20);

    expect(readPixel(applied.data, 0)).toEqual(GREEN);
    expect(readPixel(applied.data, 4)).toEqual({ ...GREEN, a: 96 });
  });

  it('keeps a colour further than the snap distance from every entry exactly as it was', () => {
    // A saturated cyan the locked sheet never held. Its nearest entry is far enough to sit outside
    // the lock's reach, while the near-red beside it is taken at the same setting.
    const gem: Rgba = { r: 34, g: 211, b: 238, a: 255 };
    const nearlyRed: Rgba = { r: 197, g: 44, b: 38, a: 255 };
    const sheet = imageFrom(2, 1, (x) => (x === 0 ? gem : nearlyRed));

    const applied = applyLockedPalette(sheet, ENTRIES, 20);

    expect(readPixel(applied.data, 0)).toEqual(gem);
    expect(readPixel(applied.data, 4)).toEqual(RED);
  });

  it('reaches nothing at all at a snap distance of zero', () => {
    // The dial's off position, and it means what off means on every other dial in this tab: the
    // pass does not run, so the sheet comes through exactly as its own reading made it.
    const drifted = imageFrom(2, 1, (x) => ({ r: RED.r - x, g: RED.g, b: RED.b, a: 255 }));

    expect(channels(applyLockedPalette(drifted, ENTRIES, 0))).toEqual(channels(drifted));
  });

  it('leaves fully transparent pixels byte for byte as it found them', () => {
    const applied = applyLockedPalette(SHEET, ENTRIES, 20);

    // The keyed field still carries the magenta it was keyed from — a pixel with no coverage has no
    // colour to snap, exactly as it has none to lock.
    expect(readPixel(applied.data, 22 * 4)).toEqual({ r: 255, g: 0, b: 255, a: 0 });
  });

  it('chooses the perceptually nearest entry, not the one the RGB cube calls nearest', () => {
    // The whole claim of measuring in OKLab, as a case where the two answers differ. Both facts are
    // asserted rather than assumed, so the fixture cannot quietly stop being a divergent one.
    const color: Rgba = { r: 64, g: 208, b: 0, a: 255 };
    const rgbNearest: Rgba = { r: 48, g: 144, b: 80, a: 255 };
    const perceptuallyNearest: Rgba = { r: 224, g: 224, b: 32, a: 255 };

    expect(rgbDistance(color, rgbNearest)).toBeLessThan(rgbDistance(color, perceptuallyNearest));
    expect(oklabDistance(color, perceptuallyNearest)).toBeLessThan(oklabDistance(color, rgbNearest));

    const applied = applyLockedPalette(
      imageFrom(1, 1, () => color),
      [rgbNearest, perceptuallyNearest],
      64,
    );

    expect(readPixel(applied.data, 0)).toEqual(perceptuallyNearest);
  });
});

function rgbDistance(left: Rgba, right: Rgba): number {
  return Math.hypot(left.r - right.r, left.g - right.g, left.b - right.b);
}

function oklabDistance(left: Rgba, right: Rgba): number {
  const a = srgbToOklab(left.r, left.g, left.b);
  const b = srgbToOklab(right.r, right.g, right.b);
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}
