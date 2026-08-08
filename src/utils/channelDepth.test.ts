import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import { channelLevels, channelSpaceSize } from './channelLevels.ts';
import { snapToChannelDepth } from './channelDepth.ts';
import { pixelOffset, readPixel } from './imageData.ts';

/**
 * The colour space half of a pinned palette: the ladder, and the transform that puts an image on it.
 *
 * The arithmetic is worth pinning because it is a *claim about hardware* rather than a convenience —
 * the file argues that the linear normalisation is what these machines' palettes are, and that the
 * five-bit case agreeing with bit replication is the evidence.
 */

describe('channelLevels', () => {
  it('runs from 0 to 255 inclusive, with one rung per value the channel can hold', () => {
    expect(channelLevels(1)).toEqual([0, 255]);
    expect(channelLevels(2)).toEqual([0, 85, 170, 255]);
    expect(channelLevels(3)).toEqual([0, 36, 73, 109, 146, 182, 219, 255]);
    expect(channelLevels(8)).toHaveLength(256);
  });

  it('is identical to bit replication at the widths this library uses', () => {
    // The claim the module makes about why the linear normalisation *is* the machine's palette
    // rather than an art-tool convention: at two, three and four bits per channel — the Master
    // System, the Mega Drive and the Amiga — repeating the bit pattern to fill a byte lands on
    // exactly these rungs. Two and four tile a byte exactly, so they were never in doubt; three
    // does not, and this is what says it agrees anyway.
    expect(channelLevels(2)).toEqual(Array.from({ length: 4 }, (_, n) => (n << 6) | (n << 4) | (n << 2) | n));
    expect(channelLevels(3)).toEqual(Array.from({ length: 8 }, (_, n) => (n << 5) | (n << 2) | (n >> 1)));
    expect(channelLevels(4)).toEqual(Array.from({ length: 16 }, (_, n) => (n << 4) | n));
  });

  it('differs from a truncated replication by at most one step, at four values in thirty-two', () => {
    // The other half of that claim, stated as the bound rather than waved at. Five bits cannot
    // repeat wholly into eight, so `(n << 3) | (n >> 2)` carries only three of them round; the two
    // ladders part company at four indices, by one value in 255 and in both directions.
    const truncated = Array.from({ length: 32 }, (_, n) => (n << 3) | (n >> 2));
    const gaps = channelLevels(5).map((level, n) => level - (truncated[n] ?? 0));

    expect(Math.max(...gaps.map(Math.abs))).toBe(1);
    expect(gaps.filter((gap) => gap !== 0)).toHaveLength(4);
  });

  it('answers for a depth with no interval to divide rather than returning NaN', () => {
    expect(channelLevels(0)).toEqual([0]);
  });

  it('counts the space across all three channels', () => {
    expect(channelSpaceSize(2)).toBe(64);
    expect(channelSpaceSize(3)).toBe(512);
    expect(channelSpaceSize(5)).toBe(32768);
  });
});

describe('snapToChannelDepth', () => {
  it('moves every channel to its nearest rung', () => {
    // Against the three-bit ladder 0, 36, 73, 109, 146, 182, 219, 255: 40 is nearer 36 than 73; 200
    // is 18 from 182 and 19 from 219, so it falls *down*; 128 is nearer 146; 1 is nearer 0.
    const image = imageFrom(2, 1, (x) =>
      x === 0 ? { r: 40, g: 0, b: 255, a: 255 } : { r: 200, g: 128, b: 1, a: 255 },
    );

    const snapped = snapToChannelDepth(image, 3);

    expect(readPixel(snapped.data, pixelOffset(2, 0, 0))).toEqual({ r: 36, g: 0, b: 255, a: 255 });
    expect(readPixel(snapped.data, pixelOffset(2, 1, 0))).toEqual({ r: 182, g: 146, b: 0, a: 255 });
  });

  it('leaves alpha exactly as it found it', () => {
    // The one channel that must not move: these machines had no alpha at all, so snapping it would
    // be a decision about the sheet's shape taken by a transform asked about its colour.
    const image = imageFrom(1, 1, () => ({ r: 10, g: 10, b: 10, a: 128 }));

    expect(readPixel(snapToChannelDepth(image, 3).data, 0).a).toBe(128);
  });

  it('copies a fully transparent pixel through untouched', () => {
    const image = imageFrom(1, 1, () => ({ r: 40, g: 40, b: 40, a: 0 }));

    expect(channels(snapToChannelDepth(image, 3))).toEqual(channels(image));
  });

  it('is idempotent — a snapped image is already legal', () => {
    const image = imageFrom(8, 8, (x, y) => ({ r: x * 31, g: y * 31, b: (x + y) * 15, a: 255 }));

    const once = snapToChannelDepth(image, 3);
    expect(channels(snapToChannelDepth(once, 3))).toEqual(channels(once));
  });

  it('changes nothing at eight bits, where every value is already a rung', () => {
    const image = imageFrom(4, 4, (x, y) => ({ r: x * 17, g: y * 23, b: 200, a: 255 }));

    expect(channels(snapToChannelDepth(image, 8))).toEqual(channels(image));
  });
});
