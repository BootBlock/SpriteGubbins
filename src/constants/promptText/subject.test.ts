import { describe, expect, it } from 'vitest';
import type { DirectionSet } from '../../types/rendering.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import { CATEGORY_OPTIONS } from '../categories/index.ts';
import { modesFor, sheetSeriesFor } from '../sheetPlans/index.ts';
import { DIRECTION_LISTS } from './camera.ts';
import { CATEGORY_ASSEMBLY } from './categoryAssembly.ts';
import { SCALE_UNIT_TEXT } from './subject.ts';

/**
 * Everything a category says about its own sheet — every plan, of every mode, under every direction
 * set the category can be asked for, plus the five voices it names its assembled whole in and the
 * name it goes by in the selector.
 *
 * Every sheet rather than the default one, because {@link SCALE_UNIT_TEXT} is a claim about the
 * category and not about one configuration: a unit that only appeared on the default pairing would
 * be a unit the other sheets of the same deliverable are not priced in.
 *
 * **`CATEGORY_ASSEMBLY` is in here because a unit is often the whole the parts assemble into**, and
 * a whole a sheet is forbidden to draw is a whole that sheet never names. CHARACTER is the case: its
 * plans list a head, a torso and limb variants and nothing on any of them is called a figure, while
 * `CATEGORY_ASSEMBLY.CHARACTER` writes `assembled figure` in all five. CREATURE needs the third
 * source for the mirrored reason: its plans list a head, a body and hindquarters, and its assembly
 * record deliberately says `figure` rather than `creature` — because that record names a *failure*
 * and the subject's own noun would be a synonym of the subject — so `Creature / Monster` in the
 * selector is the only place the category writes its own name.
 *
 * Widening the source this far and no further keeps the check on the original defect: none of the
 * nine categories the figure vocabulary reached writes the word in any of the three.
 */
function planProseFor(category: SubjectCategory): string {
  const { statement, instruction, exclusion, audit, negatives } = CATEGORY_ASSEMBLY[category];
  const written: string[] = [
    CATEGORY_OPTIONS[category].label,
    statement,
    instruction,
    exclusion,
    audit,
    ...negatives,
  ];
  for (const mode of modesFor(category)) {
    for (const set of Object.keys(DIRECTION_LISTS) as DirectionSet[]) {
      for (const plan of sheetSeriesFor(category, mode, set)) {
        written.push(plan.name, plan.assembly);
        for (const group of plan.groups) {
          written.push(group.heading ?? '', group.intro ?? '', group.outro ?? '');
          for (const entry of group.entries) written.push(entry.label, entry.text);
        }
      }
    }
  }
  return written.join('\n');
}

/**
 * The words of the unit phrase that have to be grounded — everything but the articles and the
 * quantifiers, which are the sentence's own scaffolding rather than the category's vocabulary.
 */
const SCAFFOLDING = new Set(['a', 'an', 'one', 'the', 'of', 'full', 'whole']);

function nounsOf(unit: string): readonly string[] {
  return unit.split(' ').filter((word) => !SCAFFOLDING.has(word));
}

describe('SCALE_UNIT_TEXT', () => {
  it('prices every category in a noun that category’s own sheets use', () => {
    // The defect this map removes: `a full figure` was the unit on all thirteen, and "figure" is a
    // word nine of them never write anywhere. Matched with a leading boundary only, so a plan
    // writing the plural — `tiles`, `widgets` — still grounds the singular the phrase is stated in.
    for (const category of SUBJECT_CATEGORIES) {
      const prose = planProseFor(category);
      for (const noun of nounsOf(SCALE_UNIT_TEXT[category])) {
        // `String.raw`, because a plain template literal reads \b as a backspace rather than as the
        // word boundary — a regex that then matches nothing and passes every category by vacuum.
        const grounded = new RegExp(String.raw`\b${noun}`, 'i').test(prose);
        expect(grounded, `${category}: “${noun}” is a word this category never writes`).toBe(true);
      }
    }
  });

  it('gives each unit a leading article, so it reads in both of the frames that carry it', () => {
    // The phrase completes "… occupies 25–35% of the sheet height" and "… is roughly 64–96 pixels
    // tall", so it is a singular noun phrase carrying its own article and nothing else — no leading
    // capital, no trailing stop.
    for (const category of SUBJECT_CATEGORIES) {
      const unit = SCALE_UNIT_TEXT[category];
      expect(unit, category).toMatch(/^(a|an|one|the) [a-z]/);
      expect(unit.endsWith('.'), category).toBe(false);
    }
  });

  it('gives no two categories the same unit, which would be one of them priced in the other’s words', () => {
    const units = SUBJECT_CATEGORIES.map((category) => SCALE_UNIT_TEXT[category]);
    expect(new Set(units).size).toBe(units.length);
  });
});
