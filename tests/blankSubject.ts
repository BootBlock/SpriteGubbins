import { SUBJECT_FIELD_KEYS, type SubjectDefinition } from '../src/types/subject.ts';

/**
 * A subject with every field cleared, for a suite that compiles a prompt and needs the subject to
 * contribute nothing but its category.
 */
export const BLANK_SUBJECT = Object.fromEntries(
  SUBJECT_FIELD_KEYS.map((key) => [key, '']),
) as SubjectDefinition;
