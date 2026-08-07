import { describe, expect, it } from 'vitest';
import {
  buildEngineMetadata,
  calculateAtlasMetrics,
  formatEngineMetadata,
  isPowerOfTwoCanvas,
  widthBiasFor,
} from './atlasCalculator.ts';
import type { AtlasConfig } from '../types/atlas.ts';

/** The default studio setup: 43 components on a 2048 texture with a standard 4px gutter. */
const BASE: AtlasConfig = {
  canvasSize: 2048,
  padding: 4,
  componentCount: 43,
  widthBias: widthBiasFor('WIDE_16_9'),
};

describe('isPowerOfTwoCanvas', () => {
  it.each([512, 1024, 2048, 4096, 8192])('accepts %i', (size) => {
    expect(isPowerOfTwoCanvas(size)).toBe(true);
  });

  it.each([1000, 2000, 3000, 0, -2048])('rejects %i', (size) => {
    expect(isPowerOfTwoCanvas(size)).toBe(false);
  });
});

describe('widthBiasFor', () => {
  it('biases a 16:9 sheet towards more columns and a 9:16 sheet towards fewer', () => {
    expect(widthBiasFor('WIDE_16_9')).toBeGreaterThan(1);
    expect(widthBiasFor('TALL_9_16')).toBeLessThan(1);
  });

  it('treats square and ultrawide alike, because the texture itself is always square', () => {
    expect(widthBiasFor('SQUARE_1_1')).toBe(1);
    expect(widthBiasFor('ULTRAWIDE_21_9')).toBe(1);
  });
});

describe('calculateAtlasMetrics', () => {
  it('lays 43 components into a grid wide enough to hold them', () => {
    const metrics = calculateAtlasMetrics(BASE);
    expect(metrics.columns * metrics.rows).toBeGreaterThanOrEqual(BASE.componentCount);
  });

  it('never lets the grid overflow the texture', () => {
    // The cell size floors rather than rounds precisely so this holds. Rounding up would push
    // the final column past the texture edge.
    for (const componentCount of [37, 43, 111]) {
      for (const canvasSize of [512, 1024, 2048, 4096, 8192]) {
        const metrics = calculateAtlasMetrics({ ...BASE, componentCount, canvasSize });
        expect(metrics.cellSize * metrics.columns).toBeLessThanOrEqual(canvasSize);
      }
    }
  });

  it('removes the bleed gutter from both sides of each cell', () => {
    const metrics = calculateAtlasMetrics({ ...BASE, padding: 8 });
    expect(metrics.usableBounds).toBe(metrics.cellSize - 16);
  });

  it('reports zero usable bounds rather than a negative sprite size', () => {
    // A heavy gutter in a tiny cell would otherwise produce a negative width in the exported
    // engine spec, which an importer would either reject or silently misread.
    const metrics = calculateAtlasMetrics({
      ...BASE,
      canvasSize: 512,
      componentCount: 111,
      padding: 16,
    });
    expect(metrics.usableBounds).toBeGreaterThanOrEqual(0);
  });

  it('always produces at least one row and column', () => {
    const metrics = calculateAtlasMetrics({ ...BASE, componentCount: 1 });
    expect(metrics.columns).toBeGreaterThanOrEqual(1);
    expect(metrics.rows).toBeGreaterThanOrEqual(1);
  });

  it('gives a wide sheet more columns than a tall one for the same component count', () => {
    const wide = calculateAtlasMetrics({ ...BASE, widthBias: widthBiasFor('WIDE_16_9') });
    const tall = calculateAtlasMetrics({ ...BASE, widthBias: widthBiasFor('TALL_9_16') });
    expect(wide.columns).toBeGreaterThan(tall.columns);
  });

  it('flags a non-power-of-two canvas', () => {
    expect(calculateAtlasMetrics({ ...BASE, canvasSize: 2048 }).isPowerOfTwo).toBe(true);
    expect(calculateAtlasMetrics({ ...BASE, canvasSize: 1500 }).isPowerOfTwo).toBe(false);
  });
});

describe('buildEngineMetadata', () => {
  it('reports the numbers the metrics actually produced', () => {
    const metrics = calculateAtlasMetrics(BASE);
    const { atlas } = buildEngineMetadata(BASE, metrics);

    expect(atlas.texture_size).toBe('2048x2048');
    expect(atlas.total_components).toBe(43);
    expect(atlas.grid).toEqual({ columns: metrics.columns, rows: metrics.rows });
    expect(atlas.cell_size).toEqual({ width: metrics.cellSize, height: metrics.cellSize });
    expect(atlas.padding).toBe(4);
    expect(atlas.usable_sprite_bounds).toEqual({
      width: metrics.usableBounds,
      height: metrics.usableBounds,
    });
    expect(atlas.power_of_two_vram_optimized).toBe(true);
  });

  it('round-trips through the exported JSON an engine importer reads', () => {
    const metrics = calculateAtlasMetrics(BASE);
    const metadata = buildEngineMetadata(BASE, metrics);
    const text = formatEngineMetadata(metadata);

    expect(text).toContain('\n  '); // two-space indented, not minified
    expect(JSON.parse(text)).toEqual(metadata);
  });
});
