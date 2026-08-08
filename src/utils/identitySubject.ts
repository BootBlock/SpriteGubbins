import { IDENTITY_SUBJECT_SEGMENTS, IDENTITY_VALUE_SEPARATOR } from '../constants/identityLock.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import type { DigestSegment } from './identityDigest.ts';

/**
 * The prose an identity digest can state about the subject without the user retyping it.
 *
 * This is the other half of what `identityPalette.ts` does for the colours. §5's digest is four
 * labelled lines and the app derived one of them, so the load-bearing half — the concrete prose that
 * makes sheet two match sheet one — was left to a single-line field the user filled in from scratch
 * and then had to keep true across every sheet of a rig. The studio already holds most of that
 * answer: section 1 of the prompt is compiled from these same fields.
 *
 * **A derivation, not a computed field.** The lock stays the user's to edit — what actually holds a
 * series together is concrete detail read off the sheet they accepted ("three amber chest lights in
 * a vertical row"), and the studio's vocabulary is a starting point for writing that, never a
 * substitute for it.
 *
 * Pure, and independent of the category: the seven categories label these sixteen keys differently but
 * carry the same keys, so a segment written against the keys is right in all of them. Which keys
 * each segment states — and why six of the sixteen state nothing — is `IDENTITY_SUBJECT_SEGMENTS`.
 */
export function identitySubjectSegments(subject: SubjectDefinition): readonly DigestSegment[] {
  return IDENTITY_SUBJECT_SEGMENTS.map(({ label, keys }) => ({
    label,
    // A cleared field says "you decide" everywhere else in this app — the compiler drops its line
    // rather than emitting an empty one — so it contributes nothing here either, and a segment whose
    // fields are all cleared comes back empty and is removed from the digest by `withSegments`.
    value: keys
      .map((key) => subject[key].trim())
      .filter((value) => value !== '')
      .join(IDENTITY_VALUE_SEPARATOR),
  }));
}
