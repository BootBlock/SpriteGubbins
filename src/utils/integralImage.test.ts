import { describe, expect, it } from 'vitest';
import { integralImage, rectangleSum } from './integralImage.ts';

/** `1 … 12` laid out three wide, so every rectangle sum can be added up by hand. */
const PLANE = Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const WIDTH = 3;
const HEIGHT = 4;

describe('integralImage', () => {
  it('answers a rectangle with the sum of the pixels inside it', () => {
    const table = integralImage(PLANE, WIDTH, HEIGHT);

    // The 2 × 2 block at (1, 1): 5, 6, 8, 9.
    expect(rectangleSum(table, WIDTH, 1, 1, 2, 2)).toBe(28);
    // The whole plane, which is 1 + … + 12.
    expect(rectangleSum(table, WIDTH, 0, 0, WIDTH, HEIGHT)).toBe(78);
  });

  it('answers a rectangle at the top-left corner without a special case', () => {
    const table = integralImage(PLANE, WIDTH, HEIGHT);

    expect(rectangleSum(table, WIDTH, 0, 0, 1, 1)).toBe(1);
    expect(rectangleSum(table, WIDTH, 0, 0, 2, 2)).toBe(1 + 2 + 4 + 5);
  });

  it('answers an empty rectangle with nothing', () => {
    const table = integralImage(PLANE, WIDTH, HEIGHT);

    expect(rectangleSum(table, WIDTH, 2, 2, 0, 0)).toBe(0);
  });

  it('sums the product of two planes where a second is given', () => {
    // What an SSIM covariance asks for, and the reason the product form exists at all.
    const other = Float64Array.from(PLANE).map((value) => value * 2);
    const table = integralImage(PLANE, WIDTH, HEIGHT, other);

    expect(rectangleSum(table, WIDTH, 1, 1, 2, 2)).toBe(2 * (25 + 36 + 64 + 81));
  });

  it('matches a direct sum over every rectangle of a plane', () => {
    const table = integralImage(PLANE, WIDTH, HEIGHT);

    for (let top = 0; top < HEIGHT; top += 1) {
      for (let left = 0; left < WIDTH; left += 1) {
        for (let height = 1; top + height <= HEIGHT; height += 1) {
          for (let width = 1; left + width <= WIDTH; width += 1) {
            let direct = 0;
            for (let y = top; y < top + height; y += 1) {
              for (let x = left; x < left + width; x += 1) direct += PLANE[y * WIDTH + x] ?? 0;
            }
            expect(rectangleSum(table, WIDTH, left, top, width, height)).toBe(direct);
          }
        }
      }
    }
  });
});
