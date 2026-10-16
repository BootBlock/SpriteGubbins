import type { SubjectFieldKey } from '../types/subject.ts';

/**
 * The DOM `id` a subject field's text input carries, derived from its key.
 *
 * Predictable for the reason `sectionElementId` gives: `SubjectForm` writes it, and a control that
 * never sees the field moves focus to it — the icon roster's way to *World & Era*
 * (`useRevealSubjectField`). The panel renders each key once, so the key is the whole derivation, and
 * the prefix keeps it from colliding with an id from anywhere else.
 */
export function subjectFieldInputId(key: SubjectFieldKey): string {
  return `subject-field-${key}`;
}
