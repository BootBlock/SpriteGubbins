import { describe, expect, it } from 'vitest';
import { extremeNeighbours, TRANSPARENT_DILATE_KEY, TRANSPARENT_ERODE_KEY } from './extremeNeighbour.ts';

/**
 * The square window walked longhand, ties going to the lowest index — which in row-major order is
 * the topmost row and, within it, the leftmost column.
 *
 * The separable implementation never sees a square: it takes rows and then columns. That the two
 * agree is the claim worth holding, and it is a claim about the *index* rather than the value, so a
 * reference that only checked the winning lightness would pass while the wrong pixel was being
 * copied.
 */
function bruteForce(
  keys: readonly number[],
  width: number,
  height: number,
  radius: number,
  takeMin: boolean,
): number[] {
  const winners: number[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let best = -1;
      for (let scanY = Math.max(y - radius, 0); scanY <= Math.min(y + radius, height - 1); scanY += 1) {
        for (let scanX = Math.max(x - radius, 0); scanX <= Math.min(x + radius, width - 1); scanX += 1) {
          const index = scanY * width + scanX;
          if (best === -1) {
            best = index;
            continue;
          }
          const key = keys[index] ?? 0;
          const bestKey = keys[best] ?? 0;
          if (key === bestKey ? index < best : takeMin ? key < bestKey : key > bestKey) best = index;
        }
      }
      winners.push(best);
    }
  }
  return winners;
}

const sample = (width: number, height: number): number[] =>
  Array.from({ length: width * height }, (_, index) => (index * 53) % 17);

describe('extremeNeighbours', () => {
  it('agrees with a brute-force square window across sizes and radii, both directions', () => {
    for (const [width, height] of [
      [1, 1],
      [1, 7],
      [7, 1],
      [4, 5],
      [9, 6],
      [11, 11],
    ] as const) {
      const keys = sample(width, height);
      for (let radius = 0; radius <= 4; radius += 1) {
        for (const takeMin of [true, false]) {
          const got = Array.from(extremeNeighbours(Int16Array.from(keys), width, height, radius, takeMin));
          expect({ width, height, radius, takeMin, got }).toEqual({
            width,
            height,
            radius,
            takeMin,
            got: bruteForce(keys, width, height, radius, takeMin),
          });
        }
      }
    }
  });

  it('lets a dark pixel claim its whole neighbourhood, and no further', () => {
    // A single dark pixel in the middle of a 5 × 5 field of light ones, at radius 1: exactly the
    // eight neighbours and the pixel itself should point at it.
    const keys = new Int16Array(25).fill(200);
    keys[12] = 10;
    const winners = extremeNeighbours(keys, 5, 5, 1, true);
    const claimed = [...winners].map((winner, index) => (winner === 12 ? index : -1)).filter((i) => i >= 0);
    expect(claimed).toEqual([6, 7, 8, 11, 12, 13, 16, 17, 18]);
  });

  it('never lets a transparent pixel win a minimum, even against pure white', () => {
    // 255 is the lightest a real pixel can be. The sentinel has to lose to it, or a cleared pixel
    // would hand its undefined colour to the sprite beside it.
    const keys = Int16Array.from([TRANSPARENT_ERODE_KEY, 255, TRANSPARENT_ERODE_KEY]);
    expect(Array.from(extremeNeighbours(keys, 3, 1, 1, true))).toEqual([1, 1, 1]);
  });

  it('never lets a transparent pixel win a maximum, even against pure black', () => {
    const keys = Int16Array.from([TRANSPARENT_DILATE_KEY, 0, TRANSPARENT_DILATE_KEY]);
    expect(Array.from(extremeNeighbours(keys, 3, 1, 1, false))).toEqual([1, 1, 1]);
  });

  it('leaves every pixel standing for itself at a radius of zero', () => {
    expect(Array.from(extremeNeighbours(Int16Array.from(sample(4, 3)), 4, 3, 0, true))).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11,
    ]);
  });
});
