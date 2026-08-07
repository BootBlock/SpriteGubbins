/**
 * The shape of an identity digest's palette segment.
 *
 * `baseline-prompt-new.md` §5 is the source: a lock reproduces because it states **concrete,
 * countable** attributes, and a list of hex codes is the most literally countable line it can carry
 * — and the one nobody can write accurately by eye.
 */

/**
 * How many colours the extracted palette segment states.
 *
 * Deliberately **not** the sheet's colour budget, which is 32–128. The digest lands in section 1 of
 * the prompt, the highest-weighted part of it, where a wall of hex would drown the countable
 * attributes that are the reason the lock works at all. Six is a base, a mid, a shadow and up to
 * three accents — about what someone would name describing the character to another artist, and the
 * scale §5's own worked example is written at.
 */
export const IDENTITY_PALETTE_SIZE = 6;

/** What the palette segment is called — and therefore what replacing an earlier one looks for. */
export const IDENTITY_PALETTE_LABEL = 'Palette';

/**
 * What separates one segment of a digest from the next.
 *
 * The lock is a single-line field, as its placeholder shows, so the palette joins the prose on that
 * line rather than following it on one of its own. A semicolon rather than a comma because the
 * palette is itself comma-separated.
 */
export const IDENTITY_SEGMENT_SEPARATOR = '; ';
