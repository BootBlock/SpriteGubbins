import { describe, expect, it } from 'vitest';
import { DITHER_PATTERNS } from '../types/quantiser.ts';
import type { ColorReduction, DitherPattern, Rgba, ThresholdMatrix } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { channelLevels } from './channelLevels.ts';
import { ditherImage } from './ditherImage.ts';
import { ditherMatrix } from './ditherMatrix.ts';
import { colorHistogram, readPixel, unpackColor } from './imageData.ts';
import { srgbToConesInto } from './oklab.ts';
import type { MutableCones } from './oklab.ts';

const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };
const WHITE: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const MID: Rgba = { r: 128, g: 128, b: 128, a: 255 };

const BAYER_4 = matrix('BAYER_4');

/** Every pattern but the off position, derived from the union so a fifth would be tested too. */
const TILED = DITHER_PATTERNS.filter(
  (pattern): pattern is Exclude<DitherPattern, 'NONE'> => pattern !== 'NONE',
);

function matrix(pattern: Exclude<DitherPattern, 'NONE'>): ThresholdMatrix {
  const built = ditherMatrix(pattern);
  if (built === null) throw new Error('the pattern names a tile.');
  return built;
}

/** The mean linear light of an image's opaque pixels, which is what alternating pixels average to. */
function meanLight(image: ImageData): number {
  const cones: MutableCones = { long: 0, medium: 0, short: 0 };
  let total = 0;
  let counted = 0;
  for (let at = 0; at < image.data.length; at += 4) {
    if ((image.data[at + 3] ?? 0) === 0) continue;
    srgbToConesInto(cones, image.data[at] ?? 0, image.data[at + 1] ?? 0, image.data[at + 2] ?? 0);
    total += cones.medium;
    counted += 1;
  }
  return total / counted;
}

describe('ditherImage', () => {
  const FLAT_MID = imageFrom(16, 16, () => MID);
  const TWO_TONE: ColorReduction = { kind: 'PALETTE', entries: [BLACK, WHITE] };

  it('writes a colour the palette cannot hold as a pattern of two it can', () => {
    // The 8 × 8 tile, because the closeness below is bounded by the ladder's own resolution: a
    // 4 × 4 tile can only ask for sixteenths, and the nearest sixteenth to what mid grey wants is
    // 0.0284 of linear light away.
    const out = ditherImage(FLAT_MID, TWO_TONE, matrix('BAYER_8'));
    const colors = [...colorHistogram(out).keys()];
    expect(colors.length).toBe(2);
    // The mean light of the pattern is what the eye averages, and it lands on the mid grey the flat
    // palette step could only have rounded to black or to white.
    expect(meanLight(out)).toBeCloseTo(meanLight(FLAT_MID), 2);
  });

  it('decides by position, so one colour takes one pattern wherever it appears', () => {
    const out = ditherImage(FLAT_MID, TWO_TONE, BAYER_4);
    // The tile repeats from the image's own origin: a pixel and the pixel one tile along are the
    // same rank, and must therefore have taken the same colour. This is what error diffusion cannot
    // promise, and why the whole feature is positional.
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const one = readPixel(out.data, (y * 16 + x) * 4);
        expect(readPixel(out.data, ((y + 4) * 16 + x + 4) * 4)).toEqual(one);
        expect(readPixel(out.data, ((y + 8) * 16 + x + 8) * 4)).toEqual(one);
      }
    }
  });

  it('leaves a colour the palette already holds alone', () => {
    // Which colour, not just how many: a baseline that took the *first* entry rather than the
    // nearest would bring a white sheet back solid black and still leave one colour standing.
    const flat = imageFrom(8, 8, () => WHITE);
    const written = [...colorHistogram(ditherImage(flat, TWO_TONE, BAYER_4)).keys()].map(unpackColor);
    expect(written).toEqual([WHITE]);
  });

  it('copies a fully transparent pixel through untouched', () => {
    const clear: Rgba = { r: 9, g: 9, b: 9, a: 0 };
    const sheet = imageFrom(8, 8, (x) => (x < 4 ? MID : clear));
    const out = ditherImage(sheet, TWO_TONE, BAYER_4);
    for (let y = 0; y < 8; y += 1) {
      for (let x = 4; x < 8; x += 1) {
        expect(readPixel(out.data, (y * 8 + x) * 4)).toEqual(clear);
      }
    }
  });

  it('keeps a pixel’s own coverage under a stated palette', () => {
    // The same rule `applyRgbPalette` states: a machine's palette is a list of colours with no
    // fourth channel, so writing an entry whole would flatten every soft edge to opaque.
    const soft = imageFrom(8, 8, () => ({ ...MID, a: 120 }));
    const out = ditherImage(soft, TWO_TONE, BAYER_4);
    for (let at = 0; at < out.data.length; at += 4) expect(out.data[at + 3]).toBe(120);
  });

  it('writes a budget entry whole, coverage included', () => {
    // And the mirror rule `applyPalette` states: a budget's entries are pixels of this sheet, so an
    // entry's coverage is as much a part of it as its hue.
    //
    // **The fixture carries three coverages and the budget admits two**, which is what makes the two
    // rules disagree: a pass that kept each pixel's own coverage would leave all three standing,
    // where writing the entry whole leaves the two the palette chose. A fixture whose coverages the
    // palette could hold entire cannot tell the rules apart at all.
    const coverages = [40, 150, 255];
    const sheet = imageFrom(9, 9, (x, y) => ({ ...MID, a: coverages[(x + y) % 3] ?? 255 }));
    const out = ditherImage(sheet, { kind: 'MAX_COLORS', maxColors: 2 }, BAYER_4);
    const written = new Set([...out.data.filter((_, at) => at % 4 === 3)]);
    expect(written.size).toBe(2);
    expect([...written].every((alpha) => coverages.includes(alpha))).toBe(true);
  });

  it('leaves a colour outside a lock’s reach exactly as it arrived', () => {
    // The escape gate, read from the same place `applyLockedPalette` reads it: a colour the locked
    // sheet never had is no more the lock's business when a pattern is in force than when one is not.
    const gem: Rgba = { r: 10, g: 240, b: 200, a: 255 };
    const sheet = imageFrom(8, 8, (x) => (x < 4 ? MID : gem));
    const out = ditherImage(sheet, { kind: 'LOCKED', entries: [BLACK, WHITE], snap: 40 }, BAYER_4);
    for (let y = 0; y < 8; y += 1) {
      expect(readPixel(out.data, (y * 8 + 6) * 4)).toEqual(gem);
      expect(readPixel(out.data, (y * 8 + 1) * 4)).not.toEqual(gem);
    }
  });

  it('dithers a channel-depth space between the rungs either side of the colour', () => {
    const levels = channelLevels(2);
    const between: Rgba = { r: 100, g: 100, b: 100, a: 255 };
    const out = ditherImage(
      imageFrom(16, 16, () => between),
      { kind: 'CHANNEL_DEPTH', bitsPerChannel: 2 },
      BAYER_4,
    );

    // Every colour written is on the lattice, and the two it alternates between are the rungs the
    // source colour falls between — which is what the classic threshold dither for a bit-depth
    // reduction chooses, arrived at here by the same search every other palette uses.
    const written = [...colorHistogram(out).keys()].map(unpackColor);
    expect(written.length).toBe(2);
    for (const entry of written) {
      expect(levels).toContain(entry.r);
      expect(levels).toContain(entry.g);
      expect(levels).toContain(entry.b);
    }
    // The rungs either side on *every* channel, which is the corner a neutral colour needs and the
    // furthest of the eight from it — see `DITHER_LATTICE_CORNERS`.
    expect(written).toEqual(
      expect.arrayContaining([
        { r: 85, g: 85, b: 85, a: 255 },
        { r: 170, g: 170, b: 170, a: 255 },
      ]),
    );
  });

  it('returns the sheet unchanged where the palette is empty', () => {
    const sheet = imageFrom(4, 4, () => MID);
    const out = ditherImage(sheet, { kind: 'PALETTE', entries: [] }, BAYER_4);
    expect([...out.data]).toEqual([...sheet.data]);
  });

  it.each(TILED)('never rewrites the sheet it was handed (%s)', (pattern) => {
    const sheet = imageFrom(16, 16, (x, y) => ({ r: x * 16, g: y * 16, b: 128, a: 255 }));
    const before = [...sheet.data];
    ditherImage(sheet, { kind: 'MAX_COLORS', maxColors: 4 }, matrix(pattern));
    expect([...sheet.data]).toEqual(before);
  });
});
