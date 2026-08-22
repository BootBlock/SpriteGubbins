import { describe, expect, it } from 'vitest';
import {
  buildEngineMetadata,
  calculateAtlasMetrics,
  formatEngineMetadata,
  widthBiasFor,
} from './atlasCalculator.ts';
import { spriteFitFor } from './atlasFit.ts';
import { ATLAS_CANVAS_SIZES, ATLAS_PADDING_SIZES } from '../types/atlas.ts';
import type { AtlasConfig } from '../types/atlas.ts';
import { ASPECT_RATIOS } from '../types/output.ts';

/** A sheet at the practical ceiling: 43 components on a 2048 texture with a standard 4px gutter. */
const BASE: AtlasConfig = {
  canvasSize: 2048,
  padding: 4,
  componentCount: 43,
  widthBias: widthBiasFor('WIDE_16_9'),
};

/**
 * Each sheet shape with the ratio its own identifier names, narrowest first.
 *
 * Read back out of the name rather than out of {@link NOMINAL_SHEET_SIZE}, which is where
 * `widthBiasFor` reads it from — a test that recomputes the implementation's own expression cannot
 * fail, whatever the expression is, and would pass just as happily for a square root of it. The name
 * is the one statement of a sheet's shape that is not an input to the answer.
 */
const BY_NAMED_ASPECT = [...ASPECT_RATIOS]
  .map((aspectRatio) => {
    const named = /_(\d+)_(\d+)$/u.exec(aspectRatio);
    return { aspectRatio, namedAspect: Number(named?.[1]) / Number(named?.[2]) };
  })
  .sort((a, b) => a.namedAspect - b.namedAspect);

/**
 * A pinned number per aspect only ever says the bias is what somebody wrote down, which is as true
 * of a bias that contradicts the shape it belongs to as of one that matches. These state what the
 * bias is a function *of* instead, and every case is driven from {@link ASPECT_RATIOS}, so a shape
 * added to the union and left out of the derivation fails here rather than waiting for someone to
 * remember it.
 */
describe('widthBiasFor', () => {
  it('is the ratio each sheet shape’s own name states', () => {
    for (const { aspectRatio, namedAspect } of BY_NAMED_ASPECT) {
      // Within a fraction of a percent rather than exactly, because the extent it reads has its
      // short edge floored — `sheetCanvas.ts` would rather promise a sheet slightly narrower than
      // the name than one a generator cannot fill. 438 px stands for 21:9’s 438.857, which is the
      // widest that slack gets across the four shapes, at 0.2%.
      expect(widthBiasFor(aspectRatio) / namedAspect, `${aspectRatio}`).toBeCloseTo(1, 2);
    }
  });

  it('rises with the sheet’s own aspect ratio, across every shape offered', () => {
    const biases = BY_NAMED_ASPECT.map(({ aspectRatio }) => widthBiasFor(aspectRatio));

    expect(
      biases,
      `${BY_NAMED_ASPECT.map(({ aspectRatio }) => aspectRatio).join(' < ')} by named aspect`,
    ).toEqual([...biases].sort((a, b) => a - b));
    expect(new Set(biases).size, 'two shapes cannot share a bias').toBe(biases.length);
  });

  it('turns over at the square, which is the only shape with no bias either way', () => {
    for (const { aspectRatio, namedAspect } of BY_NAMED_ASPECT) {
      const bias = widthBiasFor(aspectRatio);
      if (namedAspect > 1) expect(bias, `${aspectRatio} is wide`).toBeGreaterThan(1);
      else if (namedAspect < 1) expect(bias, `${aspectRatio} is tall`).toBeLessThan(1);
      else expect(bias, `${aspectRatio} is square`).toBe(1);
    }
  });

  it('gives a shape and its transpose reciprocal biases', () => {
    // A 16:9 sheet turned on its side is a 9:16 sheet, so whatever bias the one earns, the other
    // earns the inverse of. Two independently chosen figures need not be inverses of each other,
    // and a pair that is not says the widest and tallest sheets disagree about how far a bias goes.
    expect(widthBiasFor('WIDE_16_9') * widthBiasFor('TALL_9_16')).toBeCloseTo(1, 10);
  });
});

describe('calculateAtlasMetrics', () => {
  it('lays 43 components into a grid wide enough to hold them', () => {
    const metrics = calculateAtlasMetrics(BASE);
    expect(metrics.columns * metrics.rows).toBeGreaterThanOrEqual(BASE.componentCount);
  });

  it('never lets the grid overflow the texture, in either axis', () => {
    // Both directions, because only one of them used to be true. Cell size was derived from the
    // column count alone, so a grid taller than it was wide — every 9:16 sheet — reported a cell
    // whose rows ran hundreds of pixels off the bottom of the texture, and exported it as engine
    // metadata. The cell size floors for the same reason: rounding up overflows the final column.
    for (const componentCount of [1, 7, 37, 43, 111]) {
      for (const canvasSize of ATLAS_CANVAS_SIZES) {
        for (const aspectRatio of ASPECT_RATIOS) {
          const metrics = calculateAtlasMetrics({
            ...BASE,
            componentCount,
            canvasSize,
            widthBias: widthBiasFor(aspectRatio),
          });
          expect(metrics.cellSize * metrics.columns).toBeLessThanOrEqual(canvasSize);
          expect(metrics.cellSize * metrics.rows).toBeLessThanOrEqual(canvasSize);
        }
      }
    }
  });

  it('sizes a grid taller than it is wide by its rows, not its columns', () => {
    // The regression the case above generalises, stated on the configuration that used to be
    // wrong: a 9:16 sheet's 6 × 8 grid was given a 341 px cell — the texture divided by 6 — and
    // eight rows of that is 2728 px on a 2048 px texture.
    const tall = calculateAtlasMetrics({ ...BASE, widthBias: widthBiasFor('TALL_9_16') });
    expect(tall.rows).toBeGreaterThan(tall.columns);
    expect(tall.cellSize).toBe(Math.floor(BASE.canvasSize / tall.rows));
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

  it('counts the slots the components do not reach', () => {
    const metrics = calculateAtlasMetrics(BASE);
    expect(metrics.slots).toBe(metrics.columns * metrics.rows);
    expect(metrics.emptySlots).toBe(metrics.slots - BASE.componentCount);
  });

  it('never reports a negative number of empty slots', () => {
    // The row count is derived from the column count precisely so the grid always seats every
    // component, and this is that invariant stated where it can fail.
    for (const componentCount of [1, 2, 43, 111]) {
      for (const aspectRatio of ASPECT_RATIOS) {
        const metrics = calculateAtlasMetrics({
          ...BASE,
          componentCount,
          widthBias: widthBiasFor(aspectRatio),
        });
        expect(metrics.emptySlots).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('keeps the share of texture in use inside 0–1 for every configuration offered', () => {
    for (const canvasSize of ATLAS_CANVAS_SIZES) {
      for (const padding of ATLAS_PADDING_SIZES) {
        for (const componentCount of [1, 43, 111]) {
          const { usableShare } = calculateAtlasMetrics({ ...BASE, canvasSize, padding, componentCount });
          expect(usableShare).toBeGreaterThanOrEqual(0);
          expect(usableShare).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('prices a square sheet as packing a square texture better than a wide one', () => {
    // The width bias costs cell size on a square texture, and this is the figure that says so.
    const square = calculateAtlasMetrics({ ...BASE, widthBias: widthBiasFor('SQUARE_1_1') });
    const wide = calculateAtlasMetrics({ ...BASE, widthBias: widthBiasFor('WIDE_16_9') });
    expect(square.usableShare).toBeGreaterThan(wide.usableShare);
  });

  it('loses share to a heavier gutter, all else equal', () => {
    const light = calculateAtlasMetrics({ ...BASE, padding: 0 });
    const heavy = calculateAtlasMetrics({ ...BASE, padding: 16 });
    expect(heavy.usableShare).toBeLessThan(light.usableShare);
  });
});

describe('buildEngineMetadata', () => {
  it('reports the numbers the metrics actually produced', () => {
    const metrics = calculateAtlasMetrics(BASE);
    const { atlas } = buildEngineMetadata(BASE, metrics, null);

    expect(atlas.texture_size).toBe('2048x2048');
    expect(atlas.total_components).toBe(43);
    expect(atlas.grid).toEqual({ columns: metrics.columns, rows: metrics.rows });
    expect(atlas.cell_size).toEqual({ width: metrics.cellSize, height: metrics.cellSize });
    expect(atlas.padding).toBe(4);
    expect(atlas.usable_sprite_bounds).toEqual({
      width: metrics.usableBounds,
      height: metrics.usableBounds,
    });
    expect(atlas.empty_slots).toBe(metrics.emptySlots);
    expect(atlas.usable_texture_share).toBeCloseTo(metrics.usableShare, 4);
  });

  it('carries the memory figures for every format the app reports', () => {
    const metrics = calculateAtlasMetrics(BASE);
    const { atlas } = buildEngineMetadata(BASE, metrics, null);

    expect(atlas.memory.map((entry) => entry.format)).toEqual(['rgba8', 'block_compressed']);
    // 2048 × 2048 × 4 bytes — the figure an engine's texture inspector reports for this atlas.
    expect(atlas.memory[0]?.bytes).toBe(16 * 1024 * 1024);
    for (const entry of atlas.memory) {
      expect(entry.mipmapped_bytes).toBeGreaterThan(entry.bytes);
    }
  });

  it('states the component fit where the studio named a size, and null where it did not', () => {
    const metrics = calculateAtlasMetrics(BASE);
    const fit = spriteFitFor(metrics.usableBounds, { width: 48, height: 96 });

    expect(buildEngineMetadata(BASE, metrics, null).atlas.component_fit).toBeNull();
    expect(buildEngineMetadata(BASE, metrics, fit).atlas.component_fit).toEqual({
      target_size: { width: 48, height: 96 },
      integer_scale: fit.scale,
      placed_size: { width: fit.placedWidth, height: fit.placedHeight },
    });
  });

  it('rounds the texture share rather than exporting seventeen decimal places', () => {
    const metrics = calculateAtlasMetrics(BASE);
    const { atlas } = buildEngineMetadata(BASE, metrics, null);
    expect(atlas.usable_texture_share.toString()).toMatch(/^\d(\.\d{1,4})?$/u);
  });

  it('round-trips through the exported JSON an engine importer reads', () => {
    const metrics = calculateAtlasMetrics(BASE);
    const metadata = buildEngineMetadata(BASE, metrics, null);
    const text = formatEngineMetadata(metadata);

    expect(text).toContain('\n  '); // two-space indented, not minified
    expect(JSON.parse(text)).toEqual(metadata);
  });
});
