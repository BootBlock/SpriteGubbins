import type { PaletteFileFormat } from '../types/paletteFile.ts';
import { MAX_PALETTE_ENTRIES } from '../utils/pngPalette.ts';

/**
 * What each palette download is called, what it is saved as, what the browser is told it is, and how
 * many colours it can carry.
 *
 * The sheet’s own formats keep the same facts in `sheetFormats.ts`, keyed by their union for the
 * same reason: a fourth format fails to compile until every one of them has been answered.
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
  /**
   * The most colours this file can carry, or `null` where it can carry any number.
   *
   * **The swatch is the one that is bounded, and it has to be.** A list of colours only becomes a
   * palette a tool can use at a size a tool will take, and nothing upstream of the download caps
   * one: the `UNRESTRICTED` colour budget reduces nothing, so a result can arrive carrying ten
   * thousand distinct colours. Drawn at a block each that is a 160,000-pixel strip — a picture no
   * viewer shows anything useful about, larger than the sheet it came off, and built on the thread
   * the reader is waiting on. {@link MAX_PALETTE_ENTRIES} is the honest ceiling because it is the
   * one a palette can actually be *stated* in: past it `encodePng` writes truecolour, so the file
   * would no longer be carrying a palette at all.
   *
   * The two text forms are unbounded because neither cost applies — a hex list of ten thousand
   * colours is 80 kB of string, and it is the form to reach for when there are that many.
   * `PaletteDownload` offers only the formats a palette fits.
   */
  readonly maxEntries: number | null;
}

export const PALETTE_FILE_TYPES: Readonly<Record<PaletteFileFormat, PaletteFileType>> = {
  SWATCH_PNG: {
    label: 'Swatch PNG',
    extension: 'png',
    mediaType: 'image/png',
    phrase: 'a swatch PNG',
    maxEntries: MAX_PALETTE_ENTRIES,
  },
  // `.gpl` has no registered media type — it is a plain-text interchange format — so it takes the
  // generic text type rather than an invented one, which keeps a browser from trying to guess.
  GPL: {
    label: '.gpl',
    extension: 'gpl',
    mediaType: 'text/plain',
    phrase: 'a GIMP palette',
    maxEntries: null,
  },
  HEX_LIST: {
    label: 'Hex list',
    extension: 'txt',
    mediaType: 'text/plain',
    phrase: 'a hex list',
    maxEntries: null,
  },
};

/**
 * How many file pixels one colour is drawn as in a swatch PNG.
 *
 * A block rather than a pixel, and the difference is who the file is for. An importer samples the
 * colours and does not care, but the same file is the one a reader opens to check that the palette
 * is the one they meant — and a 64-colour palette one pixel high is a file no viewer will show them
 * anything useful about. Sixteen is large enough to see, and against the entry ceiling above it puts
 * the widest swatch this app writes at 4,096 × 16 pixels.
 */
export const SWATCH_BLOCK_PIXELS = 16;
