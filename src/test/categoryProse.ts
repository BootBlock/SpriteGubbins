import { CATEGORY_OPTIONS } from '../constants/categories/index.ts';
import { DIRECTION_LISTS } from '../constants/promptText/camera.ts';
import { modesFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { SheetPlan, SheetSeries } from '../types/components.ts';
import type { DirectionSet } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * Every series a category can be asked for: each mode it supports, under each direction set.
 *
 * A series is the granularity a claim about *one deliverable* is made at, because every sheet of it
 * is generated under one output configuration. `SheetPlan.scaleUnit` is the claim that needs it: a
 * unit may differ between BACKGROUND's two modes and may not differ between the sheets of one series.
 */
export function everySeriesOf(category: SubjectCategory): readonly SheetSeries[] {
  return modesFor(category).flatMap((mode) =>
    (Object.keys(DIRECTION_LISTS) as DirectionSet[]).map((set) => sheetSeriesFor(category, mode, set)),
  );
}

/**
 * Every sheet a category can be asked for: every sheet of every series {@link everySeriesOf} walks.
 *
 * Every sheet rather than the default one, because what the callers ask is a claim about the
 * *category* and not about one configuration — a word grounded only in the default pairing is a word
 * the other sheets of the same deliverable never write.
 */
export function everySheetOf(category: SubjectCategory): readonly SheetPlan[] {
  return everySeriesOf(category).flat();
}

/**
 * Everything a category writes about its own subject on the given sheets, plus the name it goes by
 * in the selector.
 *
 * This is the corpus two different claims are grounded against: that section 2 prices a series in a
 * noun that series' own sheets use (`utils/sheetPlans.test.ts`, handed one series at a time), and
 * that section 3's landmark rule names pieces that category's own sheets list
 * (`promptText/landmarks.test.ts`, handed {@link categoryProseFor}). Both ask the same question — is
 * this word one these sheets write — so both read the same sources, and a second copy of that list
 * is a second place for a plan shape to be missed.
 *
 * **The selector's label is the second source because two categories are grounded by nothing else.**
 * `creature` appears in no CREATURE plan — that category's plans list a head, a body, hindquarters
 * and limb segments — and `building` in no BUILDING plan, whose plans list tiles, bays and roof
 * sections. `Creature / Monster` and `Building / Environment Tile` are where each writes its own
 * name. `CATEGORY_ASSEMBLY` was tried as a third source and grounds nothing that these two do not,
 * so it is deliberately absent: a source that never decides an answer is a source nobody can tell
 * has stopped working.
 */
export function sheetsProseFor(category: SubjectCategory, sheets: readonly SheetPlan[]): string {
  return [CATEGORY_OPTIONS[category].label, ...sheets.map(planProseFor)].join('\n');
}

/** Everything a category writes about its own subject, over every sheet it can be asked for. */
export function categoryProseFor(category: SubjectCategory): string {
  return sheetsProseFor(category, everySheetOf(category));
}

/**
 * Everything one sheet writes about what is on it — its name, its assembly sentence, and every
 * heading, intro, outro, label and entry line of its own inventory.
 *
 * The corpus for a claim about a *sheet* rather than about a category, which is the finer of the two
 * questions and the one `SheetPlan.scaleExample` is grounded against: a CHARACTER directional core
 * writes no hand and no limb, and grounding its scale example in everything the category writes
 * would pass the very pairing the example was wrong on. Lifted out of {@link sheetsProseFor}
 * rather than copied, so the two answers cannot drift about which fields count as a sheet's own
 * words.
 */
export function planProseFor(plan: SheetPlan): string {
  const written: string[] = [plan.name, plan.assembly];
  for (const group of plan.groups) {
    written.push(group.heading ?? '', group.intro ?? '', group.outro ?? '');
    for (const entry of group.entries) written.push(entry.label, entry.text);
  }
  return written.join('\n');
}
