import { describe, expect, it } from 'vitest';
import { BLEND_VOTE_WEIGHT } from '../constants/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { blendWeightedHistogram } from './blendHistogram.ts';
import { colorHistogram, packColor } from './imageData.ts';

const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
const GREY: Rgba = { r: 128, g: 128, b: 128, a: 255 };
const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const RED: Rgba = { r: 220, g: 40, b: 40, a: 255 };
const BLUE: Rgba = { r: 40, g: 60, b: 200, a: 255 };

/** What one colour weighs in `image`, or `undefined` where the image does not contain it. */
function weightOf(image: ImageData, color: Rgba): number | undefined {
  return blendWeightedHistogram(image).get(packColor(color));
}

describe('blendWeightedHistogram', () => {
  it('counts a flat image exactly as a plain histogram does', () => {
    const flat = imageFrom(8, 8, () => RED);

    expect(blendWeightedHistogram(flat)).toEqual(colorHistogram(flat));
  });

  it('holds a colour that sits partway between its two neighbours to a fraction of a vote', () => {
    // A hard black-to-white boundary with one column of the midpoint across it: exactly the shape a
    // resampled sheet leaves at every region edge, and the population that used to claim palette
    // slots the art's own colours needed.
    const softened = imageFrom(9, 4, (x) => (x < 4 ? BLACK : x === 4 ? GREY : WHITE));

    expect(weightOf(softened, GREY)).toBeCloseTo(4 * BLEND_VOTE_WEIGHT);
    expect(weightOf(softened, BLACK)).toBe(16);
    expect(weightOf(softened, WHITE)).toBe(16);
  });

  it('reads the vertical axis as well as the horizontal one', () => {
    const softened = imageFrom(4, 9, (_x, y) => (y < 4 ? BLACK : y === 4 ? GREY : WHITE));

    expect(weightOf(softened, GREY)).toBeCloseTo(4 * BLEND_VOTE_WEIGHT);
  });

  it('keeps the whole vote of a drawn contour, which is darker than both sides rather than between', () => {
    // The distinction the whole reading rests on. A one-pixel ink line has the same local gradient as
    // the fringe beside it, so an edge-strength reading would suppress the outlines this app spends
    // three other passes protecting; betweenness does not, because the line is off the run entirely.
    const outlined = imageFrom(9, 4, (x) => (x < 4 ? GREY : x === 4 ? BLACK : WHITE));

    expect(weightOf(outlined, BLACK)).toBe(4);
  });

  it('keeps the whole vote of a shading step too small to be a boundary', () => {
    // Soft shading has every pixel partway between the two beside it. Taking those would down-weight
    // a whole shaded surface, so the span has to clear BLEND_EDGE_GAP before anything is read.
    const shaded = imageFrom(9, 4, (x) => ({ r: 100 + x, g: 100 + x, b: 100 + x, a: 255 }));
    const histogram = blendWeightedHistogram(shaded);

    expect(histogram.size).toBe(9);
    for (const weight of histogram.values()) expect(weight).toBe(4);
  });

  it('keeps the whole vote of a translucent pixel, however it sits between its neighbours', () => {
    // A soft *alpha* edge is a blend by the same geometry, and this app has decided the other way
    // about those: `exactSplit` splits on alpha precisely so a fade-out can hold a slot of its own.
    const half: Rgba = { r: 128, g: 128, b: 128, a: 128 };
    const fading = imageFrom(9, 4, (x) => (x < 4 ? BLACK : x === 4 ? half : WHITE));

    expect(weightOf(fading, half)).toBe(4);
  });

  it('leaves fully transparent pixels out, as a plain histogram does', () => {
    const clear: Rgba = { r: 0, g: 0, b: 0, a: 0 };
    const keyed = imageFrom(9, 4, (x) => (x < 4 ? clear : x === 4 ? GREY : WHITE));

    expect(weightOf(keyed, clear)).toBeUndefined();
  });

  it('removes no colour, so the set a palette is chosen from is the set the image holds', () => {
    // The reason the weight is a fraction rather than nothing: `buildPalette` reads the histogram's
    // size to decide whether an image is already inside its budget, and a blend colour is still a
    // colour the image contains.
    const softened = imageFrom(9, 4, (x) => (x < 4 ? BLACK : x === 4 ? GREY : WHITE));

    expect([...blendWeightedHistogram(softened).keys()]).toEqual([...colorHistogram(softened).keys()]);
  });

  it('asks nothing of a pixel with no opposite pair on an axis', () => {
    // The first and last column and row have no neighbour on one side, so a boundary sitting on the
    // edge of the sheet is never read from outside it. Here the run is horizontal and the midpoint
    // is in column 0, where there is nothing to its left; its own column is uniform, so the vertical
    // axis has no span either.
    const onTheEdge = imageFrom(9, 4, (x) => (x === 0 ? GREY : x < 5 ? BLACK : WHITE));

    expect(weightOf(onTheEdge, GREY)).toBe(4);
  });

  it('reads a blend of two hues, not only of two tones', () => {
    // Three steps across the seam, which is what a three-tap resampling kernel leaves — and the
    // shape the reading is calibrated against, since each pixel is asked about its immediate
    // neighbours rather than about the two art colours at the ends of the ramp.
    const ramp: Rgba[] = [0.25, 0.5, 0.75].map((share) => ({
      r: Math.round(RED.r + (BLUE.r - RED.r) * share),
      g: Math.round(RED.g + (BLUE.g - RED.g) * share),
      b: Math.round(RED.b + (BLUE.b - RED.b) * share),
      a: 255,
    }));
    const softened = imageFrom(11, 4, (x) => (x < 4 ? RED : x > 6 ? BLUE : ramp[x - 4]!));

    for (const step of ramp) expect(weightOf(softened, step)).toBeCloseTo(4 * BLEND_VOTE_WEIGHT);
  });

  it('leaves a single-pixel step between two far-apart hues alone, at the reading’s limit', () => {
    // An sRGB blend is a straight run in sRGB and a slightly curved one in OKLab, and how far it
    // bends depends on the hues: the midpoint of this pair sits 5.3 off the run joining them, past
    // BLEND_STRAIGHTNESS. A three-tap kernel never produces this shape — each pixel's neighbours are
    // the steps beside it, not the art colours at the ends — so the case is recorded rather than
    // calibrated for, and the cost of missing it is that this colour keeps the vote it always had.
    const midpoint: Rgba = { r: 130, g: 50, b: 120, a: 255 };
    const oneStep = imageFrom(9, 4, (x) => (x < 4 ? RED : x === 4 ? midpoint : BLUE));

    expect(weightOf(oneStep, midpoint)).toBe(4);
  });
});
