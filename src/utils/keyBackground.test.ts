import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { keyBackground } from './keyBackground.ts';

/**
 * The key colour these fixtures are built around — the recommended `MAGENTA_FF00FF`.
 *
 * Written out rather than read from `BACKGROUND_KEY_COLORS`, because nothing below is asserting *which*
 * colour that map holds: the transform takes whatever key it is handed, and the distances the fixtures
 * are chosen for are what the cases turn on.
 */
const MAGENTA: Rgba = { r: 255, g: 0, b: 255, a: 255 };

/** What a keyed pixel reads as. Canonical, not the original RGB at zero alpha — see the case for it. */
const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** Nowhere near magenta on any channel, so it is outside both the field and the fringe threshold. */
const ART: Rgba = { r: 20, g: 180, b: 60, a: 255 };

/**
 * A magenta the generator got *nearly* right: 8.7 away from the key, so tolerance 16 admits it and
 * tolerance 0 does not. This is the ordinary case the whole feature exists for.
 */
const DRIFTED: Rgba = { r: 250, g: 5, b: 250, a: 255 };

/**
 * A pixel on an anti-aliased edge: 46.8 from the key, so it is outside any tolerance tight enough to
 * be safe and inside `tolerance × FRINGE_TOLERANCE_FACTOR` at 16. Only the geometry decides its fate.
 */
const BLEND: Rgba = { r: 228, g: 27, b: 228, a: 255 };

/** Every channel of every pixel, as a keyed pixel must read: `{0, 0, 0, 0}`, not RGB at zero alpha. */
function allZero(pixels: number): number[] {
  return Array.from({ length: pixels * 4 }, () => 0);
}

/** A single row, which is enough to state everything about a one-pixel-deep erosion. */
function row(...pixels: readonly Rgba[]): ImageData {
  return imageFrom(pixels.length, 1, (x) => pixels[x] ?? ART);
}

describe('keyBackground', () => {
  it('keys a field the generator drifted off the colour it was asked for', () => {
    // The failure that prompted the feature: a sheet whose background is visibly magenta and almost
    // nowhere actually #FF00FF. An exact match returns it untouched, which is the second assertion.
    const drifted = imageFrom(4, 4, () => DRIFTED);

    const loose = keyBackground(drifted, { color: MAGENTA, tolerance: 16 });
    expect(loose.keyedPixels).toBe(16);
    expect(channels(loose.image)).toEqual(allZero(16));

    const exact = keyBackground(drifted, { color: MAGENTA, tolerance: 0 });
    expect(exact.keyedPixels).toBe(0);
    expect(channels(exact.image)).toEqual(channels(drifted));
  });

  it('keys an exact field at tolerance 0, which is what that setting means', () => {
    const field = imageFrom(2, 2, () => MAGENTA);

    const result = keyBackground(field, { color: MAGENTA, tolerance: 0 });

    expect(result.keyedPixels).toBe(4);
    expect(channels(result.image)).toEqual(allZero(4));
  });

  it('writes a keyed pixel as {0, 0, 0, 0}, whatever colour it was', () => {
    // Not tidiness. `alignToGrid` votes on the *packed RGBA*, so transparent pixels that kept their
    // own RGB are still distinct colours to it — and collapsing the field to one value before that
    // vote is the entire reason `quantiseImage` runs this first.
    const varied = imageFrom(8, 8, (x, y) => ({ r: 255 - x, g: y, b: 255 - y, a: 255 }));

    const result = keyBackground(varied, { color: MAGENTA, tolerance: 16 });

    expect(result.keyedPixels).toBe(64);
    expect(channels(result.image)).toEqual(allZero(64));
  });

  it('canonicalises a pixel that arrived transparent carrying junk under its alpha', () => {
    const junk = row({ r: 100, g: 120, b: 140, a: 0 });

    const result = keyBackground(junk, { color: MAGENTA, tolerance: 16 });

    // Transparent already, so it is not *keyed* — but it is normalised, for the reason above.
    expect(result.keyedPixels).toBe(0);
    expect(channels(result.image)).toEqual(allZero(1));
  });

  it('erodes the fringe exactly one pixel deep, and does not cascade past it', () => {
    // [field] [blend] [blend] [art] [art]
    //
    // The first blend touches the field and goes. The second touches only the *first blend* — which is
    // not field — so it stays, even though its colour is identical. That is the bound: pass 2 reads
    // pass 1's mask, never its own output, so the same rule applied to its own results (a flood fill
    // that would walk down a gradient until the sprite ran out) cannot happen.
    const sheet = row(MAGENTA, BLEND, BLEND, ART, ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: 16 });

    expect(result.keyedPixels).toBe(2);
    expect(channels(result.image)).toEqual(channels(row(TRANSPARENT, TRANSPARENT, BLEND, ART, ART)));
  });

  it('leaves a blend-coloured pixel alone where it touches no field', () => {
    // [field] [art] [blend] [art] [art]
    //
    // The blend is well inside the fringe threshold by colour and is untouched, because nothing beside
    // it is background. This is what makes the wider threshold safe: applied everywhere it would
    // swallow a genuinely magenta-ish sprite colour, and applied at the boundary it cannot.
    const sheet = row(MAGENTA, ART, BLEND, ART, ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: 16 });

    expect(result.keyedPixels).toBe(1);
    expect(channels(result.image)).toEqual(channels(row(TRANSPARENT, ART, BLEND, ART, ART)));
  });

  it('runs no fringe pass at tolerance 0, because a zero-radius fringe holds only exact matches', () => {
    const sheet = row(MAGENTA, BLEND, ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: 0 });

    expect(result.keyedPixels).toBe(1);
    expect(channels(result.image)).toEqual(channels(row(TRANSPARENT, BLEND, ART)));
  });

  it('does not let a row wrap onto the one above it when deciding adjacency', () => {
    // Two rows, the field at the end of the first and a blend at the start of the second. They are
    // neighbours in the flat channel array and not in the image, so the blend must survive — a missing
    // bounds check erodes a stripe down the opposite margin of every sheet.
    const sheet = imageFrom(2, 2, (x, y) => (x === 1 && y === 0 ? MAGENTA : BLEND));

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: 16 });

    // The field pixel itself, plus the two that genuinely touch it: below it, and to its left.
    expect(result.keyedPixels).toBe(3);
    // Bottom-left is the one at neither — diagonal to the field, and 4-adjacency excludes corners.
    expect(channels(result.image)).toEqual(
      channels(imageFrom(2, 2, (x, y) => (x === 0 && y === 1 ? BLEND : TRANSPARENT))),
    );
  });

  it('counts only what it removed, not what arrived empty', () => {
    // A sheet that came back with real alpha of its own would otherwise inflate the share with area
    // the key never touched — and the share exists to answer whether the *key* matched.
    const sheet = row({ r: 0, g: 0, b: 0, a: 0 }, MAGENTA, ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: 16 });

    expect(result.keyedPixels).toBe(1);
  });
});
