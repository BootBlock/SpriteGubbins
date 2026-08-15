import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG, rigModeChoices } from '../constants/output/index.ts';
import {
  CATEGORY_RIG_MODES,
  resolveRigMode,
  supportsMode,
  supportsRigMode,
} from '../constants/sheetPlans/index.ts';
import { RIG_MODES } from '../types/rigging.ts';
import type { RigMode } from '../types/rigging.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * The rig-contamination regression suite.
 *
 * The defect: `rigMode` was a free choice, unrelated to the category, against a default of
 * `POSE_LIBRARY` — so the prompt's `[IF:RIG_MODE=POSE_LIBRARY]` block fired on any subject and
 * emitted a `RIGID SEGMENTS AND PIVOTS` section on sheets whose components do not articulate. Three
 * categories reached it on the studio's own defaults with nothing selected: a BUILDING tileset, an
 * EFFECT flipbook and an INTERFACE widget kit. `CUTOUT_RIG` was worse where a category switch left it
 * behind — the whole `CUT-OUT RIG REQUIREMENTS` block, bone axes and joint caps included,
 * arriving on a sheet of floor tiles.
 *
 * What is pinned here is the property rather than those examples: a category that articulates about
 * nothing cannot be given a rig, from any of the four routes into `rigMode` — the control, a category
 * switch, a stored configuration, and the compiler itself.
 */

/**
 * The rig section each mode emits, named by its heading rather than by its number.
 *
 * Section numbers are computed from the headings that survive, so a heading is the stable half: the
 * rig section is number 5 whenever it appears — sections 0 to 4 are unconditional and precede it —
 * and asserting the number as well would only restate what `promptCompiler.test.ts` pins directly.
 * The titles are also what a negative assertion needs, since the *number* 5 belongs to whichever
 * section lands there once the rig block is dropped.
 */
const RIG_SECTIONS = {
  POSE_LIBRARY: '## 5. RIGID SEGMENTS AND PIVOTS',
  CUTOUT_RIG: '## 5. CUT-OUT RIG REQUIREMENTS',
} as const;

/** Neither rig section is anywhere in this prompt, by whichever number it would have taken. */
function expectNoRigSection(prompt: string): void {
  expect(prompt).not.toContain('RIGID SEGMENTS AND PIVOTS');
  expect(prompt).not.toContain('CUT-OUT RIG REQUIREMENTS');
}

const ARTICULATED = SUBJECT_CATEGORIES.filter((category) => supportsRigMode(category, 'POSE_LIBRARY'));
const UNARTICULATED = SUBJECT_CATEGORIES.filter((category) => !supportsRigMode(category, 'POSE_LIBRARY'));

function promptFor(category: SubjectCategory, rigMode: RigMode): string {
  return generatePrompt(category, defaultSubjectFor(category), { ...DEFAULT_OUTPUT_CONFIG, rigMode });
}

describe('the rig table itself', () => {
  it.each(SUBJECT_CATEGORIES)('%s offers NONE, which is what resolution falls back to', (category) => {
    // `resolveRigMode` answers `NONE` for anything a category cannot be given, so a category missing
    // it from its own list would resolve to a value it does not support — the undefined lookup this
    // table exists to remove, in the one direction nothing else would catch.
    expect(CATEGORY_RIG_MODES[category]).toContain('NONE');
  });

  it.each(SUBJECT_CATEGORIES)('%s names each rig at most once, and only real ones', (category) => {
    const modes = CATEGORY_RIG_MODES[category];
    expect(new Set(modes).size).toBe(modes.length);
    expect(modes.every((mode) => RIG_MODES.includes(mode))).toBe(true);
  });

  it('gives a rig to exactly the categories that have a cut-out rig sheet', () => {
    // An entailment, not a coincidence: `CUTOUT_RIG_SINGLE_DIRECTION` is the sheet whose inventory
    // *is* rig pieces, so a category without one has already said it has no bone rig. Divergence
    // would mean one of the two tables is lying — a sheet of rig pieces with no rig requirements, or
    // a rig no sheet in the app can draw.
    const withRigSheet = SUBJECT_CATEGORIES.filter((category) =>
      supportsMode(category, 'CUTOUT_RIG_SINGLE_DIRECTION'),
    );
    expect(ARTICULATED).toEqual(withRigSheet);
    expect(SUBJECT_CATEGORIES.filter((c) => supportsRigMode(c, 'CUTOUT_RIG'))).toEqual(withRigSheet);
  });

  it('leaves the five categories that turn about nothing with one answer', () => {
    // Each argues its own case in its plan file: an item has no rig, a building's modules butt on a
    // shared width, a terrain is ground, an effect is a stretch of time, and a slider handle travels
    // along a track. Named rather than derived, because the whole point of the table is that these
    // five are a decision someone made and not a fact falling out of another list.
    expect(UNARTICULATED).toEqual(['ITEM', 'BUILDING', 'EFFECT', 'INTERFACE', 'TERRAIN']);
    for (const category of UNARTICULATED) {
      expect(CATEGORY_RIG_MODES[category]).toEqual(['NONE']);
    }
  });
});

describe('a stored rig its category has no joints for', () => {
  it.each(UNARTICULATED)('degrades to NONE on %s', (category) => {
    // The route the studio cannot close: a preset written before this table existed, a history row
    // from an older build, or a hand-edited export. `parseOutputConfig` validates `rigMode` against
    // the union and has no category to check it against, so this is where it is caught.
    expect(resolveRigMode(category, 'POSE_LIBRARY')).toBe('NONE');
    expect(resolveRigMode(category, 'CUTOUT_RIG')).toBe('NONE');
  });

  it.each(ARTICULATED)('is left alone on %s, which can honour it', (category) => {
    expect(resolveRigMode(category, 'POSE_LIBRARY')).toBe('POSE_LIBRARY');
    expect(resolveRigMode(category, 'CUTOUT_RIG')).toBe('CUTOUT_RIG');
  });
});

describe('the reported failure: a rig section on a sheet with no joints', () => {
  it.each(UNARTICULATED)('%s emits neither rig section, whatever the configuration asks', (category) => {
    for (const rigMode of ['POSE_LIBRARY', 'CUTOUT_RIG'] as const) {
      const prompt = promptFor(category, rigMode);

      expectNoRigSection(prompt);
      // The exact sentences from the reported prompt, named so a revert surfaces as this test rather
      // than as a heading count.
      expect(prompt).not.toContain('flexion comes from assembling separately oriented rigid segments');
      expect(prompt).not.toContain('Matching pivots share a diameter');
      expect(prompt).not.toContain('bound to a skeleton and rotated independently at runtime');
      // The assembly capability is what the rig section sits above, so its presence is what makes the
      // absence above a dropped block rather than a prompt that stopped early — and it now carries
      // the number the rig section would have taken, which is the gap this closes.
      expect(prompt).toContain('## 5. REQUIRED ASSEMBLY CAPABILITY');
    }
  });

  it('is what the studio opens on for three of them, with nothing selected', () => {
    // The default configuration is `POSE_LIBRARY`, and these three reach it on their own default
    // sheet mode — which is why this shipped rather than being a corner a user had to find.
    expect(DEFAULT_OUTPUT_CONFIG.rigMode).toBe('POSE_LIBRARY');
    for (const category of ['BUILDING', 'EFFECT', 'INTERFACE'] as const) {
      expectNoRigSection(generatePrompt(category, defaultSubjectFor(category), DEFAULT_OUTPUT_CONFIG));
    }
  });

  it.each(ARTICULATED)('%s still gets the rig section it asked for', (category) => {
    // The repair may not have taken section 5 away from the categories it was always right for.
    for (const rigMode of ['POSE_LIBRARY', 'CUTOUT_RIG'] as const) {
      expect(promptFor(category, rigMode)).toContain(RIG_SECTIONS[rigMode]);
    }
    expectNoRigSection(promptFor(category, 'NONE'));
  });
});

describe('the control offers what the category can be given', () => {
  const valuesFor = (category: SubjectCategory) => rigModeChoices(category).map((choice) => choice.value);

  it('offers the three in the order the control shows them, not the order the table lists them', () => {
    // Written out rather than derived, and unsorted, because both halves are the assertion. Compared
    // against `CATEGORY_RIG_MODES` this would pass on a wrong table — the filter and the expectation
    // read the same row — and sorting it would drop the only thing the labels list decides, which is
    // that the two rigs come before the answer for a sheet that has none.
    expect(valuesFor('CHARACTER')).toEqual(['POSE_LIBRARY', 'CUTOUT_RIG', 'NONE']);
    expect(valuesFor('BUILDING')).toEqual(['NONE']);
  });

  it.each(SUBJECT_CATEGORIES)('%s offers its whole row and nothing else', (category) => {
    // The wiring check the two literals above cannot generalise: every row reaches the control
    // intact, so a category added to the table without a label is a missing option rather than a
    // silently shorter list.
    expect([...valuesFor(category)].sort()).toEqual([...CATEGORY_RIG_MODES[category]].sort());
  });

  it('leaves nothing to choose where the category has one answer', () => {
    // Which is what `RiggingFields` reads to put a sentence there instead of a single-option select.
    for (const category of UNARTICULATED) {
      expect(rigModeChoices(category)).toHaveLength(1);
    }
  });
});
