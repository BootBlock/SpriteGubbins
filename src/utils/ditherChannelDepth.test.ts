import { describe, expect, it } from 'vitest';
import type { Rgba, ThresholdMatrix } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { channelLevels } from './channelLevels.ts';
import { ditherChannelDepth } from './ditherChannelDepth.ts';
import { ditherMatrix } from './ditherMatrix.ts';
import { colorHistogram, readPixel, unpackColor } from './imageData.ts';
import { srgbToLinear } from './oklab.ts';

function matrix(pattern: 'BAYER_4' | 'BAYER_8'): ThresholdMatrix {
  const built = ditherMatrix(pattern);
  if (built === null) throw new Error('the pattern names a tile.');
  return built;
}

const BAYER_8 = matrix('BAYER_8');

/** The mean linear light of one channel across an image, which is what alternating pixels average to. */
function meanLight(image: ImageData, channel: 0 | 1 | 2): number {
  let total = 0;
  for (let at = channel; at < image.data.length; at += 4) total += srgbToLinear(image.data[at] ?? 0);
  return total / (image.data.length / 4);
}

describe('ditherChannelDepth', () => {
  it('reaches a colour on every channel at once, which no pair of lattice corners can', () => {
    // Three different fractions between the rungs either side, so the colour sits off every line
    // joining two corners of its cell. A two-colour mixture can match at most one channel's average;
    // the per-channel threshold matches all three to the resolution of the 8 × 8 tile's 64 ranks.
    const target: Rgba = { r: 40, g: 120, b: 200, a: 255 };
    const out = ditherChannelDepth(
      imageFrom(16, 16, () => target),
      2,
      BAYER_8,
    );

    const levels = channelLevels(2);
    const written = [...colorHistogram(out).keys()].map(unpackColor);
    expect(written.length).toBeGreaterThan(2);
    for (const entry of written) {
      expect(levels).toContain(entry.r);
      expect(levels).toContain(entry.g);
      expect(levels).toContain(entry.b);
    }

    for (const [channel, value] of [target.r, target.g, target.b].entries()) {
      const rungs = channelLevels(2);
      const lower = Math.max(...rungs.filter((rung) => rung <= value));
      const upper = Math.min(...rungs.filter((rung) => rung >= value));
      // Half a rank of the gap between the two rungs is the most a whole tile can miss by.
      const tolerance = (srgbToLinear(upper) - srgbToLinear(lower)) / (2 * BAYER_8.levels);
      const mean = meanLight(out, channel as 0 | 1 | 2);
      expect(Math.abs(mean - srgbToLinear(value))).toBeLessThanOrEqual(tolerance + 1e-9);
    }
  });

  it('takes the fraction in linear light rather than in sRGB', () => {
    // One bit per channel leaves black and white. sRGB 128 is 22% of the light white emits, so 14 of
    // the 64 ranks take white; a fraction taken in sRGB would give 32 of them and read far too light.
    const out = ditherChannelDepth(
      imageFrom(8, 8, () => ({ r: 128, g: 128, b: 128, a: 255 })),
      1,
      BAYER_8,
    );
    const white = [...colorHistogram(out).entries()].find(([key]) => unpackColor(key).r === 255)?.[1];
    expect(white).toBe(Math.round(srgbToLinear(128) * 64));
    expect(white).toBe(14);
  });

  it('keeps a grey neutral, stepping every channel together along the diagonal', () => {
    const out = ditherChannelDepth(
      imageFrom(16, 16, () => ({ r: 100, g: 100, b: 100, a: 255 })),
      2,
      BAYER_8,
    );
    const written = [...colorHistogram(out).keys()].map(unpackColor);
    expect(written).toEqual(
      expect.arrayContaining([
        { r: 85, g: 85, b: 85, a: 255 },
        { r: 170, g: 170, b: 170, a: 255 },
      ]),
    );
    expect(written.length).toBe(2);
  });

  it('leaves a colour already on the lattice alone', () => {
    const onLattice: Rgba = { r: 0, g: 85, b: 255, a: 255 };
    const out = ditherChannelDepth(
      imageFrom(8, 8, () => onLattice),
      2,
      BAYER_8,
    );
    expect([...colorHistogram(out).keys()].map(unpackColor)).toEqual([onLattice]);
  });

  it('keeps each pixel’s own coverage and copies a fully transparent one through', () => {
    const clear: Rgba = { r: 9, g: 9, b: 9, a: 0 };
    const sheet = imageFrom(8, 8, (x) => (x < 4 ? { r: 100, g: 150, b: 200, a: 120 } : clear));
    const out = ditherChannelDepth(sheet, 2, matrix('BAYER_4'));
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) {
        const pixel = readPixel(out.data, (y * 8 + x) * 4);
        if (x < 4) expect(pixel.a).toBe(120);
        else expect(pixel).toEqual(clear);
      }
    }
  });

  it('decides by position, so a pixel and the pixel one tile along take the same colour', () => {
    const tile = matrix('BAYER_4');
    const out = ditherChannelDepth(
      imageFrom(16, 16, () => ({ r: 40, g: 120, b: 200, a: 255 })),
      2,
      tile,
    );
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        const one = readPixel(out.data, (y * 16 + x) * 4);
        expect(readPixel(out.data, ((y + 4) * 16 + x + 8) * 4)).toEqual(one);
      }
    }
  });

  it('never rewrites the sheet it was handed', () => {
    const sheet = imageFrom(16, 16, (x, y) => ({ r: x * 16, g: y * 16, b: 128, a: 255 }));
    const before = [...sheet.data];
    ditherChannelDepth(sheet, 3, BAYER_8);
    expect([...sheet.data]).toEqual(before);
  });
});
