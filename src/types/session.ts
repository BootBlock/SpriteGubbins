import type { OutputConfig } from './output.ts';
import type { SubjectCategory, SubjectDefinition } from './subject.ts';

/**
 * The studio as it was left — everything the Studio tab holds that the user chose.
 *
 * The same three parts a preset carries, and deliberately so: a session *is* a subject, the category
 * it was written for, and the output configuration around it. What separates the two is intent. A
 * preset is a named thing someone decided to keep and can load again; a session is the unnamed
 * current state, which nobody chose to save and which there is only ever one of. That is why this
 * has no `id` and no `name` — there is nothing to tell one apart from another.
 *
 * The category travels with the subject because a subject only means anything against it: the field
 * keys are shared across categories but their option pools are not, so restoring answers written for
 * a creature into the building form would keep every value and mean something else by all of them.
 */
export interface StudioSession {
  readonly category: SubjectCategory;
  readonly subject: SubjectDefinition;
  readonly output: OutputConfig;
}
