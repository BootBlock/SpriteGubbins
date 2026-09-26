import { describe, expect, it } from 'vitest';
import { COVERAGE_FLOOR } from '../constants/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { flattenOpacity } from './flattenOpacity.ts';

describe('flattenOpacity', () => {
  it('makes every pixel at or above the coverage floor opaque, keeping its colour', () => {
    const image = imageFrom(3, 1, (x) => ({
      r: 10 * x,
      g: 20,
      b: 30,
      a: [255, 128, COVERAGE_FLOOR][x] ?? 0,
    }));

    expect(Array.from(flattenOpacity(image).data)).toEqual([
      0, 20, 30, 255, 10, 20, 30, 255, 20, 20, 30, 255,
    ]);
  });

  it('clears every pixel under the floor, rather than promoting its noise to a colour', () => {
    const image = imageFrom(2, 1, (x) => ({ r: 255, g: 0, b: 255, a: x === 0 ? 0 : COVERAGE_FLOOR - 1 }));

    expect(Array.from(flattenOpacity(image).data)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('leaves its input untouched', () => {
    const image = imageFrom(1, 1, () => ({ r: 1, g: 2, b: 3, a: 128 }));
    flattenOpacity(image);

    expect(Array.from(image.data)).toEqual([1, 2, 3, 128]);
  });
});
