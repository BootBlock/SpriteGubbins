import { oneSidedFeatureFor } from '../constants/categories/index.ts';
import { SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectCategory, SubjectDefinition } from '../types/subject.ts';

/**
 * Everything this subject carries on one of its own two flanks and not the other, named.
 *
 * The defect it answers is the pack's largest: every opposite-turn pair that could be measured
 * across 27 real GPT-5.6 Sol sheets is a horizontal reflection — 12 of 12 — with section 3's rule
 * against exactly that carried verbatim into 7 of the 7 readable compositions. The rule is not what
 * fails. What separates a sheet that satisfies it from one that does not is whether some *named*
 * one-sided feature is drawn on the near flank and absent from the far one, and the prompt used to
 * ask the model to supply that itself: "pick one feature the subject carries on one side and not the
 * other". That picks **one**, so a subject carrying two left the second unconstrained — measured, the
 * holster held the torso and pelvis while the head went on reflecting.
 *
 * So the compiler names them instead, and it can only name what a pool declared — see
 * `FieldOption.oneSidedOptions`, which holds the survey and the rule it was made under.
 *
 * **Order is `SUBJECT_FIELD_KEYS`, not the category's own field array.** Both are stable, and this
 * one is the same across all thirteen categories, so two sheets of one series list their features in
 * the same order however their categories happen to be written down. Section 6 requires the side a
 * feature sits on to match across a series, and a ledger that reordered itself between sheets would
 * be the one place a reader could not check that by eye.
 *
 * **No deduplication here, because the pools are where that is settled.** Two fields resolving to
 * the same phrase would put two identical paragraphs into section 3, each stating the same
 * visibility — which reads as two features, and section 9 would ask for both to be traced. A `Set`
 * at this end would have made that impossible and would also have been unreachable: no shipped pool
 * declares a phrase twice, so the branch would be dead code claiming to defend something.
 * `oneSidedFeatures.test.ts` asserts the uniqueness across every pool of every category instead,
 * which fails at the declaration rather than silently swallowing it here.
 */
export function oneSidedFeatures(category: SubjectCategory, subject: SubjectDefinition): readonly string[] {
  const found: string[] = [];
  for (const key of SUBJECT_FIELD_KEYS) {
    const feature = oneSidedFeatureFor(category, key, subject[key]);
    if (feature !== null) found.push(feature);
  }
  return found;
}
