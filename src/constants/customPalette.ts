/**
 * What the reader's own palette is called with no name, how long a name it may carry, and which
 * files the chooser offers to read one out of.
 *
 * Its ceiling is not here: a custom palette may hold as many colours as a palette can be *stated*
 * in, which is `MAX_PALETTE_ENTRIES` — the same 256 the swatch download is bounded by, and the
 * figure past which `encodePng` stops writing a palette at all. A second ceiling written here would
 * be a second answer to one question.
 */

/**
 * What a palette is called when nothing named it.
 *
 * It reaches the compiled prompt mid-sentence — "every pixel is one of the 24 colours of your own
 * palette" — so it is a phrase rather than a label, and it is addressed to the reader in the voice
 * the rest of the app's copy is written in. A pasted list names nothing, and neither does a swatch
 * picture whose file name was `palette.png`, so this is the common case rather than the odd one.
 */
export const DEFAULT_CUSTOM_PALETTE_NAME = 'your own palette';

/**
 * How long that name may be.
 *
 * The name is the one part of a custom palette that reaches the prompt as prose, and a `.gpl`'s
 * `Name:` header is free text a writing tool may have filled with a path or a sentence. Sixty
 * characters is longer than any palette anybody names and short enough that it cannot become a
 * paragraph in the middle of section 2.
 */
export const CUSTOM_PALETTE_NAME_LIMIT = 60;

/**
 * What the palette chooser offers, as the `accept` attribute spells it.
 *
 * The three forms `PaletteDownload` writes, and nothing else. `.txt` is there because that is what a
 * browser saves a hex list as and what most palette sites hand out, and the media types sit beside
 * the extensions because a file dragged from a phone or a cloud drive often arrives with one and
 * not the other.
 */
export const CUSTOM_PALETTE_ACCEPT = 'image/png,.png,.gpl,.txt,.hex,text/plain';
