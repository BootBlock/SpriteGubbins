import { describe, expect, it } from 'vitest';
import { integralImage, rectangleSum } from './integralImage.ts';

/** `1 … 12` laid out three wide, small enough to sum every rectangle of it directly. */
const PLANE = Float64Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
const WIDTH = 3;
const HEIGHT = 4;

describe('integralImage', () => {
  it('answers an empty rectangle with nothing', () => {
    const table = integralImage(PLANE, WIDTH, HEIGHT);

    expect(rectangleSum(table, WIDTH, 2, 2, 0, 0)).toBe(0);
  });

  it('matches a direct sum over every rectangle of a plane, the corner and the whole plane included', () => {
    // Every rectangle, so the ones touching the top-left corner — where the table has no row or
    // column before them to subtract — are answered without a special case, and so is the whole plane.
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
