import { describe, expect, it } from 'vitest';
import { PRESETS } from '../presets/index.ts';
import { STYLE_REFERENCE_IDS } from '../../types/styleReference.ts';
import type { StyleReference } from '../../types/styleReference.ts';
import { styleReferencePatch } from '../../utils/styleReferencePatch.ts';
import { LABEL_BUDGET } from '../../../tests/selectLabelBudget.ts';
import { STYLE_REFERENCE_CHOICES, STYLE_REFERENCES, styleReferenceFor } from './index.ts';

/**
 * The art style reference library's own contract.
 *
 * Two of these checks are the reason this file exists rather than the coverage rule that holds every
 * other output setting: that **a characteristic never restates a setting**, which is what keeps an
 * edited configuration from compiling to a prompt that argues with itself, and that **every shipped
 * reference is demonstrated by a preset**, which is the discoverability the coverage test provides
 * for everything else.
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
 * either restating the projection line above it — the failure this guards — or contradicting it.
 */
const SETTING_IDENTIFIER = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/;

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

  it.each(REFERENCES)('$name writes characteristics that no setting already carries', (reference) => {
    // The load-bearing one. A reference is a template, so the settings it writes belong to the
    // reader the moment it is applied; a characteristic that restated one would become false as
    // soon as they changed that control, and the prompt would carry both readings at once.
    const restating = reference.characteristics.filter((line) => SETTING_IDENTIFIER.test(line));
    expect(restating, `${reference.name} names a setting identifier in its own characteristics`).toEqual([]);
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

  it('offers every reference in the dropdown, NONE first', () => {
    expect(STYLE_REFERENCE_CHOICES.map((choice) => choice.value)).toEqual([...STYLE_REFERENCE_IDS]);
    expect(STYLE_REFERENCE_CHOICES[0]?.label).toContain('NONE');
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
