import { describe, expect, it } from 'vitest';
import { callSitesPassing } from './jsxCallSites.ts';

/**
 * The call-site counts `SelectField`’s docblock states, re-counted from the components themselves.
 *
 * That docblock argues three of its optional props into existence by counting: `description` is
 * optional because only seven of the app’s selects have anything to say under them — six reading a
 * row out of a table behind them, and the rig mode saying which sheet withdrew an option —
 * `disabledReason` because exactly one has a setting above it that takes its value over, and
 * `nameQualifier` because exactly one is rendered once for each item in a list. The counts *are* the
 * argument — at one exception, the claim that a permanently-empty string everywhere else would bury
 * it is self-evident, and at half the call sites it would be false — so a figure that has drifted is
 * not a stale number beside a live argument. It is a live argument resting on a false premise.
 *
 * Nothing recomputed them, so one drifted a long way without moving: the docblock described a
 * single `description` call site while five passed one. The total beside it is the same failure
 * caught three times already, and corrected by hand on each — twenty-four, then twenty-six, then
 * thirty. Nothing failed on any of the four: a reader adding two selects for something else
 * noticed the arithmetic. This suite is what fails instead.
 *
 * **It pins the counts, not the prose.** Whoever makes it fail has to go and restate the two
 * paragraphs, which is the step that was being skipped; whether the restated argument still holds at
 * the new figure is a judgement no assertion can make. The exception lists are pinned by name as
 * well as by length, so a select that swaps one exception for another — leaving the totals alone —
 * fails here too, and the docblock’s account of *which* seven they are stays true with them.
 */

/** Every `<SelectField>` the app renders. */
const CALL_SITE_COUNT = 31;

/** Where a `description` is passed: the docblock’s seven, by the file that renders each. */
const DESCRIPTION_CALL_SITES = [
  'src/components/studio/PaletteField.tsx',
  'src/components/studio/RenderStyleFields.tsx',
  'src/components/studio/RiggingFields.tsx',
  'src/components/studio/SheetFields.tsx',
  'src/components/studio/StyleReferenceField.tsx',
  'src/components/studio/SystemProfileField.tsx',
  'src/components/studio/TargetModelSelector.tsx',
];

/**
 * Where a `disabledReason` is passed: the rig mode, which the sheet contents can fix.
 *
 * The same file now appears in both lists, which is the pairing worth noticing rather than a
 * duplicate: one sheet takes the rig choice over outright, and another withdraws one option from it,
 * so the control says both things through the two props that exist for them.
 */
const DISABLED_REASON_CALL_SITES = ['src/components/studio/RiggingFields.tsx'];

/**
 * Where a `nameQualifier` is passed: the project dropdown, which each saved-preset row renders.
 *
 * One file, and two rows behind it. The qualifier reaches `SelectField` only through
 * `ProjectSelectField`, so a row that renders a select of its own and names it the same way would
 * add an entry here — which is the point at which the docblock's “one of the thirty-one” is false.
 */
const NAME_QUALIFIER_CALL_SITES = ['src/components/projects/ProjectSelectField.tsx'];

/**
 * The files that render a `<SelectField>` passing `attribute`, one entry per call site.
 *
 * The walk is `jsxCallSites.ts`'s, shared with the suite that re-counts `ControlTooltip`'s two
 * figures, and its docblock says why a call site has to be parsed rather than matched. This suite
 * asks only for the file, since that is what the two exception lists below are written as.
 */
function filesPassing(attribute: string): string[] {
  return callSitesPassing('SelectField', attribute).map((site) => site.file);
}

describe('the call-site counts SelectField’s docblock states', () => {
  it(`renders ${String(CALL_SITE_COUNT)} selects`, () => {
    // Counted through `label`, which the props type requires, so this is every call site rather
    // than every one that happens to pass an optional prop.
    expect(filesPassing('label')).toHaveLength(CALL_SITE_COUNT);
  });

  it(`passes a description at ${String(DESCRIPTION_CALL_SITES.length)} of them`, () => {
    expect(filesPassing('description')).toEqual(DESCRIPTION_CALL_SITES);
  });

  it(`passes a disabledReason at ${String(DISABLED_REASON_CALL_SITES.length)} of them`, () => {
    expect(filesPassing('disabledReason')).toEqual(DISABLED_REASON_CALL_SITES);
  });

  it(`passes a nameQualifier at ${String(NAME_QUALIFIER_CALL_SITES.length)} of them`, () => {
    expect(filesPassing('nameQualifier')).toEqual(NAME_QUALIFIER_CALL_SITES);
  });
});
