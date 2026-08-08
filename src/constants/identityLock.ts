import type { SubjectFieldKey } from '../types/subject.ts';

/**
 * The shape of an identity digest: the labelled segments it is made of, and which of them the app
 * can derive rather than leaving to the user.
 *
 * `baseline-prompt-new.md` §5 is the source: a lock reproduces because it states **concrete,
 * countable** attributes, and its worked example is four labelled lines — three of prose about the
 * subject, one of hex codes. Two of those four are derivable here. The palette is read out of an
 * accepted sheet's pixels; the prose is restated from the studio's own answers, which the user has
 * already given once and should not have to type again.
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

/**
 * What separates one value from the next *inside* a segment.
 *
 * Both derived segments are lists — six hex codes, or three subject fields — and a digest whose two
 * lists punctuated differently would read as an authoring error rather than as a distinction.
 */
export const IDENTITY_VALUE_SEPARATOR = ', ';

/** One derived prose segment: what it is called, and which subject fields it states. */
export interface IdentitySubjectSegment {
  readonly label: string;
  readonly keys: readonly SubjectFieldKey[];
}

/**
 * The three prose segments derived from the subject definition, and the fields each one restates.
 *
 * **The labels name the slot, not the category** — the same trap `constants/subjectGroups.ts`
 * documents. Every category shares these sixteen keys under completely different labels, so
 * `face_head` is *Face, Hair & Head* on a character, *Cockpit & Front Face* on a vehicle and *Grip &
 * Pommel* on an item. `Features` is true of every one of them; `Head` would be true of one.
 *
 * **Ten of the sixteen fields are here.** The digest states what the subject *looks like*, so the
 * six that are not fall into three groups, each excluded for its own reason:
 *
 * - `gender`, `age`, `role` and `setting` are section 1's opening context — who the subject is,
 *   when and where it belongs. Each is a premise the *other* fields were chosen against rather than
 *   a feature drawn on the sheet, and section 1 already carries all four at full weight above the
 *   lock. `role` is the one that would actively cost something: section 1 ends "Do not infer props,
 *   weapons or equipment from the role", so restating it under *Reproduce exactly* invites the
 *   inference that sentence forbids.
 * - `additional_anatomy` is the one subject field with consequences past the prompt text. Section 4
 *   lists each named piece separately and counts it, and section 0's precedence order puts the count
 *   and inventory **above** subject identity — so the sheet already pins it harder than the lock
 *   could, and a count restated in two places is a count that can disagree with itself.
 * - `exclusions` is the one negative field. Section 8 owns it, and an absence has no place in a
 *   block headed "reproduce exactly".
 *
 * Ten fields across three segments comes out at the scale §5's worked example is written at: 243 to
 * 311 characters across every category's shipped defaults, against 197 of prose there and 275
 * with its palette line. `IDENTITY_PALETTE_SIZE`'s reasoning applies unchanged — brevity is a
 * correctness property here, not a style one — so a fourth segment is a decision about what the
 * lock can afford to say, not a free addition.
 */
export const IDENTITY_SUBJECT_SEGMENTS: readonly IdentitySubjectSegment[] = [
  // Coarse to fine: what it is, the body plan it is built on, the mass hung off that, and the
  // outline the whole thing reads as.
  { label: 'Form', keys: ['species', 'anatomy', 'build', 'silhouette'] },
  { label: 'Features', keys: ['face_head', 'clothing', 'worn_details'] },
  // Not `Palette`, which is the measured segment sitting beside it, and not the subject panel's own
  // *Colour & materials* heading, which is too long for a label repeated on one line. The two are
  // the same claim at two fidelities — the colours and surfaces the user asked for, and the hex
  // codes a delivered sheet turned out to be made of — and both are worth carrying.
  { label: 'Colour', keys: ['primary_colours', 'accent_colours', 'materials'] },
];
