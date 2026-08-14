import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ATLAS_CANVAS_CHOICES, ATLAS_PADDING_CHOICES } from '../src/constants/atlas.ts';
import { CATEGORY_OPTIONS } from '../src/constants/categories/index.ts';
import { CATEGORY_DIRECTION_SETS } from '../src/constants/categoryDirectionSets.ts';
import { HARDWARE_PROFILE_CHOICES } from '../src/constants/hardware/index.ts';
import { TARGET_MODELS } from '../src/constants/models.ts';
import { PALETTE_CHOICES } from '../src/constants/palettes/index.ts';
import * as OUTPUT_CHOICES from '../src/constants/output/choices.ts';
import type { OutputChoice } from '../src/constants/output/choices.ts';
import { directionalModeChoices } from '../src/constants/output/directionalModeChoices.ts';
import { directionSetChoices } from '../src/constants/output/directionSetChoices.ts';
import { rigModeChoices } from '../src/constants/output/rigModeChoices.ts';
import { sheetChoices } from '../src/constants/output/sheetChoices.ts';
import { DIRECTION_LISTS } from '../src/constants/promptText/index.ts';
import { modesFor } from '../src/constants/sheetPlans/index.ts';
import { OPENING_VIEW_CHOICES } from '../src/constants/settings.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import { LABEL_BUDGET } from './selectLabelBudget.ts';

/**
 * Every option label in the app, held to the budget the narrowest `SelectField` can render.
 *
 * The budget itself, and why it is 50, live in `selectLabelBudget.ts` — this file is the half that
 * checks the *copy*. Its sibling, `studio-column-width.test.ts`, checks that the studio's layout
 * actually gives a control the 442px those 50 characters need, which is the half that was missing
 * while the two-column split engaged 16px too early.
 */

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
  // Over every set the category offers, because the series totals in the labels move with it.
  modeChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
      directionalModeChoices(category, directions, HEAVY_ANATOMY).map((choice) => choice.label),
    ),
  ),
  // One list per category, like the modes above, because a category is offered only the sets its
  // subject can be turned to — two of the nine are `SINGLE_FRONT` alone.
  setChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    directionSetChoices(category).map((choice) => choice.label),
  ),
  // Scoped to the category like the modes above, so the labels are budgeted per category rather
  // than once — five of them offer a single rig and never render this control at all.
  rigChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    rigModeChoices(category).map((choice) => choice.label),
  ),
  // One list per pairing, so a series that grows a sheet is budgeted the moment it exists. No
  // anatomy: this list distinguishes the sheets of one series from each other, and the subject's
  // own anatomy lands on the first of them whatever the series holds.
  seriesChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    modesFor(category).flatMap((mode) =>
      CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
        sheetChoices(category, mode, directions).map((choice) => choice.label),
      ),
    ),
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
