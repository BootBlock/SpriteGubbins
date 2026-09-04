import { CATEGORY_OPTIONS } from '../constants/categories/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/camera.ts';
import { modesFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { SheetPlan } from '../types/components.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * Every sheet a category can be asked for: each mode it supports, under each direction set, and
 * every sheet of the series that pairing produces.
 *
 * Every sheet rather than the default one, because what the callers ask is a claim about the
 * *category* and not about one configuration — a word grounded only in the default pairing is a word
 * the other sheets of the same deliverable never write.
 */
export function everySheetOf(category: SubjectCategory): readonly SheetPlan[] {
  return modesFor(category).flatMap((mode) =>
    (Object.keys(DIRECTION_LISTS) as DirectionSet[]).flatMap((set) => [
      ...sheetSeriesFor(category, mode, set),
    ]),
  );
}

/**
 * Everything a category writes about its own subject — every sheet plan of every mode, under every
 * direction set it can be asked for, plus the name it goes by in the selector.
 *
 * This is the corpus two different claims are grounded against: that section 0 prices a category in
 * a noun that category's own sheets use (`promptText/subject.test.ts`), and that section 3's
 * landmark rule names pieces that category's own sheets list (`promptText/landmarks.test.ts`). Both
 * ask the same question — is this word one this category writes — so both read the same corpus, and
 * a second copy of this walk is a second place for a plan shape to be missed.
 *
 * **The selector's label is the second source because two categories are grounded by nothing else.**
 * `creature` appears in no CREATURE plan — that category's plans list a head, a body, hindquarters
 * and limb segments — and `building` in no BUILDING plan, whose plans list tiles, bays and roof
 * sections. `Creature / Monster` and `Building / Environment Tile` are where each writes its own
 * name. `CATEGORY_ASSEMBLY` was tried as a third source and grounds nothing that these two do not,
 * so it is deliberately absent: a source that never decides an answer is a source nobody can tell
 * has stopped working.
 */
export function categoryProseFor(category: SubjectCategory): string {
  const written: string[] = [CATEGORY_OPTIONS[category].label];
  for (const plan of everySheetOf(category)) {
    written.push(plan.name, plan.assembly);
    for (const group of plan.groups) {
      written.push(group.heading ?? '', group.intro ?? '', group.outro ?? '');
      for (const entry of group.entries) written.push(entry.label, entry.text);
    }
  }
  return written.join('\n');
}
