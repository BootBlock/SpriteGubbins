import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { pixelOffset, readPixel } from './imageData.ts';
import { resampleArea } from './resampleArea.ts';

const RED = { r: 220, g: 20, b: 40, a: 255 } as const;
const CLEAR = { r: 0, g: 0, b: 0, a: 0 } as const;

/** `readPixel` takes a channel offset; every assertion here is about a position. */
function at(image: ImageData, x: number, y: number) {
  return readPixel(image.data, pixelOffset(image.width, x, y));
}

/** The whole of an image as a region. */
function whole(image: ImageData) {
  return { left: 0, top: 0, width: image.width, height: image.height };
}

/** Every channel summed, premultiplied by alpha, over an image — what an area average conserves. */
function premultipliedTotals(image: ImageData): readonly number[] {
  const totals = [0, 0, 0, 0];
  for (let offset = 0; offset < image.data.length; offset += 4) {
    const alpha = image.data[offset + 3] ?? 0;
    for (let channel = 0; channel < 3; channel += 1) {
      totals[channel] = (totals[channel] ?? 0) + (image.data[offset + channel] ?? 0) * alpha;
    }
    totals[3] = (totals[3] ?? 0) + alpha;
  }
  return totals;
}

/** A smooth painted field: every pixel a different colour, as a generator's painted icon is. */
const PAINTED = imageFrom(30, 30, (x, y) => ({ r: x * 8, g: y * 8, b: (x + y) * 4, a: 255 }));

/** The same field, with coverage that varies across it as a soft-edged mark's does. */
const TRANSLUCENT = imageFrom(30, 30, (x, y) => ({
  r: x * 8,
  g: y * 8,
  b: (x + y) * 4,
  a: 64 + (x + y) * 3,
}));

describe('resampleArea', () => {
  it('takes the plain mean of each block at a whole-number factor', () => {
    const source = imageFrom(4, 2, (x) => ({ r: x * 10, g: 0, b: 100, a: 255 }));
    const halved = resampleArea(source, whole(source), 2, 1);

    // Columns 0–1 average 0 and 10 to 5; columns 2–3 average 20 and 30 to 25.
    expect(at(halved, 0, 0)).toStrictEqual({ r: 5, g: 0, b: 100, a: 255 });
    expect(at(halved, 1, 0)).toStrictEqual({ r: 25, g: 0, b: 100, a: 255 });
  });

  it('weighs each source pixel by exactly the area it covers at a fractional factor', () => {
    // Three columns into two: each destination pixel covers one and a half source pixels, so the
    // first is (0 + 0.5 × 30) / 1.5 = 10 and the second (0.5 × 30 + 60) / 1.5 = 50.
    const source = imageFrom(3, 1, (x) => ({ r: x * 30, g: 0, b: 0, a: 255 }));
    const reduced = resampleArea(source, whole(source), 2, 1);

    expect(at(reduced, 0, 0).r).toBe(10);
    expect(at(reduced, 1, 0).r).toBe(50);
  });

  it.each([
    [7, 7],
    [13, 9],
    [11, 30],
  ])('keeps a flat colour exactly at %i × %i from 30 × 30', (width, height) => {
    const flat = imageFrom(30, 30, () => RED);
    const resized = resampleArea(flat, whole(flat), width, height);

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) expect(at(resized, x, y)).toStrictEqual(RED);
    }
  });

  it('does not darken an edge against transparency, whose colour channels describe nothing', () => {
    // A red half and a clear half whose channels are black. Averaged as they stand, the edge would
    // come out a dark red; averaged in premultiplied alpha it is the red itself, half covered.
    const source = imageFrom(2, 1, (x) => (x === 0 ? RED : CLEAR));
    const edge = at(resampleArea(source, whole(source), 1, 1), 0, 0);

    expect([edge.r, edge.g, edge.b]).toStrictEqual([RED.r, RED.g, RED.b]);
    expect(edge.a).toBe(128);
  });

  it('writes a pixel whose coverage rounds to nothing fully clear, channels and all', () => {
    const source = imageFrom(4, 1, (x) => (x === 0 ? { ...RED, a: 1 } : CLEAR));

    expect(at(resampleArea(source, whole(source), 1, 1), 0, 0)).toStrictEqual(CLEAR);
  });

  it('conserves what the region holds, within a rounding step a pixel', () => {
    const resized = resampleArea(TRANSLUCENT, whole(TRANSLUCENT), 13, 13);
    const area = (30 / 13) * (30 / 13);
    const before = premultipliedTotals(TRANSLUCENT);
    const after = premultipliedTotals(resized).map((total) => total * area);
    const pixels = 13 * 13 * area;

    // Each destination alpha is rounded once, by at most half a step, and stands for `area` source
    // pixels — a bound of its own, two hundred and fifty-five times tighter than the colours', so a
    // coverage that drifted by a whole step a pixel cannot hide inside the colour channels' slack.
    expect(Math.abs((after[3] ?? 0) - (before[3] ?? 0))).toBeLessThanOrEqual(pixels * 0.5);
    // A colour channel is stored rounded and weighed by a rounded alpha: half a step of each, at up
    // to 255 of the other.
    for (const channel of [0, 1, 2]) {
      expect(Math.abs((after[channel] ?? 0) - (before[channel] ?? 0))).toBeLessThanOrEqual(pixels * 255);
    }
  });

  it('reads only the region it is given, wherever it sits in the image', () => {
    // A red square in the middle of a clear sheet, read at its own box: no clear pixel outside the
    // box reaches the result, so every pixel is the red at full coverage.
    const sheet = imageFrom(20, 20, (x, y) => (x >= 5 && x < 15 && y >= 5 && y < 15 ? RED : CLEAR));
    const square = resampleArea(sheet, { left: 5, top: 5, width: 10, height: 10 }, 4, 4);

    expect(at(square, 0, 0)).toStrictEqual(RED);
    expect(at(square, 3, 3)).toStrictEqual(RED);
  });

  it('gives the region back unchanged at its own size', () => {
    expect(resampleArea(PAINTED, whole(PAINTED), 30, 30).data).toStrictEqual(PAINTED.data);
  });

  it('replicates each pixel when enlarging by a whole number', () => {
    const source = imageFrom(2, 1, (x) => (x === 0 ? RED : { r: 0, g: 0, b: 255, a: 255 }));
    const doubled = resampleArea(source, whole(source), 4, 2);

    expect(at(doubled, 1, 1)).toStrictEqual(RED);
    expect(at(doubled, 2, 0)).toStrictEqual({ r: 0, g: 0, b: 255, a: 255 });
  });
});
