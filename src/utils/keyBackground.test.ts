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
 * A magenta the generator got *nearly* right: 1.4 away from the key, so tolerance 16 admits it and
 * tolerance 0 does not. This is the ordinary case the whole feature exists for.
 */
const DRIFTED: Rgba = { r: 250, g: 5, b: 250, a: 255 };

/**
 * A magenta field the generator **painted** rather than filled — the case that prompted the metric.
 *
 * 39 from the key measured straight — level with rose and purple at 40 — and 20 once the key's own
 * shading and washing are discounted. So the default tolerance takes it with a rung and a half to
 * spare, where the straight measurement offered no setting that reached it and spared those.
 */
const PAINTED: Rgba = { r: 196, g: 27, b: 180, a: 255 };

/**
 * A pixel on an anti-aliased edge — three parts key to two parts the green beside it: 27 from the
 * key, so it is outside any tolerance tight enough to be safe and inside the fringe's reach at 16.
 * Only the geometry decides its fate.
 */
const BLEND: Rgba = { r: 161, g: 72, b: 177, a: 255 };

/** The near-black a rendered armour plate is mostly made of, and what the sheet in the report was. */
const DARK_ART: Rgba = { r: 16, g: 16, b: 16, a: 255 };

/**
 * The pixel the reported failure was made of: half the key, half {@link DARK_ART}.
 *
 * **37 from the key**, which is outside the fringe radius at every rung of the ladder — the ceiling
 * is 32 — so the pass that exists to erode it reached straight past it and left it drawn. It is
 * visibly magenta, it survives into the result, and on a sheet whose subject is dark it is most of
 * the silhouette. What it keeps is the key's hue, which is what claims it now.
 */
const DARK_BLEND: Rgba = { r: 135, g: 8, b: 135, a: 255 };

/**
 * A sprite colour with a hue of its own that happens to lean the key's way: the reference sheet's
 * armour red, which projects nearly half its chroma onto magenta's axis.
 *
 * 54 from the key, so no radius takes it — and it is the case a hue test gets wrong if it measures
 * only the chroma along the key's axis and not the chroma standing off it.
 */
const CHROMATIC_ART: Rgba = { r: 139, g: 43, b: 43, a: 255 };

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

  it('keys a halo the radius cannot reach, because the sprite behind it is dark', () => {
    // The reported failure, in one row. `DARK_BLEND` is half the key by construction, so it is halo —
    // but it measures 37, and the fringe radius is capped at 32, so pass 2 walked past it at every
    // rung on the ladder and the sheet came back outlined in magenta. Measured on the reference sheet
    // at the recommended key and the default tolerance, the ring of pixels touching the field was
    // 97.1% still visibly magenta and the radius reached 18% of it.
    const sheet = row(MAGENTA, DARK_BLEND, DARK_ART, DARK_ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE });

    expect(result.keyedPixels).toBe(2);
    expect(channels(result.image)).toEqual(channels(row(TRANSPARENT, TRANSPARENT, DARK_ART, DARK_ART)));
  });

  it('keys that halo at every rung above exact, not only at the loose end', () => {
    // The hue test is not scaled from the tolerance, so the rung a reader picks decides how much
    // *field* goes, not whether the edge is cleaned. Walked rather than argued, because the previous
    // arrangement failed quietly at every rung at once and one spot check would not have shown it.
    for (const tolerance of KEY_TOLERANCES.filter((rung) => rung > 0)) {
      const result = keyBackground(row(MAGENTA, DARK_BLEND, DARK_ART), { color: MAGENTA, tolerance });

      expect({ tolerance, keyed: result.keyedPixels }).toEqual({ tolerance, keyed: 2 });
    }
  });

  it('leaves a contour standing where it has a hue of its own, however near the key it leans', () => {
    // The bound on the hue test. `CHROMATIC_ART` touches the field and projects nearly half its
    // chroma onto the key's axis, so a test that measured only that would take a pixel off every
    // silhouette on the sheet — which is the failure the ceiling was introduced to stop, arriving by
    // a different route.
    const sheet = row(MAGENTA, CHROMATIC_ART, CHROMATIC_ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE });

    expect(result.keyedPixels).toBe(1);
    expect(channels(result.image)).toEqual(channels(row(TRANSPARENT, CHROMATIC_ART, CHROMATIC_ART)));
  });

  it('erodes a dark halo exactly one pixel deep, as it does any other', () => {
    // The bound the hue test inherits rather than escapes: pass 2 reads pass 1's mask, so the second
    // blend touches no field and stays. Restated for this half of the test because the hue test has
    // no radius shrinking with distance to slow it down — asked of its own output it would run down
    // the whole anti-aliased ramp.
    const sheet = row(MAGENTA, DARK_BLEND, DARK_BLEND, DARK_ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE });

    expect(result.keyedPixels).toBe(2);
    expect(channels(result.image)).toEqual(channels(row(TRANSPARENT, TRANSPARENT, DARK_BLEND, DARK_ART)));
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

  it('runs no fringe pass at tolerance 0, which is the whole of what that rung offers', () => {
    // `exact` removes the key colour and nothing else. The radius used to carry that on its own,
    // being scaled from the tolerance — but the hue test is scaled from nothing, so `DARK_BLEND` is
    // the pixel that would have started disappearing at a rung that promises to touch nothing.
    const sheet = row(MAGENTA, BLEND, DARK_BLEND, ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: 0 });

    expect(result.keyedPixels).toBe(1);
    expect(channels(result.image)).toEqual(channels(row(TRANSPARENT, BLEND, DARK_BLEND, ART)));
  });

  it('does not erode the sprite’s contour at the top of the tolerance ladder', () => {
    // The fringe threshold is a multiple of the tolerance, and a multiple with nothing above it runs
    // off the end of the scale: at the top rung it would reach 192, past every colour a sprite could
    // be made of — the art here sits at 67. So an uncapped fringe quietly took a pixel off *every*
    // silhouette touching the field, whatever colour it was, while the panel described a one-pixel
    // edge clean-up.
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

  it('leaves a grey ramp alone under a key that has no hue to blend', () => {
    // `PURE_WHITE` and `PURE_BLACK` get the radius and nothing else, which is the same rule that
    // refuses them the shading latitude. Shading white is how a sheet gets every grey it has, so a
    // hue test read off an achromatic key would erode a pixel of every grey contour touching the
    // field — and their chroma is arithmetic noise rather than an exact zero, so the direction it
    // would be read against is arbitrary.
    const white: Rgba = { r: 255, g: 255, b: 255, a: 255 };
    const grey: Rgba = { r: 128, g: 128, b: 128, a: 255 };
    const sheet = row(white, grey, DARK_ART);

    const result = keyBackground(sheet, { color: white, tolerance: DEFAULT_KEY_TOLERANCE });

    expect(result.keyedPixels).toBe(1);
    expect(channels(result.image)).toEqual(channels(row(TRANSPARENT, grey, DARK_ART)));
  });

  it('counts only what it removed, not what arrived empty', () => {
    // A sheet that came back with real alpha of its own would otherwise inflate the share with area
    // the key never touched — and the share exists to answer whether the *key* matched.
    const sheet = row({ r: 0, g: 0, b: 0, a: 0 }, MAGENTA, ART);

    const result = keyBackground(sheet, { color: MAGENTA, tolerance: 16 });

    expect(result.keyedPixels).toBe(1);
  });
});
