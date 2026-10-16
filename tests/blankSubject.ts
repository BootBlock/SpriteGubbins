import { SUBJECT_FIELD_KEYS, type SubjectDefinition, type SubjectFieldKey } from '../src/types/subject.ts';

/**
 * A subject with every field cleared, for a suite that compiles a prompt and needs the subject to
 * contribute nothing but its category. It carries no icon roster, so an ICON prompt compiled from it
 * is the overlay sheet alone.
 */
export const BLANK_SUBJECT: SubjectDefinition = Object.fromEntries(
  SUBJECT_FIELD_KEYS.map((key) => [key, '']),
) as Record<SubjectFieldKey, string>;
