import { describe, expect, it } from 'vitest';
import { smallestCanvasFor, spriteFitFor } from './atlasFit.ts';
import { calculateAtlasMetrics, widthBiasFor } from './atlasCalculator.ts';
import { ATLAS_CANVAS_SIZES } from '../types/atlas.ts';
import type { AtlasConfig } from '../types/atlas.ts';

/** The default studio setup, minus the texture size the search is for. */
const BASE: Omit<AtlasConfig, 'canvasSize'> = {
  padding: 4,
  componentCount: 43,
  widthBias: widthBiasFor('WIDE_16_9'),
};

/** `US_CHARACTER_RIG`'s own target component size — a real one, and not square. */
const CHARACTER = { width: 48, height: 96 };

describe('spriteFitFor', () => {
  it('takes the whole-number scale, never the fraction it would really fit at', () => {
    // 219 / 96 is 2.28. Placing artwork at 2.28× resamples it, which is the one thing an atlas
    // must not do to pixel art, so the answer is 2 and the remainder is headroom.
    expect(spriteFitFor(219, CHARACTER)).toEqual({
      target: CHARACTER,
      scale: 2,
      placedWidth: 96,
      placedHeight: 192,
    });
  });

  it('measures both axes, so a tall component is not passed on its width alone', () => {
    // 100 px of cell is two whole widths of a 48 px component and not one whole height of it.
    expect(spriteFitFor(100, CHARACTER).scale).toBe(1);
    expect(spriteFitFor(95, CHARACTER).scale).toBe(0);
  });

  it('reports no fit rather than a fractional one, and places nothing', () => {
    expect(spriteFitFor(50, CHARACTER)).toEqual({
      target: CHARACTER,
      scale: 0,
      placedWidth: 0,
      placedHeight: 0,
    });
  });

  it('survives a cell the gutter has eaten entirely', () => {
    expect(spriteFitFor(0, CHARACTER).scale).toBe(0);
  });

  it('fits a component exactly filling the cell at 1:1', () => {
    expect(spriteFitFor(96, CHARACTER)).toEqual({
      target: CHARACTER,
      scale: 1,
      placedWidth: 48,
      placedHeight: 96,
    });
  });
});

describe('smallestCanvasFor', () => {
  it('finds the smallest texture that seats every component at 1:1', () => {
    const smallest = smallestCanvasFor(BASE, CHARACTER);
    expect(smallest).toBe(1024);
  });

  it('returns a size that fits, below a size that does not', () => {
    const smallest = smallestCanvasFor(BASE, CHARACTER);
    expect(smallest).not.toBeNull();

    for (const canvasSize of ATLAS_CANVAS_SIZES) {
      const { usableBounds } = calculateAtlasMetrics({ ...BASE, canvasSize });
      const fits = spriteFitFor(usableBounds, CHARACTER).scale >= 1;
      expect(fits).toBe(smallest !== null && canvasSize >= smallest);
    }
  });

  it('says so when nothing offered holds the component at all', () => {
    expect(smallestCanvasFor(BASE, { width: 5000, height: 5000 })).toBeNull();
  });

  it('needs a bigger texture as the component count climbs', () => {
    const modest = smallestCanvasFor({ ...BASE, componentCount: 8 }, CHARACTER);
    const crowded = smallestCanvasFor({ ...BASE, componentCount: 111 }, CHARACTER);
    expect(modest).not.toBeNull();
    expect(crowded).not.toBeNull();
    expect(crowded ?? 0).toBeGreaterThanOrEqual(modest ?? 0);
  });
});
