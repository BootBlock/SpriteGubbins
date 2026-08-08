import {
  IDENTITY_PALETTE_LABEL,
  IDENTITY_SEGMENT_SEPARATOR,
  IDENTITY_VALUE_SEPARATOR,
} from '../constants/identityLock.ts';

/**
 * Folding a derived segment into an identity digest the user is writing.
 *
 * The digest is theirs — `baseline-prompt-new.md` §5 asks for concrete prose about the subject, and
 * the app can only ever offer a starting point for it. So this is **additive**: whatever they have
 * written survives, and the derived segments join it.
 *
 * Two things are derived, and they share this one mechanism rather than having one each. The palette
 * is read out of an accepted sheet's pixels (`identityPalette.ts`); the prose is restated from the
 * subject definition (`identitySubject.ts`). Both land as labelled segments, both replace their own
 * earlier value, and neither may touch the other's or the user's.
 */

/** One labelled segment of a digest, as a caller asks for it to be written. */
export interface DigestSegment {
  readonly label: string;
  /**
   * What the segment states.
   *
   * A value that holds no content once the separator has been taken out of it **removes** the
   * segment rather than writing an empty one — an empty `Palette:` in the highest-weighted section
   * of the prompt is §1's whole complaint about content-shaped tokens. Both controls decide for
   * themselves whether to ask for that: each leaves the digest alone rather than folding an empty
   * segment in, because the value a user has since edited by hand is the one that would be deleted.
   */
  readonly value: string;
}

/**
 * The digest with each of `segments` written to its label, replacing an earlier value rather than
 * accumulating one.
 *
 * Replacing matters because re-deriving is the expected second use: a rig is eight sheets, and
 * dropping the next accepted one must not leave two disagreeing palettes in a field that says
 * "reproduce exactly". Matching is by the segment's label, so a value the user has since edited by
 * hand is still recognised as the one being replaced.
 *
 * **A replaced segment keeps its position; only a genuinely new one is appended.** With one derived
 * segment that distinction was invisible, and this moved the palette to the end. What it buys is
 * stability *between* the two controls: once both have been pressed, pressing either again leaves
 * the whole line as it was. Re-appending would instead shuffle the palette to the end every time the
 * subject was re-described, and the prose back past it every time a sheet was read — so the same
 * content would take a different shape depending on which control was pressed last, and the user's
 * own writing would drift away from wherever they put it.
 *
 * Three liberties are taken with the punctuation, and none of them loses a word: segments are
 * re-joined with the canonical separator, so `a;b` comes back as `a; b`; empty segments are dropped,
 * so a stray `a;;` comes back as `a`; and a separator *inside* a written value is demoted to the
 * value separator — see {@link withoutSeparator}, which is a correctness fix rather than a tidy-up.
 */
export function withSegments(digest: string, segments: readonly DigestSegment[]): string {
  // Normalised up front, so the emptiness test below is made against what will actually be written
  // rather than against what was asked for: a value that is nothing but separators has no content.
  const writing = segments.map(({ label, value }) => ({ label, value: withoutSeparator(value) }));

  const written = new Set<string>();
  const kept: string[] = [];

  for (const existing of digest.split(';').map((segment) => segment.trim())) {
    if (existing === '') continue;

    const match = writing.find((segment) => hasLabel(existing, segment.label));
    if (match === undefined) {
      kept.push(existing);
      continue;
    }

    // A second segment carrying the same label — hand-pasted, or left behind by an earlier version
    // of the digest — collapses into the first rather than repeating the new value beside it.
    if (written.has(match.label)) continue;
    written.add(match.label);
    if (match.value !== '') kept.push(format(match));
  }

  for (const segment of writing) {
    if (written.has(segment.label) || segment.value === '') continue;
    written.add(segment.label);
    kept.push(format(segment));
  }

  return kept.join(IDENTITY_SEGMENT_SEPARATOR);
}

/**
 * The digest with its palette segment set to `palette`.
 *
 * A named operation rather than a `withSegments` call at the component, because which label the
 * colours take and how they are punctuated is domain knowledge about the digest — testable here, and
 * out of reach of the impure decode that produces them.
 */
export function withPaletteSegment(digest: string, palette: readonly string[]): string {
  return withSegments(digest, [
    { label: IDENTITY_PALETTE_LABEL, value: palette.join(IDENTITY_VALUE_SEPARATOR) },
  ]);
}

/**
 * A value with the *segment* separator taken out of it, and its clause breaks kept as value
 * separators.
 *
 * Without this a segment carrying a `;` is not read back as a segment: the next fold splits the
 * digest on `;`, so `Features: a; b` returns as `Features: a` beside a stray `b` indistinguishable
 * from the user's own prose — and each press then re-emits the whole value next to the orphan, so
 * the digest **grows without bound** in the highest-weighted section of the prompt. Hex codes never
 * carry one, which is why the palette never met this; every subject field is an unfiltered combo
 * box, and `;` is the character the identity lock's own placeholder uses to join clauses.
 *
 * Demoted rather than escaped. An escape sequence would survive into the compiled prompt as exactly
 * the content-shaped token §1's optional-line rule keeps out, and `, ` is already what the digest
 * puts between values inside a segment — so the break the user typed is kept rather than lost.
 */
function withoutSeparator(value: string): string {
  return value
    .split(';')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .join(IDENTITY_VALUE_SEPARATOR);
}

/** Whether a segment carries this label, however the user has since capitalised or spaced it. */
function hasLabel(segment: string, label: string): boolean {
  return segment.toLowerCase().startsWith(`${label.toLowerCase()}:`);
}

/** One segment as the digest writes it. */
function format({ label, value }: DigestSegment): string {
  return `${label}: ${value}`;
}
