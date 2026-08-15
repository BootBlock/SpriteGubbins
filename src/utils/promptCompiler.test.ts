import { describe, expect, it } from 'vitest';
import { NO_ADDITIONAL_ANATOMY } from '../constants/anatomy.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { HARDWARE_PROFILES } from '../constants/hardware/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { PALETTES } from '../constants/palettes/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import * as promptText from '../constants/promptText/index.ts';
import { HARDWARE_PROFILE_IDS, RENDER_STYLES, RIG_MODES, TARGET_MODEL_IDS } from '../types/output.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_CATEGORIES, SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { countWords, estimateTokens, generatePrompt } from './promptCompiler.ts';

/**
 * The compiler is the app. Everything else is a way of choosing its arguments, so these tests assert
 * on what the generated prompt actually *says* — a check that it is merely a non-empty string would
 * pass for every way this can go wrong.
 *
 * Two responsibilities have their own files rather than living here, because this one had grown into
 * all three: `componentSet.test.ts` holds the component-count arithmetic and the five readers that
 * must agree on it, and `constants/promptTemplate.test.ts` holds the template document's own
 * integrity. What is left is what the compiler *says* for a given studio state.
 */

const SUBJECT = DEFAULT_PRESET.subject;
const OUTPUT = DEFAULT_OUTPUT_CONFIG;

function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...OUTPUT, ...overrides };
}

/** Every field cleared — the case v1 filled with `DEFINED` tokens. */
const EMPTY_SUBJECT: SubjectDefinition = Object.fromEntries(
  SUBJECT_FIELD_KEYS.map((key) => [key, '']),
) as SubjectDefinition;

describe('generatePrompt — the subject', () => {
  it('writes every stated subject field into the prompt', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, OUTPUT);
    for (const value of Object.values(SUBJECT)) {
      // `NONE` is the one value that deliberately does not reach the prompt: it states that there is
      // no additional anatomy, and the way to state that is to say nothing. See the block below.
      if (value === NO_ADDITIONAL_ANATOMY) continue;
      expect(prompt, `subject value "${value}" is missing from the prompt`).toContain(value);
    }
  });

  it('names the category in the heading and in the definition block', () => {
    const prompt = generatePrompt('BUILDING', SUBJECT, OUTPUT);
    expect(prompt).toContain('# MODULAR SPRITE-SHEET SPECIFICATION — BUILDING');
    expect(prompt).toContain('- Category: BUILDING');
  });

  it('omits a cleared field entirely rather than naming it as undecided', () => {
    // The defect this template was rewritten for. `DEFINED` is a content-shaped token in the
    // highest-weighted section: a generator reading `Species: DEFINED` either ignores the line or
    // treats "DEFINED" as a descriptor to satisfy. An absent line says "you decide" precisely.
    const prompt = generatePrompt('CHARACTER', { ...SUBJECT, species: '' }, OUTPUT);

    expect(prompt).not.toContain('Species / Archetype');
    expect(prompt).not.toContain('DEFINED');
    // The fields that are still set must survive the removal.
    expect(prompt).toContain(`- Role / Class: ${SUBJECT.role}`);
  });

  it('leaves no DEFINED token and no ragged blank lines for a wholly empty subject', () => {
    const prompt = generatePrompt('CHARACTER', EMPTY_SUBJECT, OUTPUT);

    expect(prompt).not.toContain('DEFINED');
    expect(prompt).toContain('- Category: CHARACTER');
    // Fifteen optional lines removed in a row is exactly where a ladder of blank lines appears, and
    // that is what makes a generated prompt look broken.
    expect(prompt).not.toMatch(/\n\n\n/);
  });

  it('leaves no ragged blank lines for a fully populated subject either', () => {
    expect(generatePrompt('CHARACTER', SUBJECT, OUTPUT)).not.toMatch(/\n\n\n/);
  });

  it('states outright that an absent attribute is the generator’s to choose', () => {
    // Absence has to be *declared*, or it is merely silent — and silence is what a model fills in.
    expect(generatePrompt('CHARACTER', EMPTY_SUBJECT, OUTPUT)).toContain(
      '**An attribute that is absent from this list is yours to decide**',
    );
  });

  it('names the separately-counted field by the label its own category gives it', () => {
    // Section 1's "painted onto the component it sits on" rule has exactly one exception, and the
    // sentence stating it has to name the line it excepts — otherwise a reader cannot tell which of
    // the fifteen attributes above is the one section 4 counts separately. So the sentence takes the
    // same per-category label the line does: *Attached Modules* on a vehicle, not "anatomy".
    const vehicle = generatePrompt(
      'VEHICLE',
      { ...defaultSubjectFor('VEHICLE'), additional_anatomy: 'Missile Pod ×2' },
      OUTPUT,
    );

    expect(vehicle).toContain('- Attached Modules: Missile Pod ×2');
    expect(vehicle).toContain('**Attached Modules** is the single exception');
    expect(vehicle).not.toContain('anatomical');
  });

  it('draws section 0’s scale example from components this category’s sheet actually holds', () => {
    // "One consistent scale across every component" is abstract, and the clause after the colon is
    // what makes it land — so it was a hand and a torso for all six categories, telling a vehicle
    // sheet to keep in proportion two things it has neither of.
    for (const category of SUBJECT_CATEGORIES) {
      const prompt = generatePrompt(category, defaultSubjectFor(category), OUTPUT);
      expect(prompt).toContain(
        `One consistent scale across every component: ${promptText.SCALE_EXAMPLE_TEXT[category]}.`,
      );
    }
    expect(generatePrompt('VEHICLE', defaultSubjectFor('VEHICLE'), OUTPUT)).not.toContain(
      promptText.SCALE_EXAMPLE_TEXT.CHARACTER,
    );
  });
});

describe('generatePrompt — conditional blocks', () => {
  it('includes the pixel-discipline block only for the pixel styles', () => {
    const pixel = generatePrompt('CHARACTER', SUBJECT, withOutput({ renderStyle: 'PIXEL_ART' }));
    expect(pixel).toContain('### Pixel discipline');
    expect(pixel).not.toContain('### Surface discipline');

    const painted = generatePrompt('CHARACTER', SUBJECT, withOutput({ renderStyle: 'PAINTED_2D' }));
    expect(painted).toContain('### Surface discipline');
    expect(painted).not.toContain('### Pixel discipline');
  });

  it('includes the cut-out rig section only for a cut-out rig', () => {
    const rig = generatePrompt('CHARACTER', SUBJECT, withOutput({ rigMode: 'CUTOUT_RIG' }));
    expect(rig).toContain('## 5. CUT-OUT RIG REQUIREMENTS');
    expect(rig).toContain('### Depth order for this direction');

    const library = generatePrompt('CHARACTER', SUBJECT, withOutput({ rigMode: 'POSE_LIBRARY' }));
    expect(library).toContain('## 5. RIGID SEGMENTS AND PIVOTS');
    expect(library).not.toContain('CUT-OUT RIG REQUIREMENTS');

    const none = generatePrompt('CHARACTER', SUBJECT, withOutput({ rigMode: 'NONE' }));
    expect(none).not.toContain('CUT-OUT RIG REQUIREMENTS');
    expect(none).not.toContain('RIGID SEGMENTS AND PIVOTS');
    // And the number the rig section vacated goes to the section that follows it rather than being
    // left as a hole — the numbering is computed from the headings that survived.
    expect(none).toContain('## 5. REQUIRED ASSEMBLY CAPABILITY');
  });

  it('drops the socket block when a pose library carries a stale socket list', () => {
    // Sockets belong to a rig, and the template says so by nesting the socket block inside the
    // rig section: a leftover list from an earlier configuration is dropped with the section that
    // gives it meaning, rather than stranding an orphaned heading mid-sheet.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ rigMode: 'POSE_LIBRARY', sockets: 'head, chest' }),
    );
    expect(prompt).not.toContain('Attachment sockets');
    expect(prompt).not.toContain('head, chest');
  });

  it('emits that same socket list once the rig section is the one being drawn', () => {
    // The other half of the nesting: dropping it for a pose library must not mean dropping it
    // everywhere, which a gate that never lets the block through would also satisfy.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ rigMode: 'CUTOUT_RIG', sockets: 'head, chest' }),
    );
    expect(prompt).toContain('Attachment sockets');
    expect(prompt).toContain('head, chest');
  });

  it('includes the identity lock only when one is given', () => {
    const locked = generatePrompt('CHARACTER', SUBJECT, withOutput({ identityLock: 'Cyan visor' }));
    expect(locked).toContain('### Identity lock');
    expect(locked).toContain('Cyan visor');

    expect(generatePrompt('CHARACTER', SUBJECT, OUTPUT)).not.toContain('### Identity lock');
  });

  it('asks for a manifest only from a target that can return one', () => {
    const sol = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ emitManifest: true, targetModel: 'CHATGPT_5_6_SOL' }),
    );
    expect(sol).toContain('## 10. COMPANION MANIFEST');

    // Midjourney returns an image and nothing else, so the section would be an instruction it can
    // only drop.
    const midjourney = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ emitManifest: true, targetModel: 'MIDJOURNEY' }),
    );
    expect(midjourney).not.toContain('COMPANION MANIFEST');
  });

  it('passes marker-shaped user text through instead of throwing', () => {
    // `generatePrompt` runs inside a `useMemo` during render with no error boundary above it, so a
    // throw here would unmount the whole app. A subject named `Robot [IF:X] guard` is an odd name,
    // not a broken template — the marker check therefore runs before substitution, not after.
    const odd = '[IF:X] Robot [/IF] [OPTIONAL:Y | z] [DEFINE:NOPE]';
    expect(() => generatePrompt('CHARACTER', { ...SUBJECT, species: odd }, OUTPUT)).not.toThrow();
    expect(generatePrompt('CHARACTER', { ...SUBJECT, species: odd }, OUTPUT)).toContain(odd);

    // The same for a free-text output field.
    expect(() =>
      generatePrompt('CHARACTER', SUBJECT, withOutput({ identityLock: 'visor [/IF]' })),
    ).not.toThrow();
  });

  it('never lets a template marker reach the output, across every branch', () => {
    // Every combination of the switches the template branches on, so no block escapes being both
    // taken and skipped. The target is one of them: it decides the self-audit and section 0's
    // category tripwire, so pinning it to one model would leave half of each of those unrendered.
    for (const targetModel of TARGET_MODEL_IDS) {
      for (const renderStyle of RENDER_STYLES) {
        for (const rigMode of RIG_MODES) {
          for (const emitManifest of [true, false]) {
            for (const emitPromptFeedback of [true, false]) {
              const prompt = generatePrompt(
                'CHARACTER',
                SUBJECT,
                withOutput({ renderStyle, rigMode, emitManifest, emitPromptFeedback, targetModel }),
              );
              const branch = `${targetModel}/${renderStyle}/${rigMode}/${String(emitManifest)}/${String(emitPromptFeedback)}`;
              expect(prompt, branch).not.toMatch(/\[(?:DEFINE|OPTIONAL|IF):|\[\/IF\]|\[N\]/);
            }
          }
        }
      }
    }
  });
});

describe('generatePrompt — numbered lists', () => {
  /**
   * Every run of `N. ` items in the prompt, split at the blank lines that separate one list from the
   * next — the same rule `applyNumbering` counts by, read back off the finished text.
   */
  function numberedRuns(prompt: string): number[][] {
    const runs: number[][] = [];
    let current: number[] = [];

    for (const line of prompt.split('\n')) {
      const item = /^[ \t]*(\d+)\. /.exec(line);
      if (item) current.push(Number(item[1]));
      else if (line.trim() === '' && current.length > 0) {
        runs.push(current);
        current = [];
      }
    }
    if (current.length > 0) runs.push(current);

    return runs;
  }

  it('numbers every list consecutively from one, whichever items the sheet drops', () => {
    // The defect: section 9's rig check and pixel-art check are conditional and independent, so a
    // pixel-art sheet in POSE_LIBRARY mode used to emit "…6. 8." — a checklist whose seventh check
    // appears to have gone missing, in the section meant to be worked through item by item.
    for (const targetModel of TARGET_MODEL_IDS) {
      for (const renderStyle of RENDER_STYLES) {
        for (const rigMode of RIG_MODES) {
          const prompt = generatePrompt(
            'CHARACTER',
            SUBJECT,
            withOutput({ renderStyle, rigMode, targetModel }),
          );
          const branch = `${targetModel}/${renderStyle}/${rigMode}`;

          for (const run of numberedRuns(prompt)) {
            expect(run, `${branch}: ${run.join(', ')}`).toStrictEqual(run.map((_item, index) => index + 1));
          }
        }
      }
    }
  });

  it('is checking lists that are actually there', () => {
    // Guards the sweep above, which passes vacuously if the prompt stops carrying numbered lists at
    // all. Section 0's contract and section 9's audit are both present on this configuration.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ targetModel: 'CHATGPT_5_6_SOL', renderStyle: 'PIXEL_ART', rigMode: 'POSE_LIBRARY' }),
    );

    expect(numberedRuns(prompt)).toHaveLength(2);
    // Six in the contract — five fixed plus the pixel-grid rule — and eight in the audit, which is
    // the run that used to end at 8 with no 7 above it and now carries the component-boundary check.
    expect(numberedRuns(prompt).map((run) => run.length)).toStrictEqual([6, 8]);
  });
});

describe('generatePrompt — section 0’s category tripwire, per target', () => {
  const TRIPWIRE = 'this specification is malformed. Say so rather than resolving';

  it('is sent only to a target with a channel to say so through', () => {
    for (const target of ['GENERIC', 'CHATGPT_5_6_SOL', 'GEMINI_FLASH_IMAGE', 'GEMINI_PRO_IMAGE'] as const) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: target }));
      expect(prompt, target).toContain(TRIPWIRE);
    }
  });

  it('is dropped for every target that returns an image and nothing else', () => {
    // SEEDREAM is the case that makes this a separate question from the self-audit: it reasons over
    // the brief, so it could notice — and it returns JPEG or PNG, so it could not tell anyone.
    for (const target of [
      'SEEDREAM',
      'QWEN_IMAGE',
      'MIDJOURNEY',
      'STABLE_DIFFUSION',
      'FLUX',
      'FLUX_API',
      'GPT_IMAGE',
    ] as const) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: target }));
      expect(prompt, target).not.toContain(TRIPWIRE);
    }
  });

  it('leaves the rest of section 0 in place when it goes', () => {
    // Only the paragraph that asks for a reply is conditional. The contract itself describes the
    // image, and the precedence order settles conflicts the generator can act on either way.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'MIDJOURNEY' }));

    expect(prompt).toContain('## 0. NON-NEGOTIABLE OUTPUT CONTRACT');
    expect(prompt).toContain('Satisfy this section before any aesthetic consideration.');
    expect(prompt).toContain('**Where two instructions pull against each other**');
    // The category guard proper lives in section 4 and states what the components *are*, which is
    // conditioning every target can use.
    expect(prompt).toContain(promptText.CATEGORY_GUARD_TEXT.CHARACTER);
  });

  it('never leaves the precedence list carrying an exception the prompt has dropped', () => {
    // The trap this gate walked into. The precedence order and the tripwire were written in one
    // change, and the ranking carried the carve-out — "…without contradicting the category" — that
    // handed the category case to the tripwire instead of ranking it. Gating the tripwire alone left
    // seven targets reading an exception clause for a rule they were never given, and left section
    // 4's guard ("an error in this specification, not an instruction to follow") unreconciled with a
    // ranking that puts the inventory above subject identity. The carve-out now lives in the gated
    // block, so the two cannot be separated again.
    for (const targetModel of TARGET_MODEL_IDS) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel }));

      expect(prompt, targetModel).toContain('**Where two instructions pull against each other**');
      expect(prompt, targetModel).not.toContain('without contradicting the category');
      // The clause that says a category disagreement is not ranked travels with the tripwire it
      // defers to — present together, absent together, never one without the other.
      expect(prompt.includes('never a conflict to rank'), targetModel).toBe(prompt.includes(TRIPWIRE));
    }
  });
});

describe('generatePrompt — section 0’s exclusion precedence', () => {
  /**
   * The prompt with its wrapping removed, so an assertion can quote a whole sentence rather than
   * the fragment that happens to fall between two of the template's line breaks — which would make
   * a rewrap look like a deleted rule.
   */
  function unwrapped(prompt: string): string {
    return prompt.replaceAll('\n', ' ');
  }

  const OUTRANKS =
    'An exclusion in section 8 outranks every attribute that asks for the same visible element.';
  const NO_COMPROMISE = 'never satisfy both by drawing a reduced, integrated or decorative version of it';
  const NOT_THE_INVENTORY = 'draw the entry, because the count and inventory rank first';

  it('ranks section 8 above the attributes that name the same element, for every target', () => {
    // Reported from a delivered sheet: section 1 named an integrated worn item that a later
    // exclusion in section 8 prohibited, and with the exclusions outside the precedence order there
    // was nothing to settle the two — leaving the compromise, where the excluded element is drawn in
    // a reduced or integrated form and both instructions are counted as honoured. Unlike the
    // category tripwire above, this needs no channel to report through, so every target gets it: a
    // diffusion model meets the same contradiction and simply cannot tell anyone it did.
    for (const targetModel of TARGET_MODEL_IDS) {
      const prompt = unwrapped(generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel })));

      expect(prompt, targetModel).toContain(OUTRANKS);
      expect(prompt, targetModel).toContain(NO_COMPROMISE);
    }
  });

  it('stops the rule short of the inventory, which outranks it in turn', () => {
    // The half that keeps the ranking coherent. The count and inventory head the same list, and
    // section 4's placement rule makes grid position the only identity map — so a component dropped
    // to honour an exclusion would mis-map every component after it. An exclusion decides what a
    // component shows; it never deletes an entry.
    const prompt = unwrapped(generatePrompt('CHARACTER', SUBJECT, OUTPUT));

    expect(prompt).toContain(NOT_THE_INVENTORY);
  });

  it('carries the rule for a subject that actually states the contradiction', () => {
    // Why it is generic rather than a quirk of one sheet: `worn_details` and `exclusions` are two of
    // the same sixteen free-text fields, so any configuration can request an element and prohibit it.
    // Both lines reach the prompt — nothing compares them — which is what leaves section 0 to settle.
    const subject = { ...SUBJECT, worn_details: 'Brass shoulder pauldron', exclusions: 'No pauldrons' };
    const prompt = unwrapped(generatePrompt('CHARACTER', subject, OUTPUT));

    expect(prompt).toContain('- Integrated Worn Details: Brass shoulder pauldron');
    expect(prompt).toContain('- Subject-specific: No pauldrons');
    expect(prompt).toContain(OUTRANKS);
  });
});

describe('generatePrompt — a render style that withholds the surface', () => {
  /**
   * The two styles that are validation passes rather than finished looks, and the eight that are not.
   *
   * Both lists are derived from `validationPassFor` rather than written out, so a third pass added to
   * that record is checked by every assertion below on the day it is added — which is the half a
   * hand-written pair of lists would quietly stop covering.
   */
  const PASSES = RENDER_STYLES.filter((style) => promptText.validationPassFor(style) !== null);
  const FINISHED = RENDER_STYLES.filter((style) => promptText.validationPassFor(style) === null);

  it('has both kinds of style to compare, so nothing below is vacuous', () => {
    // Every assertion in this suite loops over one of those two lists, and an empty list passes a
    // loop silently — which would leave the whole section green while checking nothing at all. The
    // partition is asserted whole rather than by count, so a style that fell out of both is caught
    // as well as a list that emptied.
    expect(PASSES.length).toBeGreaterThan(0);
    expect(FINISHED.length).toBeGreaterThan(0);
    expect(PASSES.length + FINISHED.length).toBe(RENDER_STYLES.length);
  });

  /**
   * Section 0's clause, quoted whole and with the template's own straight apostrophes.
   *
   * The prompt is line-wrapped, so it is compared against a prompt with its breaks flattened — a
   * rewrap would otherwise read as a deleted rule.
   */
  const OUTRANKS_THE_COLOURS =
    "This sheet's render style is a validation pass, and what it states about the surface " +
    "outranks the subject's colour and material attributes.";

  /** The lines section 2 prints for a style that describes a surface rather than withholding one. */
  const SURFACE_DETAIL = '- Surface-detail intensity: ';
  const BUDGET = '- Palette strategy: ';
  const OUTLINE = '- Edge / outline treatment: ';
  const LIGHTING = '- Lighting model: ';

  function withStyle(renderStyle: (typeof RENDER_STYLES)[number]): string {
    return generatePrompt('CHARACTER', SUBJECT, withOutput({ renderStyle }));
  }

  it('drops the three lines that describe a surface it is not drawing', () => {
    // The defect this whole feature answers, and every one of the three was reachable from a shipped
    // preset. `STRICT_32_COLOR` is a *floor* of sixteen colours, so it contradicted "solid
    // single-colour silhouettes" outright and no tighter setting existed to reach for; the
    // surface-detail line asked for interior blocking on a pass defined by having none; and the
    // outline line promised that "forms separate by value and hue contrast alone" on a sheet holding
    // one value and one hue.
    for (const style of PASSES) {
      const prompt = withStyle(style);

      expect(prompt, style).not.toContain(SURFACE_DETAIL);
      expect(prompt, style).not.toContain(BUDGET);
      expect(prompt, style).not.toContain(OUTLINE);
      // And the block that says the same thing in prose. "Detail serves silhouette and material
      // read" is an instruction about a surface, on a sheet that has none.
      expect(prompt, style).not.toContain('### Surface discipline');
    }
  });

  it('states what it withholds in their place, rather than leaving section 2 silent', () => {
    // Dropping the lines alone would leave the style name to carry the whole meaning, and a
    // generator's prior for "clay render" includes exactly the material read the pass exists to
    // remove. Each pass therefore says outright what is not drawn.
    for (const style of PASSES) {
      const pass = promptText.validationPassFor(style);
      if (pass === null) throw new Error(`${style} should be a validation pass.`);

      expect(withStyle(style), style).toContain(pass.text);
    }
  });

  it('keeps every one of those lines for a style that does describe a surface', () => {
    // The other half, and the failure a gate written one level too high would produce: eight styles
    // whose settings still have to reach the prompt exactly as they always did.
    for (const style of FINISHED) {
      const prompt = withStyle(style);

      expect(prompt, style).toContain(SURFACE_DETAIL);
      expect(prompt, style).toContain(BUDGET);
      expect(prompt, style).toContain(OUTLINE);
      expect(prompt, style).toContain(LIGHTING);
      expect(prompt, style).not.toContain('This render style is a validation pass');
    }
  });

  it('takes the light only from the pass that has nowhere to put it', () => {
    // The narrower of the two axes. A clay render is *read* by the way light falls across it, so
    // taking the key light away would leave the volumes this pass is run to judge invisible — while
    // every lighting option describes light on a surface, and a flat fill of one colour has none.
    for (const style of PASSES) {
      const pass = promptText.validationPassFor(style);
      if (pass === null) throw new Error(`${style} should be a validation pass.`);

      const prompt = withStyle(style);
      if (pass.withholdsLight) expect(prompt, style).not.toContain(LIGHTING);
      else expect(prompt, style).toContain(LIGHTING);
    }
    // Pinned rather than left to the derivation above, because "no pass states the light" would
    // satisfy the loop while losing the distinction it is written to hold.
    expect(withStyle('CLAY_RENDER')).toContain(LIGHTING);
    expect(withStyle('SILHOUETTE_ONLY')).not.toContain(LIGHTING);
  });

  it('outranks the subject’s colours in section 0, where the order is stated', () => {
    // The half the dropped lines cannot reach. Section 0 ranks subject identity *above* the render
    // style, so a clay pass compiled beside `Deep Obsidian & Gold`, `Molten Copper` and
    // `Etched Obsidian Plate` told the model in as many words that the finish outranked the
    // untextured study it was being stripped out for — inverting what the pass is for.
    const subject = {
      ...SUBJECT,
      primary_colours: 'Deep Obsidian & Gold',
      materials: 'Etched Obsidian Plate',
    };

    for (const style of PASSES) {
      const prompt = generatePrompt('CHARACTER', subject, withOutput({ renderStyle: style })).replaceAll(
        '\n',
        ' ',
      );

      expect(prompt, style).toContain('Deep Obsidian & Gold');
      expect(prompt, style).toContain(OUTRANKS_THE_COLOURS);
    }

    for (const style of FINISHED) {
      const prompt = generatePrompt('CHARACTER', subject, withOutput({ renderStyle: style }));
      expect(prompt, style).not.toContain('is a validation pass, and what it states');
    }
  });

  it('lets a pinned palette stand, because the two supersessions stack rather than collide', () => {
    // A pinned palette says which colours exist; a pass says how much of a surface is drawn. One
    // material or one fill takes its colour from the list like anything else does, so the palette
    // block survives — while the budget line, which both of them supersede, is gone either way.
    for (const style of PASSES) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ renderStyle: style, palette: 'NES' }));

      expect(prompt, style).toContain('### Palette — ');
      expect(prompt, style).not.toContain(BUDGET);
    }
  });

  it('leaves the prompt free of ragged blank lines and unresolved markers', () => {
    // Four conditionals were added across two sections, and a block whose blank line lands outside
    // it is how a prompt grows a gap nobody wrote. Same check the series suite applies for the same
    // reason.
    for (const style of RENDER_STYLES) {
      const prompt = withStyle(style);

      expect(prompt, style).not.toMatch(/\n{3}/);
      expect(prompt, style).not.toMatch(/\[(?:IF|SEC|SECTION|OPTIONAL|DEFINE):/);
    }
  });
});

describe('generatePrompt — the adherence report', () => {
  /** Every capability the report needs, so only the flag under test is deciding anything. */
  const CAPABLE = { emitPromptFeedback: true, targetModel: 'CHATGPT_5_6_SOL' } as const;

  it('is absent until it is asked for', () => {
    expect(generatePrompt('CHARACTER', SUBJECT, OUTPUT)).not.toContain('ADHERENCE REPORT');
  });

  it('asks the target to audit what it delivered and write back about the prompt', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput(CAPABLE));

    expect(prompt).toContain('ADHERENCE REPORT');
    // The two halves the feature is: audit the pixels, then critique the wording that produced
    // them. A section carrying only the first is the self-audit section 9 already has.
    expect(prompt).toContain('write the report from the delivered pixels');
    expect(prompt).toContain('its wording\nis what needs to change');
    expect(prompt).toContain('three backticks, then the');
  });

  it('tells the target its feedback changes a whole tool rather than this one sheet', () => {
    // The instruction the issue behind this feature turns on: without it a model writes "redraw the
    // rear torso", which is useless to someone editing a template that composes every prompt.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput(CAPABLE));

    expect(prompt).toContain('one rendering of a template shared by all of them');
    expect(prompt).toContain('Write nothing specific to this subject');
  });

  it('cites section 9 rather than restating its checks', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput(CAPABLE));

    expect(prompt).toContain("work section 9's checks");
    // Section 9's own numbered list appears exactly once. A second copy of it inside the report is
    // the diluting third statement of the same rules that `modelWrapperText.ts` warns against.
    expect(prompt.match(/Component count is exactly/g)).toHaveLength(1);
  });

  it('never emits the report onto a prompt whose section 9 has no checks to cite', () => {
    // The implication the report's wording depends on: it says "work section 9's checks", and
    // section 9 is a bare `## 9. LAYOUT` heading on a target that does not deliberate. Asserted
    // across the whole target list against the *compiled prompt*, because that is where the two
    // gates actually meet — `EMIT_PROMPT_FEEDBACK` and `DELIBERATES` are computed separately in the
    // compiler, and loosening either one is what would ship a citation of a section that is not
    // there. Gating the report on `returnsText` alone, for instance, breaks this on Seedream.
    for (const target of TARGET_MODEL_IDS) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ ...CAPABLE, targetModel: target }));
      if (!prompt.includes('ADHERENCE REPORT')) continue;

      expect(prompt, target).toContain('## 9. LAYOUT AND SELF-AUDIT');
      expect(prompt, target).toContain('Before delivering, verify:');
    }
  });

  it('is withheld from a target that cannot both re-read and answer back', () => {
    // Seedream plans its layout before rendering, so it could audit the sheet — and returns nothing
    // but an image, so it has nowhere to put the answer. Being half-capable is not capable.
    const seedream = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ emitPromptFeedback: true, targetModel: 'SEEDREAM' }),
    );
    expect(seedream).not.toContain('ADHERENCE REPORT');

    const midjourney = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ emitPromptFeedback: true, targetModel: 'MIDJOURNEY' }),
    );
    expect(midjourney).not.toContain('ADHERENCE REPORT');
  });

  it('numbers itself by what precedes it, so the sections never skip a number', () => {
    // A "## 11." with no 10 above it reads as an authoring error — and the report's own text cites
    // sections back, so a reader who cannot trust the numbering cannot follow the citation either.
    const withoutManifest = generatePrompt('CHARACTER', SUBJECT, withOutput(CAPABLE));
    expect(withoutManifest).toContain('## 10. ADHERENCE REPORT');
    expect(withoutManifest).not.toContain('## 11.');

    const withManifest = generatePrompt('CHARACTER', SUBJECT, withOutput({ ...CAPABLE, emitManifest: true }));
    expect(withManifest).toContain('## 10. COMPANION MANIFEST');
    expect(withManifest).toContain('## 11. ADHERENCE REPORT');
  });

  it('names the second deliverable in the closing line rather than ending on the image alone', () => {
    // Last-position attention is strong, and "Generate the sheet now." as the final word is what a
    // model acts on. The report is the one addition that happens *after* that instruction.
    expect(generatePrompt('CHARACTER', SUBJECT, OUTPUT).trimEnd()).toMatch(/Generate the sheet now\.$/);
    expect(generatePrompt('CHARACTER', SUBJECT, withOutput(CAPABLE)).trimEnd()).toMatch(
      /never in place of it\.$/,
    );
  });
});

describe('generatePrompt — the facing the sheet is for', () => {
  it('carries the pinned facing into the assembly direction and the depth order', () => {
    // `sheetDirections.test.ts` covers the resolution itself; this is the seam — that the resolved
    // facing reaches *both* places the prompt states it. Depth order is a property of facing, so a
    // pinned run that moved one and not the other would render its near-side pieces behind the body.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({
        directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
        rigMode: 'CUTOUT_RIG',
        directions: 'EIGHT_COMPASS',
        primaryDirection: 'north-west',
      }),
    );

    expect(prompt).toContain('- Primary assembly direction: north-west');
    expect(prompt).toContain('- Directions required: North-west');
    expect(prompt).toContain(promptText.DEPTH_ORDER_TEXT['north-west']);
  });
});

/**
 * A sheet out of a batch used to describe itself as the whole deliverable. Section 0 opened with a
 * component count and ranked it above everything else, section 4 said not to omit an entry, and
 * section 6 stated an assembly capability the *series* reaches — so sheet three of eight arrived
 * claiming a count and a capability belonging to something else, with nothing anywhere saying it was
 * one of eight. The only cross-sheet sentence in the template was the identity lock's, and that is
 * conditional on the user having filled a field in.
 */
describe('generatePrompt — a sheet that is one of a series', () => {
  /** An eight-facing cut-out rig: one inventory, eight sheets, split along the facing axis. */
  const RIG = withOutput({
    directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
    rigMode: 'CUTOUT_RIG',
    directions: 'EIGHT_COMPASS',
  });

  /** The other axis: a character's five-view core and its limbs, two sheets on one facing. */
  const SERIES = withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' });

  /** One whole deliverable in one generation, which is the case that must not change at all. */
  const ALONE = withOutput({
    directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
    directions: 'SINGLE_FRONT',
  });

  it('says which sheet it is, and of how many, where the count is stated', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, { ...RIG, primaryDirection: 'west' });
    const contract = prompt.slice(
      prompt.indexOf('## 0. NON-NEGOTIABLE OUTPUT CONTRACT'),
      prompt.indexOf('## 1. SUBJECT DEFINITION'),
    );

    // In section 0 rather than further down, because that is where the count it qualifies is: the
    // precedence order ranks the count and inventory first, so a reader told the number is the
    // deliverable's works the ranking against the batch.
    expect(contract).toMatch(
      /\*\*This is sheet 3 of 8 of one deliverable, and the count\s+above is this sheet's own\.\*\*/,
    );
    expect(contract).toContain('never add a component because the set looks incomplete');
  });

  it('lists what every other sheet carries, and marks which one this is', () => {
    // The failure this guards against is a run quietly adding the pieces it can see are missing. A
    // sheet that can read the others' inventories has no gap to fill.
    const prompt = generatePrompt('CHARACTER', SUBJECT, { ...SERIES, sheetIndex: 1 });

    expect(prompt).toContain('### The sheets in this series');
    expect(prompt).toContain(
      '- **Sheet 1 — Directional core**: 15 components, covering front, front-three-quarter, right side, back-three-quarter, back.',
    );
    expect(prompt).toContain(
      '- **Sheet 2 — Articulation** *(this sheet)*: 34 components, drawn towards front.',
    );
  });

  it('hands the assembly capability to the series rather than to this sheet', () => {
    // Section 6 states what the component set assembles into, and for a per-facing rig run that is
    // the whole rig's capability delivered by a sheet holding an eighth of it.
    const prompt = generatePrompt('CHARACTER', SUBJECT, RIG);

    expect(prompt).toContain("**That is the finished series' capability, and not this sheet's alone.**");
    expect(prompt).toMatch(/It is reached once every\s+sheet listed below has been generated/);
  });

  it('extends identity consistency across the series, and cites the lock when there is one', () => {
    const locked = generatePrompt('CHARACTER', SUBJECT, { ...RIG, identityLock: 'Cyan visor' });
    const unlocked = generatePrompt('CHARACTER', SUBJECT, RIG);

    for (const prompt of [locked, unlocked]) {
      expect(prompt).toContain('**That list holds across the whole series, not only across this sheet.**');
    }
    // The citation goes only where section 1 actually has the block to cite — the lock is optional,
    // and pointing at an absent one is the dangling cross-reference this gate exists to avoid.
    expect(locked).toContain('The identity lock in section 1 is the record of what the other sheets');
    expect(unlocked).not.toContain('The identity lock in section 1');
  });

  it('says nothing at all when the configuration is a single sheet', () => {
    // The whole point of gating it: a configuration that is one generation has no series to describe,
    // and a "sheet 1 of 1" would be words spent telling the reader nothing.
    const prompt = generatePrompt('CHARACTER', SUBJECT, ALONE);

    expect(prompt).not.toContain('of one deliverable');
    expect(prompt).not.toContain('The sheets in this series');
    expect(prompt).not.toContain('the whole series');
    expect(prompt).not.toContain('*(this sheet)*');
    // And section 6 keeps the plain claim it has always made.
    expect(prompt).toContain('The component set must assemble cleanly into: ');
  });

  it('counts the facing axis in the order the direction set lists it', () => {
    for (const [index, facing] of promptText.DIRECTION_LISTS.EIGHT_COMPASS.entries()) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, { ...RIG, primaryDirection: facing });
      expect(prompt, facing).toContain(`**This is sheet ${String(index + 1)} of 8 of one deliverable`);
    }
  });

  it('leaves the prompt free of ragged blank lines and unresolved markers', () => {
    // The block is four conditionals in three sections, and a stray blank line at any of their
    // seams is what makes a generated prompt look broken.
    for (const output of [RIG, SERIES, { ...SERIES, sheetIndex: 1 }, ALONE]) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, output);
      expect(prompt).not.toMatch(/\n\n\n/);
      expect(prompt).not.toMatch(/\[(?:DEFINE|OPTIONAL|IF):|\[\/IF\]|\[N\]/);
    }
  });
});

describe('generatePrompt — camera azimuth versus object yaw', () => {
  /**
   * The defect: a sheet asking for a front-three-quarter, a right-side and a back-three-quarter head
   * came back with three heads at effectively the same angle. Section 3 said "one camera … azimuth …
   * identical across all of them", which reads as *every component faces the same way*, and a
   * generator resolving that against its own preference for three-quarter views resolves it wrongly.
   */
  const CORE = withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'FIVE_CLASSIC' });

  it('fixes the camera and turns the component, and says which is which', () => {
    const prompt = generatePrompt('CREATURE', SUBJECT, CORE);

    // Matched across the template's own line wrapping, so re-flowing a paragraph does not fail a
    // test about what the paragraph says.
    expect(prompt).toMatch(/\*\*Camera azimuth is fixed; object yaw\s+is what varies\.\*\*/);
    expect(prompt).toContain('**A direction is never produced by moving the camera.**');
    // The old wording, which is what a generator was reading as "keep every component facing the
    // same way". It must not survive anywhere in the prompt.
    expect(prompt).not.toMatch(/A component drawn at a different\s+angle from its neighbours is a defect/);
  });

  it('states each required facing as an object yaw with its own occlusions', () => {
    const prompt = generatePrompt('CREATURE', SUBJECT, CORE);

    expect(prompt).toContain('**Front-three-quarter — object yaw 45°.**');
    expect(prompt).toContain('**Right side — object yaw 90°.**');
    expect(prompt).toContain('**Back-three-quarter — object yaw 135°.**');
  });

  it('names the front and rear landmarks of the category being drawn', () => {
    // Rotation can only be checked against something that points forward, and "front" is a different
    // landmark for a creature, a building and a pistol.
    expect(generatePrompt('CREATURE', SUBJECT, CORE)).toContain('the jaws, beak, muzzle or mandibles');
    expect(generatePrompt('BUILDING', SUBJECT, CORE)).toContain('the entrance façade');
    expect(generatePrompt('ITEM', SUBJECT, CORE)).toContain('the blade, the muzzle, the face of the dial');
  });

  it('forbids the substitutions that pass for a rotation', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, CORE);

    expect(prompt).toContain('**A mirrored copy is not a rotation.**');
    expect(prompt).toContain("**Rotation never swaps the subject's own left and right.**");
    expect(prompt).toContain('a "side" view that is the three-quarter view with');
    expect(prompt).toContain('### Directional audit');
  });

  it('names the reflection pair a cardinal sheet holds, in section 3 and in the audit', () => {
    // The counterfeit the yaw fix cannot catch: a `west` view flipped is a counterfeit `east`,
    // facing exactly where the audit's other checks require — the reported failure being side
    // views that came back as mirror images, with the subject's one-sided features on both sides.
    // Only a sheet holding both members of such a pair can be cheated this way, so the rule names
    // the pair it carries.
    const cardinals = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'FOUR_CARDINAL' }),
    );

    expect(cardinals).toContain(
      "**This sheet pairs views that are each other's reflection** — west and east —",
    );
    expect(cardinals).toContain('- Neither member of a pair — west and east — is the other reflected');
  });

  it('names both diagonal pairs on the diagonal half of the eight-compass core', () => {
    const diagonals = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({
        directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
        directions: 'EIGHT_COMPASS',
        sheetIndex: 1,
      }),
    );

    expect(diagonals).toContain('— south-west and south-east; north-west and north-east —');
  });

  it('keeps the pair rules off the classic sets, which hold no reflection pair', () => {
    // FIVE_CLASSIC runs 0° to 180° with every view right-leading, so there is no view on the sheet
    // a reflection could counterfeit — the rule would be instruction about views the sheet does
    // not hold, which is the same reasoning that gates MULTI_DIRECTION.
    const prompt = generatePrompt('CHARACTER', SUBJECT, CORE);

    expect(prompt).not.toContain('Neither member of a pair');
    expect(prompt).not.toContain("each other's reflection");
  });

  it('stops the primary assembly direction overriding a stated one', () => {
    // "Primary assembly direction: front-three-quarter" is the instruction that biased every
    // component back towards the one view the model already preferred.
    expect(generatePrompt('CHARACTER', SUBJECT, CORE)).toMatch(
      /\*\*Wherever section 4\s+names a direction for a component, that direction wins outright\*\*/,
    );
  });

  it('drops the comparison rules from a sheet that carries one facing', () => {
    // Forty lines about views disagreeing, on a sheet with a single view, is instruction the
    // generator cannot act on — it has nothing to compare. The yaw itself still gets stated.
    const rig = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION', directions: 'FOUR_CARDINAL' }),
    );

    expect(rig).toContain('**South — object yaw 0°.**');
    expect(rig).toContain('never this sheet mirrored');
    expect(rig).not.toContain('### Directional audit');
    expect(rig).not.toContain('### Rotation, not redesign');
  });

  it('makes the inventory demand one geometry rather than several designs', () => {
    expect(generatePrompt('CREATURE', SUBJECT, CORE)).toMatch(
      /the same piece of\s+geometry drawn at each object yaw section 3 lists/,
    );
  });

  it('orders the rules so aesthetics cannot outrank a stated direction', () => {
    expect(generatePrompt('CHARACTER', SUBJECT, CORE)).toContain('Nothing later overrides anything earlier');
  });

  it('states the requirement in section 0 as well, where attention is strongest', () => {
    // Section 0 is the contract and section 9 audits it, but *that the turns happen at all* was
    // stated in neither — it lived only in section 3, halfway down a prompt of some 3,600 tokens.
    // This is the hoist, not a third copy: section 3 still owns how far each turn goes.
    const prompt = generatePrompt('CHARACTER', SUBJECT, CORE);
    const contract = prompt.slice(
      prompt.indexOf('## 0. NON-NEGOTIABLE OUTPUT CONTRACT'),
      prompt.indexOf('## 1. SUBJECT DEFINITION'),
    );

    expect(contract).toMatch(
      /\*\*A component the inventory lists in more than one direction is one\s+component/,
    );
    expect(contract).toContain('never one view repeated, never a mirrored copy');
  });

  it('leaves that clause out of a single-facing sheet, which has no turns to contract for', () => {
    const rig = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION', directions: 'FOUR_CARDINAL' }),
    );
    expect(rig).not.toContain('A component the inventory lists in more than one direction');
  });
});

describe('generatePrompt — technical settings in prose', () => {
  it('states the resolution profile and surface detail as prose, not as identifiers', () => {
    // v1 interpolated the enum raw, so the prompt read "Selected profile: HIGH_RESOLUTION_PIXEL_ART".
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ resolutionProfile: 'HIGH_RESOLUTION' }));
    expect(prompt).toContain('- Resolution profile: High resolution');
    expect(prompt).not.toContain('HIGH_RESOLUTION');
  });

  it('scales the pixel-discipline minimum to the component size a custom profile states', () => {
    // The two statements of scale in section 2 have to agree, and `CUSTOM` is the one profile whose
    // scale lives in the target-size field rather than in the profile itself. A 16 × 16 icon whose
    // smallest permitted feature was 2 × 2 asked for a sprite drawn in sixteenths of itself, and the
    // generator resolved that by discarding one half of the instruction.
    const icon = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({
        renderStyle: 'RETRO_PIXEL_ART',
        resolutionProfile: 'CUSTOM',
        spriteTargetSize: '16 × 16 px',
      }),
    );
    expect(icon).toContain('- Target component size: 16 × 16 px');
    expect(icon).toContain('No feature smaller than 1 × 1 native pixels.');

    const large = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({
        renderStyle: 'RETRO_PIXEL_ART',
        resolutionProfile: 'CUSTOM',
        spriteTargetSize: '512 × 512 px',
      }),
    );
    expect(large).toContain('No feature smaller than 3 × 3 native pixels.');
  });

  it('adds the sprite-scale bullets only where the target is sprite-sized and the style is pixel', () => {
    const spriteScale = withOutput({
      renderStyle: 'RETRO_PIXEL_ART',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '16 × 16 px',
    });

    // At sprite scale the pixel-discipline section grows the silhouette-first rules, beside the
    // target-size line the bullets refer back to.
    const icon = generatePrompt('CHARACTER', SUBJECT, spriteScale);
    expect(icon).toContain('- Target component size: 16 × 16 px');
    expect(icon).toContain('every component is designed silhouette-first');

    // A larger target keeps the generic discipline alone — no bullet, and no blank line where the
    // optional was, which is what the OPTIONAL marker exists to guarantee.
    const large = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ ...spriteScale, spriteTargetSize: '128 × 128 px' }),
    );
    expect(large).not.toContain('silhouette-first');

    // A painted sheet drops the whole pixel-discipline block, sprite-sized target or not — these
    // are pixel rules, and a painted 16 px icon is a different discipline this section does not
    // claim to state.
    const painted = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ ...spriteScale, renderStyle: 'PAINTED_2D' }),
    );
    expect(painted).not.toContain('silhouette-first');
    expect(painted).not.toContain('Pixel discipline');
  });

  it('names one projection and one elevation', () => {
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ projection: 'TRUE_ISOMETRIC', cameraElevation: 30 }),
    );
    expect(prompt).toContain('- Projection: 2:1 diamond isometric');
    expect(prompt).toContain('- Camera elevation: 30° above the horizon');
    // The v1 camera named three mutually exclusive projections in one sentence.
    expect(prompt).not.toContain('dimetric/isometric');
  });

  it('narrows a single-direction sheet to one facing, whatever set is chosen', () => {
    // The set is the *run list* for a rig — one sheet per direction. Emitting all eight against a
    // fifteen-component contract would ask for 120 pieces and 15 in the same prompt.
    const rig = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION', directions: 'EIGHT_COMPASS' }),
    );
    expect(rig).toContain('- Directions required: South\n');
    expect(rig).toContain('- Primary assembly direction: south');
    // Every other facing is named exactly once, on section 6's list of the sheets that carry them —
    // which is a statement about the batch rather than an instruction to draw them here. Everywhere
    // else in the prompt this sheet is a single facing, so the list's own lines are the only thing
    // dropped from the assertion rather than the whole check being narrowed to one section.
    const outsideTheSeriesList = rig
      .split('\n')
      .filter((line) => !line.startsWith('- **Sheet '))
      .join('\n');
    expect(outsideTheSeriesList).not.toContain('south-west');

    // And it follows the chosen set's *first* facing, so eight runs cover eight sheets.
    const cardinal = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY', directions: 'FOUR_CARDINAL' }),
    );
    expect(cardinal).toContain('- Primary assembly direction: south');
  });

  it('steers the core directional mode by the chosen set, in section 3 and section 4 alike', () => {
    // The control the core used to discard. Its inventory is built from the same tuple section 3
    // lists, so the two cannot disagree about which views the sheet owes — and a four-cardinal core
    // asks for exactly those four, not the five the old fixed set pinned.
    const cardinal = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'FOUR_CARDINAL' }),
    );
    expect(cardinal).toContain('- Directions required: South, west, north, east');
    expect(cardinal).toContain('- Primary assembly direction: south');
    expect(cardinal).toContain('Heads: south, west, north, east');
    expect(cardinal).not.toContain('front-three-quarter');

    // The five-classic set stays exactly what the old fixed core drew, front leading — 0° and 180°
    // are their own mirror, so this is the smallest set whose drawn views face the camera.
    const classic = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'FIVE_CLASSIC' }),
    );
    expect(classic).toContain(
      '- Directions required: Front, front-three-quarter, right side, back-three-quarter, back',
    );
    expect(classic).toContain('- Primary assembly direction: front');
  });

  it('splits the eight-compass core into a cardinal and a diagonal sheet, each owing only its own views', () => {
    // Eight nearly adjacent yaws on one page are what a generator blurs together, and six pieces at
    // eight views would breach the component ceiling on half the categories — so the eight-compass
    // core is two sheets of four orthogonal views, and each prompt asks for its own half alone.
    const eightWay = withOutput({
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      directions: 'EIGHT_COMPASS',
    });
    const cardinals = generatePrompt('CHARACTER', SUBJECT, { ...eightWay, sheetIndex: 0 });
    expect(cardinals).toContain('- Directions required: South, west, north, east');
    expect(cardinals).toContain('Heads: south, west, north, east');
    expect(cardinals).toContain('### Component inventory: Directional core — cardinal facings — 12 in total');
    // The diagonals appear only in section 6's series list, as another sheet's job — never as a
    // view this sheet's own inventory asks for.
    expect(cardinals).not.toContain('Heads: south, south-west');

    const diagonals = generatePrompt('CHARACTER', SUBJECT, { ...eightWay, sheetIndex: 1 });
    expect(diagonals).toContain('- Directions required: South-west, north-west, north-east, south-east');
    expect(diagonals).toContain('Heads: south-west, north-west, north-east, south-east');
    expect(diagonals).toContain('### Component inventory: Directional core — diagonal facings — 12 in total');

    // And the articulation run behind them is steered to its facing.
    const limbs = generatePrompt('CHARACTER', SUBJECT, {
      ...eightWay,
      sheetIndex: 2,
      primaryDirection: 'north-east',
    });
    expect(limbs).toContain('- Directions required: North-east');
    expect(limbs).toContain('- Primary assembly direction: north-east');
    expect(limbs).toContain('Exactly 34 components');
  });

  it('puts the background key in the contract and in the self-audit', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ backgroundKey: 'MAGENTA_FF00FF' }));
    expect(prompt).toContain('Background is uniform flat magenta #FF00FF, filling all space');
    expect(prompt).toContain('Background is uniform flat magenta #FF00FF with no shadow');
  });
});

describe('generatePrompt — the machine and its palette', () => {
  it('says nothing about either when neither is set', () => {
    // Both are opt-in, and the default studio must not carry a hardware contract nobody asked for.
    const prompt = generatePrompt('CHARACTER', SUBJECT, OUTPUT);

    expect(prompt).not.toContain('### Target hardware');
    expect(prompt).not.toContain('### Palette —');
    // The colour budget is the line a pinned palette supersedes, so it has to be here when none is.
    expect(prompt).toContain('- Palette strategy: ');
  });

  it('states the machine’s geometry and names it, without a word about colour', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ hardwareProfile: 'GAME_BOY' }));
    const profile = HARDWARE_PROFILES.GAME_BOY;
    if (profile === null) throw new Error('the Game Boy profile should ship.');

    expect(prompt).toContain(`### Target hardware — ${profile.name}`);
    for (const constraint of profile.constraints) expect(prompt).toContain(`- ${constraint}`);
    // The identifier never reaches the prompt — the machine's name does.
    expect(prompt).not.toContain('GAME_BOY');
  });

  it('lists every entry of a fixed palette, and drops the budget line it supersedes', () => {
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ palette: 'GAME_BOY_DMG', paletteLimit: 'RESTRAINED_64_COLOR' }),
    );
    const palette = PALETTES.GAME_BOY_DMG;
    if (palette === null || palette.space.kind !== 'FIXED') throw new Error('DMG should be a fixed palette.');

    expect(prompt).toContain(`### Palette — ${palette.name}`);
    for (const entry of palette.space.entries) expect(prompt).toContain(entry);
    // The rule the whole feature turns on: a budget cannot say "four shades of green", so where a
    // palette does, the budget is not stated at all rather than stated alongside and contradicting.
    expect(prompt).not.toContain('- Palette strategy: ');
    expect(prompt).not.toContain(promptText.PALETTE_TEXT.RESTRAINED_64_COLOR);
  });

  it('calls an approximated palette’s entries an approximation, without loosening the rule', () => {
    // The DMG holds a two-bit shade index and shows it through a green LCD, so naming four hexes
    // "the colours of the original Game Boy" tells a generator something untrue about the hardware —
    // and invites it to improve on them from knowledge the hardware cannot supply.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'GAME_BOY_DMG' }));

    expect(prompt).not.toContain('one of the 4 colours of the original Game Boy (DMG)');
    expect(prompt).toContain('exactly one of the 4 colours, listed below');
    expect(prompt).toContain('are an sRGB approximation of');
    expect(prompt).toContain('not colour values the original Game Boy (DMG) holds');
    // The ambient-light point is the reason no four hexes can be the authoritative set, so the
    // prompt carries it rather than leaving the hedge unexplained.
    expect(prompt).toContain('shifts with the ambient light');
    // The caveat is about provenance and may not become an excuse to drift off the four.
    expect(prompt).toContain('No other colour appears on any component');
    expect(prompt).toContain('on this sheet they are the colours');
  });

  it('lets the three palettes that own their values keep the plain claim', () => {
    // PICO-8 is software and its sixteen are a literal in its source: hedging them would be its own
    // kind of wrong, and the caveat has to be absent rather than harmlessly present everywhere.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'PICO_8' }));

    expect(prompt).toContain('exactly one of the 16 colours of PICO-8, listed below');
    expect(prompt).not.toContain('sRGB approximation');
  });

  it.each([
    'GAME_BOY_DMG',
    'GAME_BOY_MONO',
    'NES',
    'ATARI_2600_NTSC',
    'COMMODORE_64',
    'ZX_SPECTRUM',
  ] as const)('never claims %s’s entries are the machine’s own colours', (id) => {
    // Every palette on the approximate side of the split, so the wording cannot be fixed for the
    // Game Boy alone and left overclaiming for the five machines with the same problem.
    const palette = PALETTES[id];
    if (palette === null) throw new Error(`${id} should ship.`);
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: id }));

    expect(prompt).not.toContain(`colours of ${palette.name}, listed below`);
    expect(prompt).toContain('are an sRGB approximation of');
    expect(prompt).toContain(`not colour values ${palette.name} holds`);
  });

  it('states the Game Boy Color as a colour space, never as four greens', () => {
    // The two machines are one hardware profile apart and are routinely conflated. The DMG's list
    // must not reach the Color, and the Color's own block has to describe the 15-bit space.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'GAME_BOY_COLOR' }));

    expect(prompt).toContain('32768 colours in all');
    expect(prompt).toContain('No more than 56 distinct colours appear across the whole sheet.');
    expect(prompt).toContain('No single component carries more than 3 of them');
    for (const entry of ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F']) expect(prompt).not.toContain(entry);
  });

  it('states the ladder rather than a list for a palette that is a colour space', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'MEGA_DRIVE' }));

    expect(prompt).toContain('0, 36, 73, 109, 146, 182, 219, 255');
    expect(prompt).toContain('512 colours in all');
    expect(prompt).toContain('No more than 61 distinct colours appear across the whole sheet.');
  });

  it('excepts the background field from the palette, in the contract and in the block', () => {
    // Without this the two halves of the prompt contradict each other outright: section 0 fixes the
    // field at magenta, and no palette in the library contains it.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'GAME_BOY_DMG' }));

    expect(prompt).toContain('The background field is the exception and stays the key colour');
    expect(prompt).toContain('it stays the key colour section 0 fixes, and is not drawn from this palette');
  });

  it('adds the colour clause to the contract and the audit, only where a palette is pinned', () => {
    const withPalette = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'NES' }));
    const without = generatePrompt('CHARACTER', SUBJECT, OUTPUT);

    expect(withPalette).toContain('comes from the palette section 2 fixes');
    expect(withPalette).toContain('is one the palette in section 2 permits');
    expect(without).not.toContain('palette section 2 fixes');
    expect(without).not.toContain('palette in section 2 permits');
  });

  it('states a sheet-wide colour limit only where it is tighter than the palette itself', () => {
    // The Game Boy's four colours are the sheet's four colours, so a "no more than 4 across the
    // whole sheet" line would restate the sentence above it — two constraints that happen to agree,
    // one of them buying nothing. The NES's 25-of-55 is a real second limit and survives.
    const gameBoy = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'GAME_BOY_DMG' }));
    const nes = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'NES' }));

    expect(gameBoy).not.toContain('distinct colours appear across the whole sheet');
    expect(nes).toContain('No more than 25 distinct colours appear across the whole sheet.');
  });

  it('asks the audit about a per-component limit only where section 2 gave one', () => {
    // Seven of the nineteen palettes state no per-component cap, and an audit telling the reader to
    // compare against an allowance that was never printed is a check that cannot be worked.
    const gameBoy = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'GAME_BOY_DMG' }));
    const spectrum = generatePrompt('CHARACTER', SUBJECT, withOutput({ palette: 'ZX_SPECTRUM' }));

    expect(gameBoy).toContain('No component carries more colours at once than section 2 allows one.');
    expect(gameBoy).toContain('No single component carries more than 3 of them');
    // The Spectrum's constraint is the attribute cell, which its note carries; it has no per-object
    // number, so neither the section-2 line nor the audit that cites it may appear.
    expect(spectrum).not.toContain('No component carries more colours at once');
    expect(spectrum).not.toContain('No single component carries more than');
  });

  it.each(HARDWARE_PROFILE_IDS)('compiles a whole sheet for %s with no marker left behind', (id) => {
    // Every machine through the compiler, since each one pins a different palette and the two kinds
    // of palette take different paths through `describePalette`.
    const profile = HARDWARE_PROFILES[id];
    const output = withOutput(
      profile === null ? { hardwareProfile: id } : { hardwareProfile: id, ...profile.settings },
    );
    const prompt = generatePrompt('CHARACTER', SUBJECT, output);

    expect(prompt).not.toMatch(/\[(?:DEFINE|OPTIONAL|IF):|\[\/IF\]|\[N\]/);
    expect(prompt).toContain('Generate the sheet now.');
  });
});

describe('every category', () => {
  it.each(SUBJECT_CATEGORIES)('compiles a default %s subject', (category) => {
    // Every category shares the same sixteen keys but not their pools, so each exercises a different
    // set of values through the same optional lines.
    const prompt = generatePrompt(category, defaultSubjectFor(category), OUTPUT);
    expect(prompt).toContain(`# MODULAR SPRITE-SHEET SPECIFICATION — ${category}`);
    expect(prompt).not.toMatch(/\[(?:DEFINE|OPTIONAL|IF):|\[\/IF\]|\[N\]/);
  });
});

describe('countWords and estimateTokens', () => {
  it('counts the words in a compiled prompt', () => {
    expect(countWords('one two  three\nfour')).toBe(4);
    expect(countWords('   ')).toBe(0);
    expect(countWords(generatePrompt('CHARACTER', SUBJECT, OUTPUT))).toBeGreaterThan(100);
  });

  it('estimates tokens at roughly four characters each', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('')).toBe(0);
  });
});

/**
 * The self-audit is instruction addressed to a reader that can act on it — check the sheet against
 * the specification and redraw before delivering. A single-pass diffusion endpoint has no such step,
 * so on those targets the block is the most rule-list-shaped section in the template sitting where
 * attention is weakest. It is dropped for them and kept for the two that can run it.
 */
describe('generatePrompt — the self-audit, per target', () => {
  const AUDIT_MARKERS = [
    'Before delivering, verify:',
    'Component count is exactly',
    'One camera, one scale and one light direction',
  ];

  it('keeps the audit for the targets that work through the prompt', () => {
    // SEEDREAM is here because it is the case that breaks the shorthand: an *image* endpoint that
    // still reasons over the brief, so "image model" never decides whether the audit is sent.
    for (const target of [
      'GENERIC',
      'CHATGPT_5_6_SOL',
      'GEMINI_FLASH_IMAGE',
      'GEMINI_PRO_IMAGE',
      'SEEDREAM',
    ] as const) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: target }));
      expect(prompt, target).toContain('## 9. LAYOUT AND SELF-AUDIT');
      for (const marker of AUDIT_MARKERS) expect(prompt, `${target}: ${marker}`).toContain(marker);
    }
  });

  it('drops the audit for every single-pass image endpoint', () => {
    for (const target of [
      'QWEN_IMAGE',
      'MIDJOURNEY',
      'STABLE_DIFFUSION',
      'FLUX',
      'FLUX_API',
      'GPT_IMAGE',
    ] as const) {
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: target }));
      for (const marker of AUDIT_MARKERS) {
        expect(prompt, `${target} should not carry "${marker}"`).not.toContain(marker);
      }
    }
  });

  it('still lays the sheet out, and titles section 9 for what it actually contains', () => {
    // Dropping the audit must not take the layout instruction with it — that describes the image
    // rather than a step, so every target needs it.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GPT_IMAGE' }));
    expect(prompt).toContain('## 9. LAYOUT');
    expect(prompt).not.toContain('## 9. LAYOUT AND SELF-AUDIT');
    expect(prompt).toContain('Arrange components in a clean exploded grid');
    expect(prompt).toContain('Nothing touches, overlaps, or is cropped');
  });

  it('drops the audit’s nested checks with it, not just its opening lines', () => {
    // The rig, pixel-art and directional checks sit *inside* the audit. Each has its own condition,
    // and a satisfied one must not smuggle its lines out of a block that was dropped wholesale.
    const output = withOutput({
      targetModel: 'GPT_IMAGE',
      rigMode: 'CUTOUT_RIG',
      renderStyle: 'PIXEL_ART',
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
    });
    const prompt = generatePrompt('CHARACTER', SUBJECT, output);

    expect(prompt).not.toContain('Every articulated segment is straight and unposed');
    expect(prompt).not.toContain('One pixel grid and density throughout');
    expect(prompt).not.toContain('### Directional audit');
    expect(prompt).not.toContain('the sheet has failed');
  });

  it('keeps those same nested checks for a deliberating target', () => {
    const output = withOutput({
      targetModel: 'CHATGPT_5_6_SOL',
      rigMode: 'CUTOUT_RIG',
      renderStyle: 'PIXEL_ART',
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
    });
    const prompt = generatePrompt('CHARACTER', SUBJECT, output);

    expect(prompt).toContain('Every articulated segment is straight and unposed');
    expect(prompt).toContain('One pixel grid and density throughout');
    expect(prompt).toContain('### Directional audit');
  });

  it('leaves the rest of the specification untouched for a single-pass endpoint', () => {
    // Only the audit goes. The contract, the subject, the inventory and the exclusions are
    // descriptions of the image, and every target needs them.
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GPT_IMAGE' }));
    for (const heading of [
      '## 0. NON-NEGOTIABLE OUTPUT CONTRACT',
      '## 1. SUBJECT DEFINITION',
      '## 4. COMPONENT INVENTORY',
      '## 8. EXCLUSIONS',
    ]) {
      expect(prompt, heading).toContain(heading);
    }
  });

  it('makes the prompt measurably shorter for a single-pass endpoint', () => {
    const singlePass = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GPT_IMAGE' }));
    const generic = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GENERIC' }));
    // Compared on word count rather than characters, so the wrappers' own prefixes cannot mask it.
    expect(countWords(singlePass)).toBeLessThan(countWords(generic));
  });

  it('gives a thinking image model the full specification, not the shortened one', () => {
    // The distinction the research forced: Gemini's image models are image models that *reason* —
    // "thinking models that use a reasoning process for complex prompts", which cannot be disabled
    // — so "is an image generator" and "cannot run a verification pass" are different questions.
    // Getting this backwards would silently withhold the audit from a target that can act on it.
    const gemini = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GEMINI_FLASH_IMAGE' }));
    const generic = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GENERIC' }));

    expect(gemini).toContain('Before delivering, verify:');
    expect(countWords(gemini)).toBe(countWords(generic));
  });
});

describe('the section numbering the prompt cites itself by', () => {
  /** Every `## N.` heading in the order it appears, as the numbers alone. */
  function headingNumbers(prompt: string): number[] {
    return [...prompt.matchAll(/^## (\d+)\. /gm)].map((match) => Number(match[1]));
  }

  it.each(SUBJECT_CATEGORIES)('runs 0, 1, 2, … with no hole on %s, at every rig it offers', (category) => {
    // The reported failure: the rig section is conditional, and five of the nine categories have no
    // rig at all, so every prompt they ever compiled ran `## 4. COMPONENT INVENTORY` straight into
    // `## 6. REQUIRED ASSEMBLY CAPABILITY`. Swept over the rig union rather than the category's own
    // list, because `resolveRigMode` is what a stored value from an older build arrives through.
    for (const rigMode of RIG_MODES) {
      const numbers = headingNumbers(generatePrompt(category, SUBJECT, withOutput({ rigMode })));
      expect(numbers.length, `${category} / ${rigMode}`).toBeGreaterThan(0);
      expect(numbers, `${category} / ${rigMode}`).toEqual(numbers.map((_number, index) => index));
    }
  });

  it.each(TARGET_MODEL_IDS)(
    'runs 0, 1, 2, … with no hole for %s, with both companions asked for',
    (target) => {
      // The other axis that adds and removes sections: the manifest and the adherence report are each
      // gated on what the target can do, so a target that takes one and not the other is where a
      // hand-numbered tail went wrong before — which the template answered by writing the report's
      // heading twice. Asking for both is what puts every combination of the two through this.
      const output = withOutput({ targetModel: target, emitManifest: true, emitPromptFeedback: true });
      for (const rigMode of ['CUTOUT_RIG', 'NONE'] as const) {
        const numbers = headingNumbers(generatePrompt('CHARACTER', SUBJECT, { ...output, rigMode }));
        expect(numbers, `${target} / ${rigMode}`).toEqual(numbers.map((_number, index) => index));
      }
    },
  );

  it('cites a section by the number that section actually landed on', () => {
    // The half that a contiguity check alone would miss: the numbers could renumber correctly while
    // the prose went on citing the old ones. CHARACTER carries a rig section and BUILDING does not,
    // so the exclusions are section 8 on one and 7 on the other — and each prompt's own citation of
    // them has to say so.
    for (const [category, rigMode, exclusions] of [
      ['CHARACTER', 'CUTOUT_RIG', 8],
      ['BUILDING', 'CUTOUT_RIG', 7],
    ] as const) {
      // BUILDING articulates about nothing, so `resolveRigMode` answers `NONE` and its rig section
      // never appears however the configuration is written — which is what moves its exclusions up.
      const output = withOutput({ rigMode });
      const prompt = generatePrompt(category, defaultSubjectFor(category), output);
      expect(prompt, category).toContain(`## ${String(exclusions)}. EXCLUSIONS`);
      expect(prompt, category).toContain(`An exclusion in section ${String(exclusions)} outranks`);
    }
  });
});
