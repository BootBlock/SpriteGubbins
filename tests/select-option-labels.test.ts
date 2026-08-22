import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ATLAS_CANVAS_CHOICES, ATLAS_PADDING_CHOICES } from '../src/constants/atlas.ts';
import { CATEGORY_OPTIONS } from '../src/constants/categories/index.ts';
import { CATEGORY_DIRECTION_SETS } from '../src/constants/categoryDirectionSets.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/defaults.ts';
import { HARDWARE_PROFILE_CHOICES } from '../src/constants/hardware/index.ts';
import { TARGET_MODELS } from '../src/constants/models.ts';
import { PALETTE_CHOICES } from '../src/constants/palettes/index.ts';
import { styleReferenceChoices } from '../src/constants/styleReferences/index.ts';
import * as OUTPUT_CHOICES from '../src/constants/output/choices.ts';
import type { OutputChoice } from '../src/constants/output/choices.ts';
import { directionalModeChoices } from '../src/constants/output/directionalModeChoices.ts';
import { directionSetChoices } from '../src/constants/output/directionSetChoices.ts';
import { projectionChoices } from '../src/constants/output/projectionChoices.ts';
import { rigModeChoices } from '../src/constants/output/rigModeChoices.ts';
import { sheetChoices } from '../src/constants/output/sheetChoices.ts';
import { DIRECTION_LISTS } from '../src/constants/promptText/index.ts';
import {
  ANTI_ALIAS_MODE_CHOICES,
  ANTI_ALIAS_PALETTE_CHOICES,
  DITHER_CHOICES,
  FRAME_ALIGNMENT_MODE_CHOICES,
  SYMMETRY_MODE_CHOICES,
  VOTE_METHOD_CHOICES,
} from '../src/constants/quantiser.ts';
import { modesFor } from '../src/constants/sheetPlans/index.ts';
import { OPENING_VIEW_CHOICES } from '../src/constants/settings.ts';
import { SUBJECT_CATEGORIES } from '../src/types/subject.ts';
import { LABEL_BUDGET } from './selectLabelBudget.ts';

/**
 * Every option label in the app, held to the budget the narrowest `SelectField` can render.
 *
 * The budget itself, and why it is 50, live in `selectLabelBudget.ts` — this file is the half that
 * checks the *copy*. Its siblings, `studio-column-width.test.ts` and
 * `quantise-column-width.test.ts`, check that the two split layouts actually give a control the
 * 442px those 50 characters need, which is the half that was missing while the studio's two-column
 * split engaged 16px too early.
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
  // The third list naming a real thing rather than a stored identifier — a published game, where the
  // two above name a machine and its colours. Same budget, same reason: the column is measured in
  // characters and does not care what they mean. Scoped to the category like the modes below,
  // because a reference states the camera it was rendered under and a subject that cannot be drawn
  // under it is not offered the look.
  styleReferenceChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    styleReferenceChoices(category).map((choice) => choice.label),
  ),
  ANTI_ALIAS_MODE_CHOICES: ANTI_ALIAS_MODE_CHOICES.map((choice) => choice.label),
  ANTI_ALIAS_PALETTE_CHOICES: ANTI_ALIAS_PALETTE_CHOICES.map((choice) => choice.label),
  DITHER_CHOICES: DITHER_CHOICES.map((choice) => choice.label),
  FRAME_ALIGNMENT_MODE_CHOICES: FRAME_ALIGNMENT_MODE_CHOICES.map((choice) => choice.label),
  VOTE_METHOD_CHOICES: VOTE_METHOD_CHOICES.map((choice) => choice.label),
  SYMMETRY_MODE_CHOICES: SYMMETRY_MODE_CHOICES.map((choice) => choice.label),
  // Over every set the category offers, because the batch totals in the labels move with it — both
  // the component figure and the generation count, since the set is what multiplies a part drawn one
  // facing at a time.
  modeChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    CATEGORY_DIRECTION_SETS[category].flatMap((directions) =>
      directionalModeChoices(category, { ...DEFAULT_OUTPUT_CONFIG, directions }, HEAVY_ANATOMY).map(
        (choice) => choice.label,
      ),
    ),
  ),
  // One list per category, like the modes above, because a category is offered only the sets its
  // subject can be turned to — two of the nine are `SINGLE_FRONT` alone.
  setChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    directionSetChoices(category).map((choice) => choice.label),
  ),
  // Scoped to the category like the modes above. Every label is budgeted whichever category renders
  // it — INTERFACE is offered one camera and the other eight are offered all seven.
  cameraChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    projectionChoices(category).map((choice) => choice.label),
  ),
  // Scoped to the category like the modes above, so the labels are budgeted per category rather
  // than once — five of them offer a single rig and never render this control at all.
  rigChoices: SUBJECT_CATEGORIES.flatMap((category) =>
    rigModeChoices(category).map((choice) => choice.label),
  ),
  // One list per pairing, so an inventory that grows a part is budgeted the moment it exists. No
  // anatomy: this list distinguishes the parts of one inventory from each other, and the subject's
  // own anatomy lands on the first of them whatever the inventory holds.
  inventoryParts: SUBJECT_CATEGORIES.flatMap((category) =>
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
