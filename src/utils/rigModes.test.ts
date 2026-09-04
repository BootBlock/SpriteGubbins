import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import { DEFAULT_OUTPUT_CONFIG, rigModeChoices } from '../constants/output/index.ts';
import { JOINT_CAP_TEXT, OVERLAP_MARGIN_TEXT } from '../constants/promptText/index.ts';
import {
  CATEGORY_RIG_MODES,
  fixedRigMode,
  modesFor,
  resolveRigMode,
  sheetSeriesFor,
  supportsMode,
  supportsRigMode,
} from '../constants/sheetPlans/index.ts';
import type { SheetSeries } from '../types/components.ts';
import type { DirectionalMode } from '../types/output.ts';
import { RIG_MODES } from '../types/rigging.ts';
import type { RigMode } from '../types/rigging.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * The rig-agreement regression suite, which covers a defect in each direction.
 *
 * **A rig on a sheet with no joints.** `rigMode` was a free choice, unrelated to the category,
 * against a default of `POSE_LIBRARY` — so the prompt's `[IF:RIG_MODE=POSE_LIBRARY]` block fired on
 * any subject and emitted a `RIGID SEGMENTS AND PIVOTS` section on sheets whose components do not
 * articulate. Three categories reached it on the studio's own defaults with nothing selected: a
 * BUILDING tileset, an EFFECT flipbook and an INTERFACE widget kit. `CUTOUT_RIG` was worse where a
 * category switch left it behind — the whole `CUT-OUT RIG REQUIREMENTS` block, bone axes and joint
 * caps included, arriving on a sheet of floor tiles.
 *
 * **A sheet that is entirely joints, with no rig.** The converse, and it survived the fix above:
 * `CUTOUT_RIG_SINGLE_DIRECTION` draws one direction's worth of rig pieces and promises assembly into
 * "any pose the rig produces by rotating the pieces about their pivots", while the rig mode beside it
 * stayed free. Selecting it from a fresh studio compiled that inventory and that promise with no
 * pivot registration, no overlap margin, no depth order and no sockets — and with the rig set to
 * `NONE`, with no articulation section at all, the prompt running `## 4` straight to `## 6`.
 *
 * **A sheet of posed variants, with the rig that forbids them.** The third, and the one the first
 * two left standing: a pose library, an articulation sheet and a part library each require a moving
 * part in several orientations or states in section 4, while `CUTOUT_RIG`'s section 5 requires every
 * piece drawn in its neutral rest orientation and forbids a pre-bent segment, and section 9 then
 * audits the result for "straight and unposed". The studio offers that pairing on all four
 * articulating categories, so it compiled — one prompt requiring what it forbids, which the
 * generator resolves however it likes. The rig table could not see it, because it read the sheet
 * *mode* while the contradiction lived in the sheet's entries.
 *
 * What is pinned here is the property rather than those examples: the rig section a prompt carries is
 * the one its own sheet and category call for, from every route into `rigMode` — the control, a
 * category switch, a sheet-mode switch, a stored configuration, and the compiler itself.
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

/** The sheet mode whose inventory *is* the rig, and the categories that can produce it. */
const RIG_SHEET = 'CUTOUT_RIG_SINGLE_DIRECTION';
const RIG_SHEET_CATEGORIES = SUBJECT_CATEGORIES.filter((category) => supportsMode(category, RIG_SHEET));

/** The mode the studio opens on, which is what makes the reported failure one click away. */
const DEFAULT_MODE = DEFAULT_OUTPUT_CONFIG.directionalMode;

/**
 * One pairing's sheets, at the direction set the studio opens on.
 *
 * The rig is a property of the whole deliverable rather than of the mode's name or of one sheet, so
 * every assertion below that used to name a mode now names a series — and `sheetSeriesFor` is what
 * resolves the pairing and the set on the way, exactly as the compiler does.
 */
function seriesFor(category: SubjectCategory, mode: DirectionalMode = DEFAULT_MODE): SheetSeries {
  return sheetSeriesFor(category, mode, DEFAULT_OUTPUT_CONFIG.directions);
}

/** Every series every pairing of this category produces, over every direction set it offers. */
function everySeries(category: SubjectCategory): readonly SheetSeries[] {
  return modesFor(category).flatMap((mode) =>
    CATEGORY_DIRECTION_SETS[category].map((directions) => sheetSeriesFor(category, mode, directions)),
  );
}

/** What the rig control offers for one pairing, in the order it shows them. */
function valuesFor(category: SubjectCategory, mode: DirectionalMode = DEFAULT_MODE): readonly RigMode[] {
  return rigModeChoices(category, seriesFor(category, mode)).map((choice) => choice.value);
}

/** One sheet whose inventory draws a moving part once per position it takes, and where it sits. */
interface PosedSheet {
  readonly mode: DirectionalMode;
  readonly index: number;
  readonly name: string;
}

/**
 * Every such sheet of a category, at the direction set the studio opens on.
 *
 * The mode and the index come back with the name because the compiler is addressed by those two and
 * not by the plan — and the index is derived rather than written down, since a series' length is a
 * property of the chosen set as well as of the pairing.
 */
function posedSheets(category: SubjectCategory): readonly PosedSheet[] {
  return modesFor(category).flatMap((mode) =>
    seriesFor(category, mode).flatMap((plan, index) =>
      plan.posing === 'PER_POSITION' ? [{ mode, index, name: plan.name }] : [],
    ),
  );
}

/** The pairings of a category whose artwork has already settled the motion. */
function posedModes(category: SubjectCategory): readonly DirectionalMode[] {
  return [...new Set(posedSheets(category).map((sheet) => sheet.mode))];
}

function promptFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  rigMode: RigMode,
  sheetIndex = 0,
): string {
  return generatePrompt(category, defaultSubjectFor(category), {
    ...DEFAULT_OUTPUT_CONFIG,
    directionalMode: mode,
    rigMode,
    sheetIndex,
  });
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

  it('leaves the nine categories that turn about nothing with one answer', () => {
    // Each argues its own case in its plan file: an item has no rig, a building's modules butt on a
    // shared width, a terrain is ground, an effect is a stretch of time, a slider handle travels
    // along a track, a face's features are replaced rather than swung, an icon's state pieces are
    // laid over it rather than hinged to it, a band scrolls rather than flexes, and a glyph's overlay
    // is drawn into the same component rather than hinged to it. Named rather than derived, because
    // the whole point of the table is that these nine are a decision someone made and not a fact
    // falling out of another list.
    expect(UNARTICULATED).toEqual([
      'ITEM',
      'BUILDING',
      'EFFECT',
      'INTERFACE',
      'TERRAIN',
      'PORTRAIT',
      'ICON',
      'BACKGROUND',
      'FONT',
    ]);
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
    expect(resolveRigMode(category, seriesFor(category), 'POSE_LIBRARY')).toBe('NONE');
    expect(resolveRigMode(category, seriesFor(category), 'CUTOUT_RIG')).toBe('NONE');
  });

  it.each(ARTICULATED)('is left alone on %s, which can honour it', (category) => {
    // `POSE_LIBRARY` stands on every pairing these four can produce. `CUTOUT_RIG` stands only where
    // the pairing delivers no sheet of posed variants, which on the studio's default mode is OBJECT
    // and VEHICLE — CHARACTER and CREATURE pair their directional core with an articulation sheet,
    // and that is one deliverable rather than two.
    expect(resolveRigMode(category, seriesFor(category), 'POSE_LIBRARY')).toBe('POSE_LIBRARY');
    expect(resolveRigMode(category, seriesFor(category), 'CUTOUT_RIG')).toBe(
      posedModes(category).includes(DEFAULT_MODE) ? 'POSE_LIBRARY' : 'CUTOUT_RIG',
    );
  });
});

describe('the sheet whose inventory is the rig', () => {
  it.each(RIG_SHEET_CATEGORIES)('settles the rig on %s, whatever the configuration asks', (category) => {
    // The defect, at the level it lives: the sheet mode and the rig mode were unrelated controls, so
    // a fresh studio switched to this sheet compiled rig pieces against `POSE_LIBRARY` — and against
    // `NONE`, which the control offers on all four of these categories, with no rig section at all.
    for (const rigMode of RIG_MODES) {
      expect(resolveRigMode(category, seriesFor(category, RIG_SHEET), rigMode)).toBe('CUTOUT_RIG');
    }
    expect(fixedRigMode(seriesFor(category, RIG_SHEET))).toBe('CUTOUT_RIG');
  });

  it.each(SUBJECT_CATEGORIES)('demands a rig on no sheet but that one, on %s', (category) => {
    // Only a sheet whose whole inventory is rig pieces settles the rig outright. Every other sheet
    // either leaves the choice open or narrows it, which is a different relation and is checked
    // below. Derived from the category's own sheets rather than named, so a plan that grows a rig
    // demand has to be admitted here rather than silently exempted — and swept over every sheet of
    // every series, because a mode holds more than one and they need not agree.
    for (const series of everySeries(category)) {
      if (series.some((plan) => plan.posing === 'AT_REST')) continue;
      expect(fixedRigMode(series)).toBeUndefined();
    }
  });

  it.each(UNARTICULATED)('is not a sheet %s produces, so a stored one settles nothing', (category) => {
    // The mode is resolved before it is read, which is what stops the demand outliving the plan: an
    // ITEM or a BUILDING carrying this mode from an older build draws its category's default sheet,
    // and may not be handed a rig it has no joints for on the way.
    expect(supportsMode(category, RIG_SHEET)).toBe(false);
    expect(fixedRigMode(seriesFor(category, RIG_SHEET))).toBeUndefined();
    expect(resolveRigMode(category, seriesFor(category, RIG_SHEET), 'CUTOUT_RIG')).toBe('NONE');
  });

  it('only ever settles on a rig the category supports', () => {
    // `fixedRigMode` does not filter its answer through `CATEGORY_RIG_MODES` — the sheet's demand
    // outranks the stored field, and a category with the sheet but not the rig would be handed one it
    // cannot honour. The entailment above is what makes that safe, and this is where it is checked as
    // a property of the resolution rather than of the two tables.
    for (const category of SUBJECT_CATEGORIES) {
      for (const series of everySeries(category)) {
        const fixed = fixedRigMode(series);
        if (fixed !== undefined) expect(supportsRigMode(category, fixed)).toBe(true);
      }
    }
  });
});

describe('the reported failure: a rig section on a sheet with no joints', () => {
  it.each(UNARTICULATED)('%s emits neither rig section, whatever the configuration asks', (category) => {
    for (const rigMode of ['POSE_LIBRARY', 'CUTOUT_RIG'] as const) {
      const prompt = promptFor(category, DEFAULT_MODE, rigMode);

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
    // Each rig is asked for on a pairing that can carry it: `POSE_LIBRARY` on every one, and the
    // cut-out rig on the first pairing whose artwork settles nothing — which for OBJECT and VEHICLE
    // is the default sheet mode and for CHARACTER and CREATURE is the rig sheet, since their
    // directional pairing delivers an articulation sheet.
    const unposed = modesFor(category).find((mode) => !posedModes(category).includes(mode));
    if (unposed === undefined) throw new Error(`${category} has no pairing that leaves the rig open.`);

    expect(promptFor(category, DEFAULT_MODE, 'POSE_LIBRARY')).toContain(RIG_SECTIONS.POSE_LIBRARY);
    expect(promptFor(category, unposed, 'CUTOUT_RIG')).toContain(RIG_SECTIONS.CUTOUT_RIG);
    expectNoRigSection(promptFor(category, DEFAULT_MODE, 'NONE'));
  });
});

describe('the reported failure: a rig sheet with no rig geometry in it', () => {
  it.each(RIG_SHEET_CATEGORIES)(
    '%s carries the whole rig section, whatever it was left holding',
    (category) => {
      for (const rigMode of RIG_MODES) {
        const prompt = promptFor(category, RIG_SHEET, rigMode);

        expect(prompt).toContain(RIG_SECTIONS.CUTOUT_RIG);
        // The four things the reported prompt was missing, in the template's own words. Broken at the
        // line the skeleton wraps on, because these are asserted against the compiled text.
        expect(prompt).toContain('is the centre of that cap');
        expect(prompt).toContain('Matching pivots share a diameter');
        expect(prompt).toContain('past its pivot centre');
        expect(prompt).toContain('butt together exactly will show a visible gap');
        expect(prompt).toContain('### Depth order for this direction');
      }
    },
  );

  it.each(RIG_SHEET_CATEGORIES)('%s carries the three settings the block was taking with it', (category) => {
    // `JOINT_CAP_DESCRIPTION`, `OVERLAP_MARGIN_DESCRIPTION` and `SOCKETS` were all still computed and
    // then dropped with the section that would have printed them — and `RiggingFields` hides all
    // three unless the rig is a cut-out rig, so a user on this sheet could not see they were inert.
    //
    // Each is set away from its default, and the sockets away from the empty string the studio opens
    // with, so that every assertion here is a substring the prompt could genuinely be missing.
    const prompt = generatePrompt(category, defaultSubjectFor(category), {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: RIG_SHEET,
      jointCapStyle: 'TAPERED',
      overlapMargin: 'FULL_CAP',
      sockets: 'head, chest, back',
    });

    expect(prompt).toContain(JOINT_CAP_TEXT.TAPERED);
    expect(prompt).toContain(OVERLAP_MARGIN_TEXT.FULL_CAP);
    expect(prompt).toContain('### Attachment sockets');
    expect(prompt).toContain('head, chest, back');
  });

  it.each(RIG_SHEET_CATEGORIES)('%s never emits the pose-library section on that sheet', (category) => {
    // The other way the two could disagree, and the one the studio actually opened in: `POSE_LIBRARY`
    // is the stored default, so before this its rules — assembled by hand, no pivot registration —
    // were what a sheet of rig pieces got.
    for (const rigMode of RIG_MODES) {
      expect(promptFor(category, RIG_SHEET, rigMode)).not.toContain(RIG_SECTIONS.POSE_LIBRARY);
    }
  });

  it('is one control away from the studio’s own defaults', () => {
    // The reproduction from the report: open the studio on the defaults, leave the category on
    // CHARACTER, change Sheet Contents. Nothing else is touched, and the rig mode the configuration
    // still holds is the one that used to reach the compiler.
    expect(DEFAULT_OUTPUT_CONFIG.rigMode).toBe('POSE_LIBRARY');
    expect(supportsMode('CHARACTER', RIG_SHEET)).toBe(true);

    const prompt = generatePrompt('CHARACTER', defaultSubjectFor('CHARACTER'), {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: RIG_SHEET,
    });

    // The inventory and the assembly promise the report quoted, either side of the section that was
    // missing between them — so a revert reads as this pairing rather than as a heading count.
    expect(prompt).toContain('Rig pieces');
    expect(prompt).toContain('rotating the pieces about their pivots');
    expect(prompt).toContain(RIG_SECTIONS.CUTOUT_RIG);
  });
});

describe('the reported failure: a cut-out rig on a sheet of posed variants', () => {
  it('is the six sheets named here, so the sweeps below are not vacuous', () => {
    // Named rather than derived, because a filter that has stopped matching would leave every
    // assertion in this block passing over an empty list. These are the plans the report quoted:
    // the character's and creature's pose libraries and articulation sheets, and the object's and
    // vehicle's part libraries.
    expect(ARTICULATED.flatMap((category) => posedSheets(category).map((sheet) => sheet.name))).toEqual([
      'Pose library',
      'Articulation',
      'Pose library',
      'Articulation',
      'Part library',
      'Part library',
    ]);
  });

  it('reaches five pairings, two of which commit on a sheet that is not their first', () => {
    // The distinction the per-sheet answer got wrong, pinned as its own claim: a character's and a
    // creature's directional pairing deliver a trunk sheet that settles nothing *and* an
    // articulation sheet that settles everything, and it is the pairing that has to answer. Written
    // out, so a series that stops mixing the two shows up here rather than quietly widening what the
    // cut-out rig is offered on.
    expect(ARTICULATED.map((category) => posedModes(category))).toEqual([
      ['SINGLE_DIRECTION_POSE_LIBRARY', 'CORE_DIRECTIONAL_VARIANTS'],
      ['SINGLE_DIRECTION_POSE_LIBRARY', 'CORE_DIRECTIONAL_VARIANTS'],
      ['SINGLE_DIRECTION_POSE_LIBRARY'],
      ['SINGLE_DIRECTION_POSE_LIBRARY'],
    ]);
    expect(posedSheets('CHARACTER').map((sheet) => sheet.index)).toEqual([0, 1]);
  });

  it.each(ARTICULATED)('%s resolves the cut-out rig away on every pairing that has one', (category) => {
    // The defect at the level it lives. Section 4 requires each part in several orientations or
    // states, section 5's rest-orientation rule then forbids a pre-bent segment and requires every
    // articulation left at its neutral angle, and section 9 audits the result for "straight and
    // unposed" — one prompt requiring what it forbids, because nothing related a plan's entries to
    // the rig section beside them.
    //
    // It lands on `POSE_LIBRARY` rather than `NONE` because that is what such a deliverable *is*:
    // its variants are separately oriented rigid segments meeting at shared pivots, which is that
    // section's own wording. Falling to `NONE` would drop the only section saying so.
    for (const mode of posedModes(category)) {
      expect(resolveRigMode(category, seriesFor(category, mode), 'CUTOUT_RIG')).toBe('POSE_LIBRARY');
    }
  });

  it.each(SUBJECT_CATEGORIES)('never leaves a cut-out rig on a posed pairing of %s', (category) => {
    // The same claim as a property, over every pairing and every direction set — which is what
    // covers the sheets no assertion above names, and the ones a future plan adds.
    for (const series of everySeries(category)) {
      if (!series.some((plan) => plan.posing === 'PER_POSITION')) continue;

      for (const rigMode of RIG_MODES) {
        expect(resolveRigMode(category, series, rigMode)).not.toBe('CUTOUT_RIG');
      }
    }
  });

  it.each(ARTICULATED)('%s compiles the same prompt whichever of the two it was left holding', (category) => {
    // The strongest form of the fix, and the one that needs no quoted sentence: a stored
    // `CUTOUT_RIG` reaching one of these pairings produces the *identical* document a stored
    // `POSE_LIBRARY` produces, so there is nothing of the cut-out rig left anywhere in it — not the
    // section, not the audit item, and not the joint-cap, overlap or socket settings it gates.
    //
    // **Every sheet of the pairing, not only the posed one**, which is the half a per-sheet answer
    // could not give: a character's trunk sheets used to compile a cut-out rig while the
    // articulation sheet behind them compiled a pose library, so the trunk was drawn to a stated cap
    // style and overlap margin that the sheet supplying its limbs was never told.
    for (const mode of posedModes(category)) {
      seriesFor(category, mode).forEach((_plan, index) => {
        expect(promptFor(category, mode, 'CUTOUT_RIG', index)).toBe(
          promptFor(category, mode, 'POSE_LIBRARY', index),
        );
      });
    }
  });

  it.each(ARTICULATED)('%s carries neither rule the inventory contradicts', (category) => {
    // The two sentences the report quoted, named so a revert surfaces as this test rather than as a
    // prompt that merely differs. The pose-library heading beside them is what makes their absence a
    // substituted section rather than a dropped one.
    for (const mode of posedModes(category)) {
      seriesFor(category, mode).forEach((_plan, index) => {
        const prompt = promptFor(category, mode, 'CUTOUT_RIG', index);

        expect(prompt).not.toContain('neutral rest orientation');
        expect(prompt).not.toContain('straight and unposed');
        expect(prompt).toContain(RIG_SECTIONS.POSE_LIBRARY);
      });
    }
  });

  it('still asks for the orientations the inventory was written for', () => {
    // The other half, and the one that would catch a "fix" that resolved the contradiction by
    // trimming section 4 instead. These are the report's own excerpts, from the two categories it
    // quoted: the articulation sheet the studio reaches from `CORE_DIRECTIONAL_VARIANTS`, and the
    // object part library.
    const articulation = posedSheets('CHARACTER').find((sheet) => sheet.mode === 'CORE_DIRECTIONAL_VARIANTS');
    if (articulation === undefined) {
      throw new Error('The character directional series no longer carries a sheet of posed variants.');
    }

    const limbs = promptFor('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', 'CUTOUT_RIG', articulation.index);
    expect(limbs).toContain('Upper arms: neutral lowered, forward-diagonal, raised');
    expect(limbs).toContain('Feet: flat planted, forward-step/heel-strike, rear-step/toe-off');

    const parts = promptFor('OBJECT', 'SINGLE_DIRECTION_POSE_LIBRARY', 'CUTOUT_RIG');
    expect(parts).toContain('Access panel, lid or hatch: closed, part-open, fully open');
    expect(parts).toContain('Primary moving subassembly: rest, mid-travel, full-travel');
  });

  it.each(ARTICULATED)('%s does not offer it on those pairings either', (category) => {
    // The studio half. Resolving silently would leave the control offering a value the compiler
    // discards, which is the "a setting the compiler discards" defect rather than a fix for it.
    for (const mode of posedModes(category)) {
      expect(valuesFor(category, mode)).toEqual(['POSE_LIBRARY', 'NONE']);
    }
  });

  it('leaves the choice alone on the pairings that can honour it', () => {
    // The refusal is narrow: it is about what a deliverable's artwork has already committed to, not
    // about the category. An OBJECT and a VEHICLE turn their moving parts with the camera and draw
    // no posed sheet at all, so all three stand on their directional pairing — and every category's
    // rig sheet keeps the whole list, with the select disabled at the value its own inventory
    // settles.
    expect(valuesFor('OBJECT', DEFAULT_MODE)).toEqual(['POSE_LIBRARY', 'CUTOUT_RIG', 'NONE']);
    expect(valuesFor('VEHICLE', DEFAULT_MODE)).toEqual(['POSE_LIBRARY', 'CUTOUT_RIG', 'NONE']);
    for (const category of ARTICULATED) {
      expect(valuesFor(category, RIG_SHEET)).toEqual(['POSE_LIBRARY', 'CUTOUT_RIG', 'NONE']);
    }
  });
});

describe('the control offers what the category can be given', () => {
  it('offers the three in the order the control shows them, not the order the table lists them', () => {
    // Written out rather than derived, and unsorted, because both halves are the assertion. Compared
    // against `CATEGORY_RIG_MODES` this would pass on a wrong table — the filter and the expectation
    // read the same row — and sorting it would drop the only thing the labels list decides, which is
    // that the two rigs come before the answer for a sheet that has none.
    expect(valuesFor('CHARACTER', RIG_SHEET)).toEqual(['POSE_LIBRARY', 'CUTOUT_RIG', 'NONE']);
    expect(valuesFor('BUILDING')).toEqual(['NONE']);
  });

  it.each(SUBJECT_CATEGORIES)('%s offers its whole row and nothing else', (category) => {
    // The wiring check the two literals above cannot generalise: every row reaches the control
    // intact, so a category added to the table without a label is a missing option rather than a
    // silently shorter list.
    //
    // Asked on the rig sheet, which is the one pairing that narrows nothing — it settles the rig
    // rather than withdrawing an option, and `rigModeChoices` deliberately leaves its list whole so
    // the control can show the value disabled. For the nine categories that do not produce it, the
    // mode resolves to their own default and the row is `NONE` alone, which nothing can shorten.
    expect([...valuesFor(category, RIG_SHEET)].sort()).toEqual([...CATEGORY_RIG_MODES[category]].sort());
  });

  it('leaves nothing to choose where the category has one answer', () => {
    // Which is what `RiggingFields` reads to put a sentence there instead of a single-option select.
    for (const category of UNARTICULATED) {
      for (const series of everySeries(category)) {
        expect(rigModeChoices(category, series)).toHaveLength(1);
      }
    }
  });
});
