import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { lumaOfChannels } from './lineVote.ts';
import { lumaPlane } from './lumaPlane.ts';

describe('lumaPlane', () => {
  it('reads one number per pixel, in row-major order', () => {
    const image = imageFrom(3, 2, (x, y) => ({ r: x * 40, g: y * 60, b: 10, a: 255 }));

    const plane = lumaPlane(image);

    expect(plane).toHaveLength(6);
    expect(plane[4]).toBeCloseTo(lumaOfChannels(40, 60, 10), 10);
  });

  it('scales the luma by how opaque the pixel is', () => {
    const half = imageFrom(1, 1, () => ({ r: 200, g: 200, b: 200, a: 128 }));
    const opaque = imageFrom(1, 1, () => ({ r: 200, g: 200, b: 200, a: 255 }));

    expect(lumaPlane(half)[0]).toBeCloseTo(((lumaPlane(opaque)[0] ?? 0) * 128) / 255, 10);
  });

  it('reads a cleared pixel as nothing, whatever colour is left under it', () => {
    // The failure this guards: a keyed sheet's transparent pixels keep whatever the key colour was,
    // so luma alone would report a field of structure that nothing on screen has.
    const cleared = imageFrom(2, 1, (x) => ({ r: x === 0 ? 255 : 0, g: 0, b: x === 0 ? 255 : 0, a: 0 }));

    expect([...lumaPlane(cleared)]).toEqual([0, 0]);
  });
});
