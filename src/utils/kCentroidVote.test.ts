import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { kCentroidCells } from './kCentroidVote.ts';
import { quantiseImage } from './quantiseImage.ts';
import { regularMesh } from './gridMesh.ts';

const single = regularMesh(6, 6, 6, { x: 0, y: 0 });

describe('kCentroidCells', () => {
  it('answers the dominant cluster’s centre, untouched by the minority', () => {
    // Two thirds of the cell is greens a few steps apart, one third gold. A mean would pull the
    // greens toward the gold; a modal pick would let one exact green speak for all of them; the
    // dominant centroid is the greens' own mean, exactly.
    const greenA: Rgba = { r: 40, g: 90, b: 50, a: 255 };
    const greenB: Rgba = { r: 46, g: 96, b: 56, a: 255 };
    const gold: Rgba = { r: 235, g: 205, b: 90, a: 255 };
    const sheet = imageFrom(6, 6, (x, y) => {
      const index = y * 6 + x;
      if (index < 12) return greenA;
      return index < 24 ? greenB : gold;
    });

    expect(Array.from(kCentroidCells(sheet, single).data)).toEqual([43, 93, 53, 255]);
  });

  it('resolves an exact tie to the darker cluster', () => {
    const dark: Rgba = { r: 30, g: 40, b: 35, a: 255 };
    const bright: Rgba = { r: 220, g: 210, b: 190, a: 255 };
    const sheet = imageFrom(6, 6, (x, y) => ((y * 6 + x) % 2 === 0 ? dark : bright));

    expect(Array.from(kCentroidCells(sheet, single).data)).toEqual([30, 40, 35, 255]);
  });

  it('resolves a flat cell to its own colour, and a majority-keyed cell to transparency', () => {
    const flat = imageFrom(6, 6, () => ({ r: 120, g: 100, b: 80, a: 255 }));
    expect(Array.from(kCentroidCells(flat, single).data)).toEqual([120, 100, 80, 255]);

    const keyed = imageFrom(6, 6, (x, y) =>
      y * 6 + x < 20 ? { r: 0, g: 0, b: 0, a: 0 } : { r: 120, g: 100, b: 80, a: 255 },
    );
    expect(kCentroidCells(keyed, single).data[3]).toBe(0);
  });

  it('reads art at a soft alpha as art — a matte-exported sheet must not vanish', () => {
    const soft = imageFrom(6, 6, () => ({ r: 120, g: 100, b: 80, a: 254 }));
    expect(Array.from(kCentroidCells(soft, single).data)).toEqual([120, 100, 80, 255]);
  });

  it('separates two tones that read equally light, and still answers a cluster centre', () => {
    // Red at (200, 0, 0) and blue at (0, 34, 240) share integer luma 42, so seeding by luma alone
    // put both seeds on the first pixel and the cell answered a raw colour. The packed tie-break
    // gives each tone its own cluster, and the even split resolves to the darker-seeded one.
    const red: Rgba = { r: 200, g: 0, b: 0, a: 255 };
    const blue: Rgba = { r: 0, g: 34, b: 240, a: 255 };
    const sheet = imageFrom(6, 6, (x, y) => ((y * 6 + x) % 2 === 0 ? red : blue));
    expect(Array.from(kCentroidCells(sheet, single).data)).toEqual([0, 34, 240, 255]);
  });

  it('is deterministic — the same sheet resolves to the same bytes twice', () => {
    const sheet = imageFrom(24, 24, (x, y) => ({
      r: (x * 37 + y * 11) % 256,
      g: (x * 5 + y * 29) % 256,
      b: (x * y) % 256,
      a: 255,
    }));
    const mesh = regularMesh(24, 24, 6, { x: 0, y: 0 });
    expect(channels(kCentroidCells(sheet, mesh))).toEqual(channels(kCentroidCells(sheet, mesh)));
  });

  it('differs from both other readings through the pipeline, on art that separates them', () => {
    const sheet = imageFrom(60, 60, (x, y) => {
      const on = (position: number): boolean => position >= 25 && position < 27;
      const shade = ((Math.floor(x / 3) + Math.floor(y / 3)) % 2) * 14;
      return (on(x) && y >= 25 && y < 45) || (on(y) && x >= 25 && x < 45)
        ? { r: 16, g: 14, b: 18, a: 255 }
        : { r: 150 - shade, g: 110 - shade, b: 70 - shade, a: 255 };
    });
    const at = (vote: 'DOMINANT' | 'INK_WEIGHTED' | 'K_CENTROID') =>
      channels(
        quantiseImage(sheet, {
          grid: 6,
          key: null,
          vote,
          lineStrength: 1.5,
          fillCleanup: 0,
          colorMerge: 0,
          reduction: null,
        }).image,
      );

    const centroid = at('K_CENTROID');
    expect(centroid).not.toEqual(at('DOMINANT'));
    expect(centroid).not.toEqual(at('INK_WEIGHTED'));
  });
});
