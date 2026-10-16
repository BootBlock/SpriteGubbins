import { PALETTE_FILE_TYPES } from './paletteFiles.ts';

/**
 * What the reader's own palette is called with no name, how long a name it may carry, and which
 * files the chooser offers to read one out of.
 *
 * Its ceiling is not here: a custom palette may hold as many colours as a palette can be *stated*
 * in, which is `MAX_PALETTE_ENTRIES` — the same ceiling the swatch download is bounded by, and the
 * figure past which `encodePng` stops writing a palette at all. A second ceiling written here would
 * be a second answer to one question.
 */

/**
 * What a palette is called when nothing named it.
 *
 * **A label, not a phrase**, because a palette's name is read into four different sentences and only
 * a label fits all four. It follows an article on the Quantise tab — "the Custom setting travels
 * with the sheet" — takes the word "palette" after it in the download's accessible name, stands
 * alone in the studio's collapsed header, and follows a dash in the compiled prompt's heading. A
 * possessive phrase read correctly in the prompt and broke the other three: "the your own palette
 * setting" and "Download your own palette palette".
 *
 * The one sentence it reads less well in is section 2's "one of the 24 colours of Custom", which
 * states it as though the reader had named their palette that. A reader who minds names it, and a
 * name is the only thing that could read better there.
 *
 * A pasted list names nothing, and neither does a swatch picture whose file name was `palette.png`,
 * so this is the common case rather than the odd one.
 */
export const DEFAULT_CUSTOM_PALETTE_NAME = 'Custom';

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
 * A second spelling of the hex list, for the readers whose editor saves it as `.hex`.
 *
 * Not a fourth format and not a download this app offers: `parsePaletteText` reads it as the hex
 * list it is. It is here rather than in `PALETTE_FILE_TYPES` because that record says what this app
 * *writes*, and a chooser has to take what the reader already has.
 */
const ALSO_READ = '.hex';

/**
 * What the palette chooser offers, as the `accept` attribute spells it.
 *
 * **Derived from the formats `PaletteDownload` writes**, rather than written out again — the three
 * of them, each with the extension and the media type `PALETTE_FILE_TYPES` records. A hand-written
 * copy is a second place a fourth format would have to be added, and the one that would be
 * forgotten is the one a reader could export and then not load back.
 *
 * Both spellings of each, because a file dragged from a phone or a cloud drive often arrives with a
 * media type and no extension, or the other way about.
 */
export const CUSTOM_PALETTE_ACCEPT = [
  ...new Set(Object.values(PALETTE_FILE_TYPES).flatMap((type) => [`.${type.extension}`, type.mediaType])),
  ALSO_READ,
].join(',');
