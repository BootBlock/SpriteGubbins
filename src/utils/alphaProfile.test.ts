import { describe, expect, it } from 'vitest';
import type { Rgba } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { alphaProfile, profileGap, profileSprites } from './alphaProfile.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';

const CLEAR: Rgba = { r: 9, g: 9, b: 9, a: FULLY_TRANSPARENT };
const INK: Rgba = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const HALF: Rgba = { r: 20, g: 30, b: 40, a: 128 };

/**
 * A 6 × 4 sheet whose box at (1, 1) is 3 × 2: a full row of ink over a half-covered cell and a hole.
 * The pixels outside the box are ink too, so a profile that read past its box would count them.
 */
function sheet(): ImageData {
  const cells: readonly (readonly Rgba[])[] = [
    [INK, INK, INK, INK, INK, INK],
    [INK, INK, INK, INK, INK, INK],
    [INK, HALF, CLEAR, INK, INK, INK],
    [INK, INK, INK, INK, INK, INK],
  ];
  return imageFrom(6, 4, (x, y) => cells[y]?.[x] ?? CLEAR);
}

const BOX = { left: 1, top: 1, width: 3, height: 2, pixels: 0 };

describe('alphaProfile', () => {
  it('sums each row and each column of the box, and counts the cells that show', () => {
    const profile = alphaProfile(sheet(), BOX);

    expect([...profile.rows]).toEqual([3 * 255, 128 + 255]);
    expect([...profile.columns]).toEqual([255 + 128, 255, 255 + 255]);
    expect(profile.visible).toBe(5);
  });

  it('pairs each box with its own profile, in the order given', () => {
    const image = sheet();
    const other = { left: 0, top: 0, width: 1, height: 1, pixels: 1 };

    expect(profileSprites(image, [BOX, other])).toEqual([
      { box: BOX, profile: alphaProfile(image, BOX) },
      { box: other, profile: alphaProfile(image, other) },
    ]);
  });
});

describe('profileGap', () => {
  it('is zero for one profile laid over itself', () => {
    expect(profileGap(Int32Array.of(5, 7, 2), Int32Array.of(5, 7, 2), 0)).toBe(0);
  });

  it('reads everything outside either profile as nothing', () => {
    // Laid one place on, the second overhangs by one at the end and leaves the first's head alone:
    // |5 − 0| + |7 − 5| + |2 − 7| + |0 − 2|.
    expect(profileGap(Int32Array.of(5, 7, 2), Int32Array.of(5, 7, 2), 1)).toBe(5 + 2 + 5 + 2);
    // And one place back, the mirror of it.
    expect(profileGap(Int32Array.of(5, 7, 2), Int32Array.of(5, 7, 2), -1)).toBe(5 + 2 + 5 + 2);
  });

  it('measures profiles of different lengths over the span either covers', () => {
    expect(profileGap(Int32Array.of(4), Int32Array.of(1, 1, 1), -1)).toBe(1 + 3 + 1);
  });
});
