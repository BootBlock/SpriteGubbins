import { describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../src/constants/backgroundKeyColors.ts';
import { fieldLabelFor } from '../src/constants/categories/index.ts';
import { HARDWARE_PROFILES } from '../src/constants/hardware/index.ts';
import { PALETTES } from '../src/constants/palettes/index.ts';
import * as promptText from '../src/constants/promptText/index.ts';
import { PROMPT_TEMPLATE } from '../src/constants/promptTemplate.ts';
import { SHEET_INDEX_RANGE, sheetPlanFor } from '../src/constants/sheetPlans/index.ts';
import type { SheetPlan } from '../src/types/components.ts';
import { DIRECTIONAL_MODES, DIRECTION_SETS, RESOLUTION_PROFILES } from '../src/types/output.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import type { SubjectCategory } from '../src/types/subject.ts';
import { assemblyBaseSubjectsOf } from '../src/test/assemblyBaseSubjects.ts';

/**
 * Whether any prose the prompt interpolates still writes a section number by hand.
 *
 * Fourteen strings in `constants/promptText/` and `constants/sheetPlans/` used to, and every one of
 * them reached the model. They were correct only because `CONTRACT`, `SUBJECT` and `CAMERA` are
 * declared before the first conditional heading and so have never moved — nothing held them there,
 * and the same numerals in the two model wrappers had already gone stale once. They cite by name
 * now, `[SEC:CAMERA]`, and `resolveCitations` resolves each against the headings the prompt this
 * configuration produces actually carries.
 *
 * **This is the half the compiled prompt cannot check.** A resolved citation is a numeral, so the
 * finished text says `section 3` either way and no assertion on it can tell a derived number from a
 * hand-written one. The check therefore runs on the constants themselves, before the compiler has
 * filled anything in — while `promptCompiler.test.ts` holds the other half, that no `[SEC:…]`
 * survives into a prompt.
 *
 * It walks *values* rather than source text, so a comment discussing section 4 is not a finding and
 * no comment-stripping has to be trusted. What that costs is the prose a composer builds from
 * fragments it never exports — `describeDirections`, `depthOrderDescription` and the rest are opaque here,
 * whatever they say. The two hardware blocks are called below because they are the composers that
 * actually cite a section; a new one that starts to needs the same line adding.
 */
// The plural is not decoration: `promptTemplate.test.ts` holds the template to the same claim with
// the same pattern, and “Sections 4 and 8 each state…” is a phrasing this prose already uses.
const HAND_WRITTEN = /\bsections? \d/i;

/**
 * The floor under each walk, and the only thing standing between one that stops reaching anything
 * and a suite that reports nothing wrong.
 *
 * **Per walk, because a single floor over the total is inert.** The plans contribute around 37,500
 * strings, the records around 180 and the composed blocks around 9,400, so one number covering the sum
 * is satisfied by the plans alone — and `recordProse` going dark would leave the assertion passing on
 * more than 99% of its usual input. Each figure sits below what its own walk currently finds, so adding
 * or removing prose never touches them.
 */
const FEWEST_STRINGS = { plans: 1000, records: 100, composed: 10 } as const;

/**
 * The sheet at every address a configuration can name — assembly base, mode, direction set and sheet
 * index — once per address, with the category it is for.
 *
 * **The base is part of the address** (issue #283). A declared base draws sheets of its own, so a walk
 * compiling one subject per category reads only the standard plans, and a rigid object's views, whose
 * intro cites `[SEC:CAMERA]`, went unread. Each plan table is walked with the subject that selects it.
 */
function addressedSheets(): readonly { readonly category: SubjectCategory; readonly plan: SheetPlan }[] {
  const sheets: { category: SubjectCategory; plan: SheetPlan }[] = [];

  for (const category of SUBJECT_CATEGORIES) {
    for (const subject of assemblyBaseSubjectsOf(category)) {
      for (const directionalMode of DIRECTIONAL_MODES) {
        for (const directions of DIRECTION_SETS) {
          for (let sheetIndex = 0; sheetIndex <= SHEET_INDEX_RANGE.max; sheetIndex += 1) {
            sheets.push({
              category,
              plan: sheetPlanFor(category, subject, directionalMode, directions, sheetIndex),
            });
          }
        }
      }
    }
  }

  return sheets;
}

/** The sheet at every address a configuration can name, once per address. */
function addressedPlans(): readonly SheetPlan[] {
  return addressedSheets().map(({ plan }) => plan);
}

/** Every piece of prose the sheet plans contribute, over every address a configuration can name. */
function planProse(): readonly string[] {
  const prose: string[] = [];

  for (const plan of addressedPlans()) {
    // `scaleExample` and `scaleUnit` are walked here for the reason the whole file exists: sections
    // 0 and 2 interpolate them verbatim, so a section number written into one would reach the model.
    // Each arrived on the plan from `constants/promptText/`, where the barrel walk below already
    // covered it — moving a string from one of these two sources to the other has to move it between
    // the walks in the same edit, or the strings leave the check silently. `componentClass` and the
    // three `assemblyFailure` forms made the same move for the same sections (issue #278).
    prose.push(
      plan.name,
      plan.assembly,
      plan.scaleExample,
      plan.scaleUnit,
      plan.componentClass,
      plan.assemblyFailure.instruction,
      plan.assemblyFailure.exclusion,
      plan.assemblyFailure.audit,
    );
    for (const group of plan.groups) {
      if (group.heading !== null) prose.push(group.heading);
      if (group.intro !== undefined) prose.push(group.intro);
      if (group.outro !== undefined) prose.push(group.outro);
      prose.push(...group.entries.map((entry) => entry.text));
    }
  }

  return prose;
}

/**
 * Every string reachable from `constants/promptText/`, walked rather than listed.
 *
 * The index is the seam it walks, and that is the point: its own docblock calls it "every piece of
 * prose the prompt template interpolates", so a constant that is not re-exported there never reaches
 * a prompt. Walking the exports rather than naming the records also reaches every shape the prose is
 * filed in — `CATEGORY_ASSEMBLY` and `RENDER_STYLE_SURFACE` are records of objects, and their
 * sentences reach the prompt exactly as the flat `*_TEXT` records' do.
 */
function recordProse(): readonly string[] {
  const prose: string[] = [];
  const collect = (value: unknown): void => {
    if (typeof value === 'string') prose.push(value);
    // A function's own prose is invisible here, which is what `composedProse` below stands in for.
    else if (typeof value === 'object' && value !== null) Object.values(value).forEach(collect);
  };

  collect(promptText);
  return prose;
}

/**
 * The section-2 prose that exists only as a composer's return value — the two blocks a targeted
 * machine adds, and the resolution profile.
 *
 * The profile joined this list when its map stopped being strings. `RESOLUTION_PROFILE_TEXT` is now
 * keyed by profile onto a *function* of the sheet's own scale unit, and `recordProse` above skips a
 * function by design — so all four of its sentences, and `CUSTOM`'s assembled wording, left this
 * walk without anything failing. `resolutionProfileDescription` is the composer that puts them back,
 * driven over every unit a plan states and both answers to *does the stated size name the assembly*,
 * which is the whole space the two branches of that function cover.
 *
 * **The category's exclusion line, guard and audit joined it for the same reason** (issue #278). All
 * three are handed the sheet now, so none of them is a string `recordProse` can reach — and the
 * exclusion line had been, with the citations of section 4 and section 1 it carries. Each is composed
 * for every sheet its category can be asked for, and the two that except the subject's own pieces
 * under both answers to whether the sheet lists any.
 */
function composedProse(): readonly string[] {
  const units = new Set(addressedPlans().map((plan) => plan.scaleUnit));
  return [
    ...addressedSheets().flatMap(({ category, plan }) => [
      promptText.CATEGORY_EXCLUSION_TEXT[category](plan),
      ...[null, fieldLabelFor(category, 'additional_anatomy')].flatMap((additions) => [
        promptText.CATEGORY_GUARD_TEXT[category](plan, additions),
        promptText.CATEGORY_AUDIT_TEXT[category](plan, additions),
      ]),
    ]),
    // Under every key, because the sentence naming what a key takes out of a list cites a section and
    // is written only where a key takes something.
    ...Object.values(BACKGROUND_KEY_COLORS).flatMap((key) =>
      Object.values(PALETTES).flatMap((palette) =>
        palette === null ? [] : [promptText.describePalette(palette, key)],
      ),
    ),
    ...Object.values(HARDWARE_PROFILES).flatMap((profile) =>
      profile === null ? [] : [promptText.describeHardware(profile)],
    ),
    ...[...units].flatMap((unit) =>
      RESOLUTION_PROFILES.flatMap((profile) =>
        [true, false].map((statesAssembled) =>
          promptText.resolutionProfileDescription(profile, statesAssembled, unit),
        ),
      ),
    ),
  ];
}

/**
 * Every section name the walked prose cites, and every name the template declares *unconditionally*.
 *
 * A citation is resolved against the headings one configuration produced, so a constant naming a
 * section that configuration dropped throws inside `useMemo` during render, with no error boundary
 * above it. `promptTemplate.test.ts` holds the template's own citations to *declared*; a value's has
 * to clear the higher bar, because the sweep that compiles them cannot vary every switch at once —
 * the rig mode and the target are what decide which of the conditional headings exist, and it pins
 * both. Naming only a heading no `[IF:…]` can drop makes the question moot rather than sampled.
 */
function unconditionalSections(): ReadonlySet<string> {
  const declared = new Set<string>();
  let depth = 0;

  for (const line of PROMPT_TEMPLATE.split('\n')) {
    if (/^[ \t]*\[IF:/.test(line)) depth += 1;
    else if (/^[ \t]*\[\/IF\][ \t]*$/.test(line)) depth -= 1;
    else if (depth === 0) {
      for (const [, name = ''] of line.matchAll(/\[SECTION:([A-Z0-9_]+)\]/g)) declared.add(name);
    }
  }

  return declared;
}

/** Each `[SEC:…]` the walked prose carries, in the order the walk found them. */
function citedNames(prose: readonly string[]): readonly string[] {
  return prose.flatMap((text) => [...text.matchAll(/\[SEC:([A-Z0-9_]+)\]/g)].map((match) => match[1] ?? ''));
}

describe('the prompt’s own prose', () => {
  const plans = planProse();
  const records = recordProse();
  const composed = composedProse();
  const prose = [...plans, ...records, ...composed];

  it('reaches all three of the places that prose is written down', () => {
    // Vacuity guard, asserted per walk rather than over the total — see `FEWEST_STRINGS`.
    expect(plans.length, 'the sheet-plan walk found almost nothing').toBeGreaterThan(FEWEST_STRINGS.plans);
    expect(records.length, 'the promptText walk found almost nothing').toBeGreaterThan(
      FEWEST_STRINGS.records,
    );
    expect(composed.length, 'the composed-block walk found almost nothing').toBeGreaterThan(
      FEWEST_STRINGS.composed,
    );
    // And across the assembly bases, which no floor on a count can see: a walk that lost that axis
    // clears the floor on the standard sheets alone, so the rigid object's two sheets are named.
    expect(plans, 'the sheet-plan walk never reached a rigid object’s states').toContain('Object states');
    expect(plans, 'the sheet-plan walk never reached a rigid object’s views').toContain('Object views');
  });

  it('cites a section by name rather than writing its number down', () => {
    const offenders = prose.filter((text) => HAND_WRITTEN.test(text));
    expect(offenders, `prose writes a section number by hand:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('cites only a section that no configuration can drop', () => {
    const unconditional = unconditionalSections();
    const cited = [...new Set(citedNames(prose))];

    // Non-vacuous: the walk has to have found the citations before the assertion means anything.
    expect(cited.length, 'the walk found no citation at all').toBeGreaterThan(0);
    for (const name of cited) {
      expect(
        [...unconditional],
        `[SEC:${name}] names a section the template declares conditionally, or not at all`,
      ).toContain(name);
    }
  });
});
