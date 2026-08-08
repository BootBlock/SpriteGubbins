import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ATLAS_CANVAS_CHOICES, ATLAS_PADDING_CHOICES } from '../src/constants/atlas.ts';
import { CATEGORY_OPTIONS } from '../src/constants/categories/index.ts';
import { HARDWARE_PROFILE_CHOICES } from '../src/constants/hardware/index.ts';
import { TARGET_MODELS } from '../src/constants/models.ts';
import { PALETTE_CHOICES } from '../src/constants/palettes/index.ts';
import * as OUTPUT_CHOICES from '../src/constants/output/choices.ts';
import type { OutputChoice } from '../src/constants/output/choices.ts';
import { directionalModeChoices } from '../src/constants/output/directionalModeChoices.ts';
import { sheetChoices } from '../src/constants/output/sheetChoices.ts';
import { DIRECTION_LISTS } from '../src/constants/promptText/index.ts';
import { modesFor } from '../src/constants/sheetPlans/index.ts';
import { OPENING_VIEW_CHOICES } from '../src/constants/settings.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';

/**
 * The character budget every `SelectField` option label is written to.
 *
 * A native `<select>` renders its selected option in a box sized by its container: it cannot wrap,
 * shrink or abbreviate, so an option longer than the control is truncated with the user agent's own
 * ellipsis — and what disappears is the *end* of the label, which in this app is the parenthetical
 * telling a first-time user which option is the standard one. Twelve options across seven studio
 * selects shipped that way.
 *
 * The budget is a character count rather than a width because the control is `font-mono`, where the
 * two are the same measurement. Derived in Edge, on the studio tab:
 *
 * - the left column (`lg:col-span-5` of a `max-w-7xl` page) settles at **457px** once the page
 *   reaches its 1280px cap, and holds that width at every larger viewport;
 * - its chrome — 1px of border and 10px of `p-2.5` padding either side, plus the 20px the user
 *   agent reserves for the dropdown arrow — takes **42px**;
 * - `font-mono` at `text-xs` (13px) advances **8px** per character.
 *
 * So (457 − 42) / 8 = 51.8, and 51 characters is the most that renders whole. The budget is one
 * below that: 50 is the length of the longest label that already fitted before this was enforced
 * (`DETAILED_PRODUCTION (seams and material divisions)`, 442px, 15px of slack), which leaves a
 * character in hand for a monospace face whose advance is slightly wider than the one measured.
 *
 * **Between the `lg` breakpoint and that cap the column is narrower than this budget** — 351px at
 * a 1024px viewport, which is 38 characters — and no label budget reaches it, because several
 * identifiers are 19 to 29 characters on their own and 38 would leave nothing for the guidance that
 * follows them. A control too narrow for anything it can render is a column problem, not a label
 * one; it belongs to the studio layout, which is what decides that column's width. **A layout that
 * keeps the two-column split at every width needs 442px** — this budget plus the 42px of chrome —
 * for a label to stay whole.
 *
 * So 457px is the number to re-derive if that column's settled width changes.
 */
const LABEL_BUDGET = 50;

/**
 * A subject naming extra anatomy raises the component count `directionalModeChoices` interpolates,
 * so the label grows a character per digit. Budgeted against a four-digit count — far past the ~40
 * components a generation actually delivers — because the widest label the template can produce is
 * the one that has to fit, not the one the defaults happen to produce.
 */
const HEAVY_ANATOMY = [{ name: 'segmented tail', count: 999 }] as const;

/** Every list of option labels, keyed by the identifier the `SelectField` call site passes. */
const LABELS: Readonly<Record<string, readonly string[]>> = {
  ...Object.fromEntries(
    Object.entries<readonly OutputChoice<string>[]>(OUTPUT_CHOICES).map(([source, choices]) => [
      source,
      choices.map((choice) => choice.label),
    ]),
  ),
  ATLAS_CANVAS_CHOICES: ATLAS_CANVAS_CHOICES.map((choice) => choice.label),
  ATLAS_PADDING_CHOICES: ATLAS_PADDING_CHOICES.map((choice) => choice.label),
  CATEGORY_CHOICES: SUBJECT_CATEGORIES.map((category) => CATEGORY_OPTIONS[category].label),
  DIRECTION_LISTS: Object.values(DIRECTION_LISTS).flat(),
  // The two lists that name a *machine* rather than the stored identifier, and are budgeted here
  // rather than picked up from `choices.ts` because their libraries are far too large to file with
  // the option pools. The budget is the same one: the column does not care what the string means.
  HARDWARE_PROFILE_CHOICES: HARDWARE_PROFILE_CHOICES.map((choice) => choice.label),
  MODEL_CHOICES: TARGET_MODELS.map((model) => model.name),
  OPENING_VIEW_CHOICES: OPENING_VIEW_CHOICES.map((choice) => choice.label),
  PALETTE_CHOICES: PALETTE_CHOICES.map((choice) => choice.label),
  modeChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    directionalModeChoices(category, HEAVY_ANATOMY).map((choice) => choice.label),
  ),
  // One list per pairing, so a series that grows a sheet is budgeted the moment it exists. No
  // anatomy: this list distinguishes the sheets of one series from each other, and the subject's
  // own anatomy lands on the first of them whatever the series holds.
  seriesChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    modesFor(category).flatMap((mode) => sheetChoices(category, mode).map((choice) => choice.label)),
  ),
};

/** Every `.tsx` under `src/components/`, which is where every `SelectField` call site lives. */
function componentFiles(): string[] {
  const root = resolve(process.cwd(), 'src/components');
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => resolve(entry.parentPath, entry.name));
}

/**
 * The first identifier inside each `choices={…}` — the source of options that call site renders.
 *
 * `choices` is `SelectField`'s prop alone (`ComboBox` takes `options`, and its list floats free of
 * the control, so it is not bound by this), which is what makes a text scan enough to find every
 * select in the app. Taking the leading identifier rather than the whole expression keeps this
 * stable under reformatting: the one call site that maps a list inline yields `DIRECTION_LISTS`.
 */
const wiredSources = [
  ...new Set(
    componentFiles().flatMap((path) =>
      [...readFileSync(path, 'utf8').matchAll(/choices=\{([A-Za-z_$][\w$]*)/g)].map(
        (match) => match[1] ?? '',
      ),
    ),
  ),
].sort();

describe('select option labels', () => {
  /**
   * The completeness half. Budgeting the lists this file happens to import would go stale the first
   * time a select was added — so the covered set has to equal the wired set exactly, in both
   * directions: a new `SelectField` fails here until its options are budgeted, and a list that
   * stops being rendered fails until it is dropped from `LABELS`.
   */
  it('budgets exactly the option lists the app renders', () => {
    expect(Object.keys(LABELS).sort()).toEqual(wiredSources);
  });

  for (const [source, labels] of Object.entries(LABELS)) {
    it(`${source} fits the narrowest select`, () => {
      const overlong = labels
        .filter((label) => label.length > LABEL_BUDGET)
        .map((label) => `${String(label.length)} chars: ${label}`);
      expect(overlong).toEqual([]);
    });
  }
});
