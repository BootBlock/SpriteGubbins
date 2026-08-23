import type { Rgba } from './quantiser.ts';

/**
 * The files a settled palette can leave the app as, and the palette itself on its way out.
 *
 * Its own file rather than a corner of `types/palette.ts`, which is about the machine palettes the
 * studio pins: this is the vocabulary of the **download**, and the three palettes it can be handed
 * come from three different places — a pinned machine, a lock held across a series, and the colours
 * a reduction settled on. What they have in common is the only thing a writer needs.
 */

/**
 * The formats, in the order the controls offer them.
 *
 * The `as const` array is the union’s single definition, as `SHEET_FORMATS` is for the sheet’s own
 * downloads. Ordered by what reads them: the swatch picture leads because it is the one an engine
 * imports and the reason this feature exists, `.gpl` follows as the form a pixel editor opens, and
 * the hex list is last because it is for a person rather than a program.
 */
export const PALETTE_FILE_FORMATS = ['SWATCH_PNG', 'GPL', 'HEX_LIST'] as const;

export type PaletteFileFormat = (typeof PALETTE_FILE_FORMATS)[number];

/**
 * A palette that has been settled, and what to call it.
 *
 * The name is what the file is named after and what a `.gpl` records inside itself, so it is the
 * reader’s own word for this palette — a machine, or the sheet the colours were taken from — rather
 * than an identifier. The entries are opaque and ordered; see `imagePaletteEntries` for the order
 * the two image-derived palettes arrive in.
 */
export interface SettledPalette {
  readonly name: string;
  readonly entries: readonly Rgba[];
}

/**
 * What a palette writer hands back: the bytes, and how many colours went into them.
 *
 * One shape rather than a discriminated union, unlike `WrittenSheet` — deliberately, because the
 * three writers here differ in nothing a caller can act on. A sheet download reports frames, tags,
 * sprite counts and whether a palette fitted, none of which mean anything in the other formats; a
 * palette file is bytes and a count in all three. Handing the format back as well would be handing
 * the caller the argument it just passed in.
 */
export interface WrittenPalette {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly entries: number;
}
