/**
 * Texture-atlas planning types.
 *
 * The atlas calculator answers a game-engine question, not a prompt question: given N isolated
 * components and a texture of a given size, how big can each sprite cell be, and does the
 * texture stay GPU-friendly?
 */

/** Atlas canvas sizes offered. All powers of two — see `AtlasMetrics.isPowerOfTwo`. */
export const ATLAS_CANVAS_SIZES = [512, 1024, 2048, 4096, 8192] as const;
export type AtlasCanvasSize = (typeof ATLAS_CANVAS_SIZES)[number];

/** Bleed-gutter widths offered, in pixels. */
export const ATLAS_PADDING_SIZES = [0, 2, 4, 8, 16] as const;
export type AtlasPadding = (typeof ATLAS_PADDING_SIZES)[number];

/**
 * The calculator's inputs. `componentCount` and `aspectRatio` come from the current output
 * configuration (they decide how many cells are needed and how wide the grid should be);
 * `canvasSize` and `padding` are the user's own choices inside the modal.
 */
export interface AtlasConfig {
  readonly canvasSize: number;
  readonly padding: number;
  readonly componentCount: number;
  /** Governs the grid's column bias — a 16:9 sheet wants a wider grid than a square one. */
  readonly widthBias: number;
}

/** Everything derived from an {@link AtlasConfig}. Pure output — see `utils/atlasCalculator.ts`. */
export interface AtlasMetrics {
  readonly columns: number;
  readonly rows: number;
  /** Edge length of one grid cell, in pixels. */
  readonly cellSize: number;
  /** Edge length actually available to artwork once the bleed gutter is removed both sides. */
  readonly usableBounds: number;
  /**
   * Whether the canvas is a power of two. Non-PO2 textures cost VRAM on older GPUs and can lose
   * mipmapping, so this drives the calculator's status badge.
   */
  readonly isPowerOfTwo: boolean;
}

/**
 * The exported engine spec, shaped for Godot / Unity / PixiJS importers.
 *
 * `snake_case` throughout, deliberately: this is a wire format that leaves the app and gets
 * read by a tool or a script, so it follows the conventions of the engines consuming it rather
 * than the app's own TypeScript style. Changing a key here breaks somebody's importer.
 */
export interface EngineMetadataJSON {
  readonly atlas: {
    readonly texture_size: string;
    readonly total_components: number;
    readonly grid: { readonly columns: number; readonly rows: number };
    readonly cell_size: { readonly width: number; readonly height: number };
    readonly padding: number;
    readonly usable_sprite_bounds: { readonly width: number; readonly height: number };
    readonly power_of_two_vram_optimized: boolean;
  };
}
