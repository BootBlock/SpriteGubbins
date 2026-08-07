import { IDENTITY_PALETTE_LABEL, IDENTITY_SEGMENT_SEPARATOR } from '../constants/identityLock.ts';

/**
 * Folding an extracted palette into an identity digest the user is writing.
 *
 * The digest is theirs — `baseline-prompt-new.md` §5 asks for concrete prose about the subject, and
 * only the palette line can be derived from the sheet. So this is **additive**: whatever they have
 * written survives, and the palette joins it.
 */

/**
 * The digest with its palette segment set to `palette`, replacing an earlier one rather than
 * accumulating.
 *
 * Replacing matters because re-reading is the expected second use: a rig is eight sheets, and
 * dropping the next accepted one must not leave two disagreeing palettes in a field that says
 * "reproduce exactly". Matching is by the segment's label, so a palette the user has since edited by
 * hand is still recognised as the one being replaced.
 *
 * An empty `palette` removes the segment and leaves the prose, which is what a sheet with nothing on
 * it but its key field should do — better than an empty `Palette:` in the highest-weighted section
 * of the prompt, which is §1's whole complaint about content-shaped tokens.
 *
 * Two liberties are taken with the punctuation, and neither touches a word: segments are re-joined
 * with the canonical separator, so `a;b` comes back as `a; b`; and empty segments are dropped, so a
 * stray `a;;` comes back as `a`. Everything the user actually wrote survives.
 */
export function withPaletteSegment(digest: string, palette: readonly string[]): string {
  const kept = digest
    .split(';')
    .map((segment) => segment.trim())
    .filter((segment) => segment !== '' && !isPaletteSegment(segment));

  const segments =
    palette.length === 0 ? kept : [...kept, `${IDENTITY_PALETTE_LABEL}: ${palette.join(', ')}`];

  return segments.join(IDENTITY_SEGMENT_SEPARATOR);
}

/** Whether a segment is the palette one, however the user has since capitalised or spaced it. */
function isPaletteSegment(segment: string): boolean {
  return segment.toLowerCase().startsWith(`${IDENTITY_PALETTE_LABEL.toLowerCase()}:`);
}
