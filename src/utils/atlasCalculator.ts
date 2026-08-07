import { ATLAS_CANVAS_SIZES } from '../types/atlas.ts';
import type { AtlasConfig, AtlasMetrics, EngineMetadataJSON } from '../types/atlas.ts';
import type { AspectRatio } from '../types/output.ts';

/**
 * Texture-atlas planning maths. Pure functions of their arguments — no state, no DOM — which is
 * what makes the numbers testable rather than merely plausible.
 */

/**
 * How much wider than tall the component grid should be, per sheet aspect ratio.
 *
 * A 16:9 sheet wants more columns than rows, a 9:16 sheet fewer. Square and ultrawide both take
 * 1: the grid is laid out inside a *square texture* (atlases are square), so an ultrawide sheet
 * changes how the generator arranges the artwork, not how the atlas packs it.
 */
const WIDTH_BIAS: Readonly<Record<AspectRatio, number>> = {
  WIDE_16_9: 1.5,
  TALL_9_16: 0.75,
  SQUARE_1_1: 1,
  ULTRAWIDE_21_9: 1,
};

export function widthBiasFor(aspectRatio: AspectRatio): number {
  return WIDTH_BIAS[aspectRatio];
}

/** Whether a texture dimension is one of the power-of-two sizes GPUs handle best. */
export function isPowerOfTwoCanvas(size: number): boolean {
  return ATLAS_CANVAS_SIZES.some((allowed) => allowed === size);
}

/**
 * Lay `componentCount` cells into a grid and work out how much room each one gets.
 *
 * Columns come from the square root of the count, stretched by the aspect bias, so the grid
 * stays roughly the shape of the sheet. Cell size floors rather than rounds — a cell that
 * rounded *up* would make the last column overflow the texture.
 */
export function calculateAtlasMetrics(config: AtlasConfig): AtlasMetrics {
  const { canvasSize, padding, componentCount, widthBias } = config;

  const columns = Math.max(1, Math.ceil(Math.sqrt(componentCount * widthBias)));
  const rows = Math.max(1, Math.ceil(componentCount / columns));
  const cellSize = Math.floor(canvasSize / columns);
  // The gutter is removed from both sides, and a heavy gutter in a small cell can exceed it
  // entirely — clamped at zero rather than reported as a negative sprite bound.
  const usableBounds = Math.max(0, cellSize - padding * 2);

  return {
    columns,
    rows,
    cellSize,
    usableBounds,
    isPowerOfTwo: isPowerOfTwoCanvas(canvasSize),
  };
}

/**
 * Shape the metrics into the JSON an engine importer reads. Kept separate from
 * {@link calculateAtlasMetrics} so the UI can render the numbers without building the payload,
 * and so the wire format is defined in exactly one place.
 */
export function buildEngineMetadata(config: AtlasConfig, metrics: AtlasMetrics): EngineMetadataJSON {
  return {
    atlas: {
      texture_size: `${config.canvasSize}x${config.canvasSize}`,
      total_components: config.componentCount,
      grid: { columns: metrics.columns, rows: metrics.rows },
      cell_size: { width: metrics.cellSize, height: metrics.cellSize },
      padding: config.padding,
      usable_sprite_bounds: { width: metrics.usableBounds, height: metrics.usableBounds },
      power_of_two_vram_optimized: metrics.isPowerOfTwo,
    },
  };
}

/** The engine spec as the user copies it — two-space indented, the shape importers expect. */
export function formatEngineMetadata(metadata: EngineMetadataJSON): string {
  return JSON.stringify(metadata, null, 2);
}
