import { describe, expect, it } from 'vitest';
import { hardwareProfileFor } from '../hardware/index.ts';
import { PRESETS } from '../presets/index.ts';
import { STYLE_REFERENCE_IDS } from '../../types/styleReference.ts';
import type { StyleReference } from '../../types/styleReference.ts';
import { styleReferencePatch } from '../../utils/styleReferencePatch.ts';
import { LABEL_BUDGET } from '../../../tests/selectLabelBudget.ts';
import { resolveCameraElevation } from '../promptText/index.ts';
import { STYLE_REFERENCES, styleReferenceChoices, styleReferenceFor } from './index.ts';
import { supportsStyleReference } from '../categoryStyleReferences.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';

/**
 * The art style reference library's own contract.
 *
 * This file exists rather than the coverage rule that holds every other output setting because two of
 * its checks have no equivalent there: that **a characteristic never restates a setting**, which is
 * what keeps an edited configuration from compiling to a prompt that argues with itself, and that
 * **every shipped reference is demonstrated by a preset**, which is the discoverability the coverage
 * test provides for everything else.
 *
 * **The first of those is only partly mechanical, and the file is explicit about which part.** Two
 * spellings of a restatement can be caught — a setting identifier pasted into prose, and any mention
 * of facings — and the general case cannot, because it is a question about meaning. The comments on
 * each assertion say what it does and does not reach, so that nobody reads a green run here as the
 * rule being enforced.
 */

/** Every reference that is not `NONE`, which is the only member with no definition. */
const REFERENCES: readonly StyleReference[] = STYLE_REFERENCE_IDS.map(styleReferenceFor).filter(
  (reference): reference is StyleReference => reference !== null,
);

/**
 * The setting identifiers a characteristic may not contain.
 *
 * Screaming-snake identifiers alone, because those are what the compiled prompt is written against
 * and what a reader compares the two blocks by. A characteristic mentioning `TRUE_ISOMETRIC` is
 * either restating the projection line above it or contradicting it.
 *
 * **This catches one narrow spelling of the restatement rule and no more, and saying so is the
 * point.** The rule is about *meaning* — "the contour is the darkest shade of each area's own colour"
 * restates `DARK_LOCAL_CONTOUR` perfectly while containing no identifier at all — and no regex reads
 * meaning. Four references shipped exactly that sentence and this assertion passed on all four. What
 * follows below is the half that *is* mechanical; the rest is a review responsibility, and the way to
 * discharge it is to compile a preset and read section 2 against sections 0 and 3.
 */
const SETTING_IDENTIFIER = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/;

/**
 * The vocabulary of facings and mirroring, which a characteristic may never use.
 *
 * The one restatement that is mechanically catchable, and the one that actually shipped broken. The
 * direction set speaks for facings, so a characteristic naming them restates a control the reader can
 * change — and worse, it can restate it into a flat contradiction: four presets said "one side view
 * mirrored to serve the other" in section 2 while section 3 of the same prompt said "two views
 * identical up to reflection are one view delivered twice, not two views", because a four-cardinal
 * sheet holds a reflection pair and the template warns about it. A look's real facing scheme belongs
 * on the preset card, which is read by a person and never sent to a generator.
 */
const FACING_VOCABULARY = /\b(facing|facings|mirror|mirrored|mirroring|flipped|flipping)\b/i;

describe('every art style reference', () => {
  it('defines every id but NONE, and NONE alone', () => {
    expect(STYLE_REFERENCES.NONE).toBeNull();
    expect(REFERENCES.length).toBe(STYLE_REFERENCE_IDS.length - 1);
  });

  it.each(REFERENCES)('$name is offered under a label the narrowest select can render', (reference) => {
    // The budget is enforced across the whole app in `select-option-labels.test.ts`; asserted here
    // too because that file checks the list a component renders, and this one is what a reference
    // has to satisfy on the day it is written.
    expect(reference.label.length).toBeLessThanOrEqual(LABEL_BUDGET);
    expect(reference.label).toContain('—');
  });

  it.each(REFERENCES)('$name states colour exactly once', (reference) => {
    // A pinned palette supersedes the budget everywhere, so a reference that set both would be
    // writing a field that does nothing — and would overwrite the reader's own budget for when they
    // set the palette back to FREE. Exactly one of the two is the colour statement.
    const { palette, paletteLimit } = reference.settings;
    expect(
      palette === 'FREE',
      `${reference.name} pins ${palette} and also names a budget of ${String(paletteLimit)}`,
    ).toBe(paletteLimit !== null);
  });

  it.each(REFERENCES)('$name keeps a stated size and a CUSTOM profile together', (reference) => {
    // `CUSTOM` means "work to the target component size". With the size empty it means nothing at
    // all, and the prompt loses the only statement of scale it had — the same pairing
    // `presetCoverage.test.ts` holds for the library.
    const { resolutionProfile, spriteTargetSize } = reference.settings;
    expect(resolutionProfile === 'CUSTOM').toBe(spriteTargetSize !== '');
  });

  it.each(REFERENCES)('$name writes characteristics that name no setting identifier', (reference) => {
    const restating = reference.characteristics.filter((line) => SETTING_IDENTIFIER.test(line));
    expect(restating, `${reference.name} names a setting identifier in its own characteristics`).toEqual([]);
  });

  it.each(REFERENCES)('$name says nothing about how many ways the subject turns', (reference) => {
    const facings = reference.characteristics.filter((line) => FACING_VOCABULARY.test(line));
    expect(
      facings,
      `${reference.name} states a facing scheme, which the direction set already decides — put it on the preset card instead`,
    ).toEqual([]);
  });

  it.each(REFERENCES)('$name does not repeat the machine it pins', (reference) => {
    // The other half of "each states something the settings above have no way to say", which is what
    // the template tells the generator about this block. A reference pinning a hardware profile gets
    // that machine's constraints printed directly above its own list, so a display or a tile figure
    // restated here arrives twice in one section — three of them did.
    //
    // Compared as whole stated sentences rather than as numbers, because the numbers are legitimately
    // shared: a reference may cite the machine's 8 × 8 tile to explain the 16 × 16 grid the game built
    // on top of it, and that sentence is doing work the profile's own line does not.
    const profile = hardwareProfileFor(reference.settings.hardwareProfile);
    if (profile === null) return;

    const stated = new Set(profile.constraints.map((constraint) => constraint.trim()));
    const repeated = reference.characteristics.filter((line) => stated.has(line.trim()));
    expect(repeated, `${reference.name} repeats a constraint ${profile.name} already states`).toEqual([]);
  });

  it.each(REFERENCES)('$name writes characteristics as sentences, punctuated as the app is', (reference) => {
    expect(reference.characteristics.length).toBeGreaterThan(0);

    for (const line of reference.characteristics) {
      expect(line).toMatch(/^[A-Z“]/);
      expect(line.endsWith('.')).toBe(true);
      expect(line.trim()).toBe(line);
      expect(line).not.toContain("'");
      expect(line).not.toContain('"');
    }
  });

  it('never gives two references the same measurement', () => {
    // The copy-paste that leaves one look carrying another's figures — a reference written by
    // duplicating its neighbour and changing the name. It reads correctly in both places, which is
    // why review does not catch it.
    //
    // **Only lines carrying a figure**, and the exclusion is the point rather than a weakening. Four
    // of these games really do draw four cardinal facings and mirror one side, and five really do
    // put a flat front elevation over ground seen from above; those sentences are a shared
    // convention, and demanding five spellings of one fact would be writing prose to satisfy a test
    // — with the result that five references state the same thing five slightly different ways and a
    // reader comparing them cannot tell which differences are real. A *number* shared by two games is
    // the case with no such defence.
    const measurements = REFERENCES.flatMap((reference) =>
      reference.characteristics.filter((line) => /\d/.test(line)),
    );
    const duplicated = measurements.filter((line, index) => measurements.indexOf(line) !== index);

    expect([...new Set(duplicated)]).toEqual([]);
  });

  it('stands its camera where its own projection can stand', () => {
    // A reference writes a projection *and* an elevation, which are two statements about one camera —
    // and all but the angled-overhead projection fix the elevation, so a pair written by hand can
    // name a camera that projection cannot be drawn at. `resolveCameraElevation` would then quietly
    // move the figure on the way to the prompt, and the reference would be demonstrating a look it
    // does not carry. The library is the third hand-written list of these pairs, after the defaults
    // and the presets.
    for (const { name, settings } of REFERENCES) {
      expect(resolveCameraElevation(settings.projection, settings.cameraElevation), name).toBe(
        settings.cameraElevation,
      );
    }
  });

  it('offers every reference in the dropdown, NONE first', () => {
    // Against a category that can be drawn under every camera, which is nine of the thirteen — the
    // other four are the scoping, checked below.
    expect(styleReferenceChoices('CHARACTER').map((choice) => choice.value)).toEqual([
      ...STYLE_REFERENCE_IDS,
    ]);
    expect(styleReferenceChoices('CHARACTER')[0]?.label).toContain('NONE');
  });

  it('offers a category only the looks its subject can be drawn to match', () => {
    // A reference states the camera it was rendered under, and its characteristics carry that camera
    // into section 2 as a measurement no resolver downstream can edit. So a look whose projection the
    // subject cannot be drawn under is not offered — which for INTERFACE, PORTRAIT, BACKGROUND and
    // FONT alike removes the six side-on and the two dimetric references and keeps the four rendered
    // flat on.
    const offered = styleReferenceChoices('INTERFACE').map((choice) => choice.value);

    expect(offered).toContain('NONE');
    expect(offered.length).toBeLessThan(STYLE_REFERENCE_IDS.length);
    for (const reference of REFERENCES) {
      expect(
        offered.includes(reference.id),
        `${reference.id} is drawn under ${reference.settings.projection}`,
      ).toBe(reference.settings.projection === 'ORTHOGRAPHIC_FRONT');
    }
  });

  it('keeps NONE for every category, which is what the fallback rests on', () => {
    // `resolveStyleReference` degrades to `NONE` rather than to a per-category default, so a category
    // that could not be offered it would have nothing to degrade to.
    for (const category of SUBJECT_CATEGORIES) {
      expect(supportsStyleReference(category, 'NONE'), category).toBe(true);
      expect(styleReferenceChoices(category).length).toBeGreaterThan(0);
    }
  });
});

describe('the library is demonstrated and applied', () => {
  it.each(REFERENCES)('$name is demonstrated by a shipped preset', (reference) => {
    // What `presetCoverage.test.ts` does for every other output setting, stated here instead: a
    // reference with no preset behind it is a line in a dropdown, and nothing in the interface says
    // which sheet mode or facings the look actually wants alongside it.
    const owning = PRESETS.filter((preset) => preset.output.styleReference === reference.id);
    expect(owning.length, `no shipped preset names ${reference.id}`).toBeGreaterThan(0);
  });

  it.each(REFERENCES)('$name reaches a preset unaltered', (reference) => {
    // The presets derive their look from the reference rather than restating it, and this is what
    // holds that: every setting the reference writes has to survive into the preset that names it.
    // A preset overriding one would be a card promising a look its own sheet is not drawn to.
    const patch = styleReferencePatch(reference);

    for (const preset of PRESETS.filter((entry) => entry.output.styleReference === reference.id)) {
      expect(preset.output, `${preset.name} departs from ${reference.id}`).toMatchObject(patch);
    }
  });

  it('leaves the naming switch off in every shipped preset', () => {
    // Naming the game is a fact about the target being pasted into, not about the archetype — and
    // several targets refuse a commercial title outright. No built-in decides that for a reader.
    expect(PRESETS.filter((preset) => preset.output.nameStyleReference)).toEqual([]);
  });
});
