import { describe, expect, it } from 'vitest';
import { NO_ADDITIONAL_ANATOMY } from '../constants/anatomy.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import * as promptText from '../constants/promptText/index.ts';
import { RENDER_STYLES, RIG_MODES, TARGET_MODEL_IDS } from '../types/output.ts';
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
const OUTPUT = DEFAULT_PRESET.output;

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
    expect(prompt).toContain(`- Role / Function: ${SUBJECT.role}`);
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
    expect(none).not.toContain('## 5.');
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
    // Six in the contract — five fixed plus the pixel-grid rule — and seven in the audit, which is
    // the run that used to end at 8 with no 7 above it.
    expect(numberedRuns(prompt).map((run) => run.length)).toStrictEqual([6, 7]);
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

    expect(prompt).toContain('- Integrated worn details: Brass shoulder pauldron');
    expect(prompt).toContain('- Subject-specific: No pauldrons');
    expect(prompt).toContain(OUTRANKS);
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
    // pinned run that moved one and not the other would render its near arm behind the torso.
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
    expect(prompt).toContain('**Rotation never swaps anatomical left and right.**');
    expect(prompt).toContain('a "side" view that is the three-quarter view with');
    expect(prompt).toContain('### Directional audit');
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
    expect(rig).not.toContain('south-west');

    // And it follows the chosen set's *first* facing, so eight runs cover eight sheets.
    const cardinal = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY', directions: 'FOUR_CARDINAL' }),
    );
    expect(cardinal).toContain('- Primary assembly direction: south');
  });

  it('pins the core directional mode to the five facings its inventory names', () => {
    // Its directional core lists those five entry by entry, so a different set would leave section 3
    // asking for facings section 4 never lists. Front leads, which is the point of the five-view set:
    // 0° and 180° are their own mirror, so a three-view sheet could reach neither.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'FOUR_CARDINAL' }),
    );
    expect(prompt).toContain(
      '- Directions required: Front, front-three-quarter, right side, back-three-quarter, back',
    );
    expect(prompt).toContain('- Primary assembly direction: front');
    expect(prompt).not.toContain('- Directions required: South, west, north, east');
  });

  it('puts the background key in the contract and in the self-audit', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ backgroundKey: 'MAGENTA_FF00FF' }));
    expect(prompt).toContain('Background is uniform flat magenta #FF00FF, filling all space');
    expect(prompt).toContain('Background is uniform flat magenta #FF00FF with no shadow');
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

    expect(prompt).not.toContain('Every limb segment is straight and unposed');
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

    expect(prompt).toContain('Every limb segment is straight and unposed');
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
