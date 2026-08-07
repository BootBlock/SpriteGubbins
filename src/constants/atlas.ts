import { ATLAS_CANVAS_SIZES, ATLAS_PADDING_SIZES } from '../types/atlas.ts';
import type { AtlasCanvasSize, AtlasPadding } from '../types/atlas.ts';

/**
 * Labels and guidance for the atlas calculator's two controls.
 *
 * The sizes themselves are in `types/atlas.ts`, because they are the domain's closed sets; what each
 * one is *for* is presentation, and lives here so the modal carries no option list of its own.
 */

/** What each texture size is used for in practice. Sizes come from {@link ATLAS_CANVAS_SIZES}. */
const CANVAS_SIZE_NOTES: Readonly<Record<AtlasCanvasSize, string>> = {
  512: 'Low-poly retro',
  1024: 'Standard SD',
  2048: 'HD atlas — recommended',
  4096: 'Ultra HD master atlas',
  8192: 'Extreme resolution',
};

/** What each gutter width buys. Widths come from {@link ATLAS_PADDING_SIZES}. */
const PADDING_NOTES: Readonly<Record<AtlasPadding, string>> = {
  0: 'No padding',
  2: 'Light gutter',
  4: 'Standard gutter — recommended',
  8: 'Wide bleed buffer',
  16: 'Maximum isolation',
};

export const ATLAS_CANVAS_CHOICES = ATLAS_CANVAS_SIZES.map((value) => ({
  value,
  label: `${value} × ${value} px (${CANVAS_SIZE_NOTES[value]})`,
}));

export const ATLAS_PADDING_CHOICES = ATLAS_PADDING_SIZES.map((value) => ({
  value,
  label: `${value} px (${PADDING_NOTES[value]})`,
}));

/** The configuration the calculator opens on — a 2048px texture with a standard gutter. */
export const DEFAULT_ATLAS_CANVAS_SIZE: AtlasCanvasSize = 2048;
export const DEFAULT_ATLAS_PADDING: AtlasPadding = 4;

export const ATLAS_TOOLTIPS = {
  canvasSize:
    'Target texture atlas dimensions. 2048px suits high-definition mobile and desktop engines; larger textures cost VRAM on every platform that loads them.',
  padding:
    'Inner padding around each sprite cell, which stops neighbouring cells bleeding into one another when the texture is filtered or mipmapped by the engine.',
} as const;
