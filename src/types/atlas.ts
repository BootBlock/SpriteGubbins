import type { TargetSize } from './output.ts';

/**
 * Texture-atlas planning types.
 *
 * The atlas calculator answers a game-engine question, not a prompt question: given N isolated
 * components and a texture of a given size, how big can each sprite cell be, what does the texture
 * cost in graphics memory, and does the component size the prompt asks for actually fit?
 */

/**
 * Atlas canvas sizes offered — every one a power of two, which is the closed set the whole feature
 * is defined over rather than a preference the user could depart from.
 *
 * That is why {@link AtlasConfig} names this union and not `number`: a non-power-of-two size is not
 * a state this app can reach, so nothing downstream may present "is it a power of two?" as a check
 * the user could fail.
 */
export const ATLAS_CANVAS_SIZES = [512, 1024, 2048, 4096, 8192] as const;
export type AtlasCanvasSize = (typeof ATLAS_CANVAS_SIZES)[number];

/** Bleed-gutter widths offered, in pixels. */
export const ATLAS_PADDING_SIZES = [0, 2, 4, 8, 16] as const;
export type AtlasPadding = (typeof ATLAS_PADDING_SIZES)[number];

/**
 * The calculator's inputs. `componentCount` and `widthBias` come from the current studio
 * configuration (they decide how many cells are needed and how wide the grid should be);
 * `canvasSize` and `padding` are the user's own choices inside the modal.
 */
export interface AtlasConfig {
  readonly canvasSize: AtlasCanvasSize;
  readonly padding: AtlasPadding;
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
  /** Every cell the grid affords — `columns × rows`, filled or not. */
  readonly slots: number;
  /** Slots no component lands in. Texture bought and paid for that holds nothing. */
  readonly emptySlots: number;
  /**
   * The share of the texture (0–1) that lands inside a filled cell's usable bounds.
   *
   * The one figure that prices every kind of waste at once: empty slots, the bleed gutter around
   * each cell, and the strip left over where the grid's shorter axis stops short of the texture
   * edge. A 16:9 sheet's grid on a square texture is the case that makes it visible.
   */
  readonly usableShare: number;
}

/** The formats a packed atlas is realistically uploaded in. See `constants/atlas.ts` for the table. */
export const TEXTURE_FORMAT_IDS = ['rgba8', 'block_compressed'] as const;
export type TextureFormatId = (typeof TEXTURE_FORMAT_IDS)[number];

/**
 * How one texture format encodes texels, which is all that decides what a texture of a given size
 * costs.
 *
 * Expressed as a block rather than as bytes-per-texel because that is what the formats actually
 * are, and because it is the only way to price the bottom of a mip chain honestly: a 2 × 2 level of
 * a BC7 texture still occupies one whole 16-byte block, not a quarter of one.
 */
export interface TextureFormat {
  readonly id: TextureFormatId;
  readonly label: string;
  /** Edge of the square block the format encodes. `1` for an uncompressed format. */
  readonly blockSize: number;
  /** Bytes one block occupies. */
  readonly bytesPerBlock: number;
}

/** What one format costs for one texture, with the mip chain priced separately. */
export interface TextureCost {
  readonly id: TextureFormatId;
  readonly label: string;
  /** Bytes the base level alone occupies. */
  readonly bytes: number;
  /** Bytes the base level and every mip level below it occupy together. */
  readonly mipmappedBytes: number;
}

/**
 * Whether the component size the prompt asks for fits the cell this atlas affords, and at what
 * scale.
 *
 * The scale is a **whole number**, and that is the point of the type rather than an approximation
 * in it. Artwork placed at 2.37× is resampled, which is the one thing a sprite atlas must not do to
 * pixel art — so the useful answer is the largest integer multiple that still fits, and `0` when
 * even 1:1 does not.
 */
export interface SpriteFit {
  /** The component size the studio's prompt asks for, in art pixels. */
  readonly target: TargetSize;
  /** Largest whole-number scale at which the component fits the usable cell; `0` when none does. */
  readonly scale: number;
  /** The component's footprint in texture pixels at that scale — zero where it does not fit. */
  readonly placedWidth: number;
  readonly placedHeight: number;
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
    readonly empty_slots: number;
    /** Share of the texture (0–1) holding artwork, to four decimal places. */
    readonly usable_texture_share: number;
    readonly memory: readonly {
      readonly format: TextureFormatId;
      readonly bytes: number;
      readonly mipmapped_bytes: number;
    }[];
    /** `null` where the studio names no component size, so there is nothing to check against. */
    readonly component_fit: {
      readonly target_size: { readonly width: number; readonly height: number };
      readonly integer_scale: number;
      readonly placed_size: { readonly width: number; readonly height: number };
    } | null;
  };
}
