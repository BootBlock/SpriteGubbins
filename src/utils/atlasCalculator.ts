import type { AtlasConfig, AtlasMetrics, EngineMetadataJSON, SpriteFit } from '../types/atlas.ts';
import type { AspectRatio } from '../types/output.ts';
import { textureCostsFor } from './atlasBudget.ts';

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
 *
 * A bias away from 1 costs cell size on a square texture, and `usableShare` below is what makes
 * that cost visible rather than leaving it as a number nobody can account for.
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

/**
 * Lay `componentCount` cells into a grid and work out how much room each one gets.
 *
 * Columns come from the square root of the count, stretched by the aspect bias, so the grid
 * stays roughly the shape of the sheet. Cell size floors rather than rounds — a cell that
 * rounded *up* would make the final column overflow the texture.
 */
export function calculateAtlasMetrics(config: AtlasConfig): AtlasMetrics {
  const { canvasSize, padding, componentCount, widthBias } = config;

  const columns = Math.max(1, Math.ceil(Math.sqrt(componentCount * widthBias)));
  const rows = Math.max(1, Math.ceil(componentCount / columns));
  // Divided by the grid's *longer* axis, not by its width. The texture is square and the grid need
  // not be: dividing by columns alone gives a 9:16 sheet a cell whose rows run hundreds of pixels
  // off the bottom of the texture it is supposedly packed into — a cell size that cannot be built,
  // reported as a metric and exported as engine metadata.
  const cellSize = Math.floor(canvasSize / Math.max(columns, rows));
  // The gutter is removed from both sides, and a heavy gutter in a small cell can exceed it
  // entirely — clamped at zero rather than reported as a negative sprite bound.
  const usableBounds = Math.max(0, cellSize - padding * 2);
  const slots = columns * rows;

  return {
    columns,
    rows,
    cellSize,
    usableBounds,
    slots,
    emptySlots: slots - componentCount,
    usableShare: (componentCount * usableBounds ** 2) / canvasSize ** 2,
  };
}

/**
 * Shape the metrics into the JSON an engine importer reads. Kept separate from
 * {@link calculateAtlasMetrics} so the UI can render the numbers without building the payload,
 * and so the wire format is defined in exactly one place.
 *
 * The fit is passed in rather than derived here, because deriving it needs `atlasFit.ts` and that
 * module already imports this one to search the canvas sizes.
 */
export function buildEngineMetadata(
  config: AtlasConfig,
  metrics: AtlasMetrics,
  fit: SpriteFit | null,
): EngineMetadataJSON {
  return {
    atlas: {
      texture_size: `${config.canvasSize}x${config.canvasSize}`,
      total_components: config.componentCount,
      grid: { columns: metrics.columns, rows: metrics.rows },
      cell_size: { width: metrics.cellSize, height: metrics.cellSize },
      padding: config.padding,
      usable_sprite_bounds: { width: metrics.usableBounds, height: metrics.usableBounds },
      empty_slots: metrics.emptySlots,
      // Rounded on the way out rather than in the metrics: the UI shows a percentage and would
      // rather have the full quotient, and a wire format is no place for seventeen decimal places.
      usable_texture_share: Number(metrics.usableShare.toFixed(4)),
      memory: textureCostsFor(config.canvasSize).map((cost) => ({
        format: cost.id,
        bytes: cost.bytes,
        mipmapped_bytes: cost.mipmappedBytes,
      })),
      component_fit:
        fit === null
          ? null
          : {
              target_size: { width: fit.target.width, height: fit.target.height },
              integer_scale: fit.scale,
              placed_size: { width: fit.placedWidth, height: fit.placedHeight },
            },
    },
  };
}

/** The engine spec as the user copies it — two-space indented, the shape importers expect. */
export function formatEngineMetadata(metadata: EngineMetadataJSON): string {
  return JSON.stringify(metadata, null, 2);
}
