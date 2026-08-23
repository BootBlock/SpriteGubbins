import type { PaletteFileFormat } from '../types/paletteFile.ts';

/**
 * What each palette download is called, what it is saved as, and what the browser is told it is.
 *
 * The sheet’s own formats keep the same three facts in `sheetFormats.ts`, keyed by their union for
 * the same reason: a fourth format fails to compile until every one of them has been answered.
 *
 * **The label is the reader’s word, not the identifier.** `Swatch PNG` says what the file is a
 * picture of, and `.gpl` is spelled the way the editors that open it spell it.
 */
export interface PaletteFileType {
  /** What the button reads. */
  readonly label: string;
  /** The extension a saved file takes, without its dot. */
  readonly extension: string;
  /** What the `Blob` is labelled with. */
  readonly mediaType: string;
  /**
   * The file as a phrase mid-sentence, for the accessible name of a button.
   *
   * Three palettes can be downloaded and each offers all three formats, so the visible label is not
   * a name on its own — `Swatch PNG` says which file and nothing about which palette. The button’s
   * accessible name is built from this and the palette’s own description instead.
   */
  readonly phrase: string;
}

export const PALETTE_FILE_TYPES: Readonly<Record<PaletteFileFormat, PaletteFileType>> = {
  SWATCH_PNG: {
    label: 'Swatch PNG',
    extension: 'png',
    mediaType: 'image/png',
    phrase: 'a swatch PNG',
  },
  // `.gpl` has no registered media type — it is a plain-text interchange format — so it takes the
  // generic text type rather than an invented one, which keeps a browser from trying to guess.
  GPL: { label: '.gpl', extension: 'gpl', mediaType: 'text/plain', phrase: 'a GIMP palette' },
  HEX_LIST: { label: 'Hex list', extension: 'txt', mediaType: 'text/plain', phrase: 'a hex list' },
};

/**
 * How many file pixels one colour is drawn as in a swatch PNG.
 *
 * A block rather than a pixel, and the difference is who the file is for. An importer samples the
 * colours and does not care, but the same file is the one a reader opens to check that the palette
 * is the one they meant — and a 64-colour palette one pixel high is a file no viewer will show them
 * anything useful about. Sixteen is large enough to see and small enough that the widest palette a
 * PNG can hold comes to a 4,096-pixel strip.
 */
export const SWATCH_BLOCK_PIXELS = 16;
