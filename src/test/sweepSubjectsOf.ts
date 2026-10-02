import type { SheetSubject, SubjectCategory } from '../types/subject.ts';
import { everyLookWorld, iconCatalogueSubjects } from './iconCatalogueSubjects.ts';
import { standardSubject } from './sheetSubject.ts';

/**
 * The subjects a sweep over a plan table's series walks, for a category whose series ignore the subject
 * and for the one whose series is built from it.
 *
 * Every series but ICON's is fixed once `plansFor` has chosen the table, so one subject declining nothing
 * reaches all of it. ICON's sheets are the reader's roster drawn in their world's looks, so its sweep
 * walks the whole catalogue under every look family and the fallback. Nothing here compiles a prompt,
 * so the sweep can afford every look.
 */
export function sweepSubjectsOf(category: SubjectCategory): readonly SheetSubject[] {
  return category === 'ICON' ? iconCatalogueSubjects(undefined, everyLookWorld()) : [standardSubject()];
}
