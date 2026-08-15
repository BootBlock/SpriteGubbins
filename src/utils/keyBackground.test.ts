import { describe, expect, it } from 'vitest';
import { DEFAULT_KEY_TOLERANCE, KEY_TOLERANCES } from '../constants/quantiser.ts';
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

/** Nowhere near magenta in hue or lightness, so it is outside both the field and the fringe threshold. */
const ART: Rgba = { r: 20, g: 180, b: 60, a: 255 };

/**
 * A magenta the generator got *nearly* right: 4.3 away from the key, so tolerance 16 admits it and
 * tolerance 0 does not. This is the ordinary case the whole feature exists for.
 */
const DRIFTED: Rgba = { r: 250, g: 5, b: 250, a: 255 };

/**
 * A magenta field the generator **painted** rather than filled — the case that prompted the metric.
 *
 * 99 from the key in a straight line and 50 once the key's own shading and washing are discounted. So
 * the default tolerance takes it — where measured straight it shared the ladder's top rung with rose
 * and purple at 127, and no setting that reached it could have spared those.
 */
const PAINTED: Rgba = { r: 196, g: 27, b: 180, a: 255 };

/**
 * A pixel on an anti-aliased edge: 23.4 from the key, so it is outside any tolerance tight enough to
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

  it('keys a field the generator painted, at the tolerance the tab opens with', () => {
    // The reported failure: a sheet whose background was *visibly* magenta throughout came back with
    // most of the field gone and blotches of it left behind, because measured in a straight line the
    // blotches sat on the same rung of the ladder as rose and purple — so the setting that would have
    // taken them was a setting that would have taken the sprite. Nothing here is a special case for
    // that colour; the distance simply stopped charging full price for a field shaded and washed.
    const painted = imageFrom(4, 4, () => PAINTED);

    const result = keyBackground(painted, { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE });

    expect(result.keyedPixels).toBe(16);
    expect(channels(result.image)).toEqual(allZero(16));
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

  it('does not erode the sprite’s contour at the top of the tolerance ladder', () => {
    // The fringe threshold is a multiple of the tolerance, and a multiple with nothing above it runs
    // off the end of the scale: at 128 it reached 384, where the furthest any two colours can be
    // apart is 441. So the loosest settings quietly took a pixel off *every* silhouette touching the
    // field, whatever colour it was, while the panel described a one-pixel edge clean-up.
    const sheet = row(MAGENTA, ART, ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: Math.max(...KEY_TOLERANCES) });

    expect(result.keyedPixels).toBe(1);
    expect(channels(result.image)).toEqual(channels(row(TRANSPARENT, ART, ART)));
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
