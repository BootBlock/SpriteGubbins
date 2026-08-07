import { describe, expect, it } from 'vitest';
import { NO_ADDITIONAL_ANATOMY } from '../constants/anatomy.ts';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import * as promptText from '../constants/promptText/index.ts';
import { RENDER_STYLES, RIG_MODES } from '../types/output.ts';
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
    // Sockets belong to a rig. The template's socket block is a sibling of the rig section rather
    // than nested in it, so without the compiler's gate a leftover list would strand an orphaned
    // heading in the middle of a pose-library sheet.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ rigMode: 'POSE_LIBRARY', sockets: 'head, chest' }),
    );
    expect(prompt).not.toContain('Attachment sockets');
    expect(prompt).not.toContain('head, chest');
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
    // Every combination of the three switches the template branches on, so no block escapes being
    // both taken and skipped.
    for (const renderStyle of RENDER_STYLES) {
      for (const rigMode of RIG_MODES) {
        for (const emitManifest of [true, false]) {
          const prompt = generatePrompt(
            'CHARACTER',
            SUBJECT,
            withOutput({ renderStyle, rigMode, emitManifest, targetModel: 'GENERIC' }),
          );
          expect(prompt, `${renderStyle}/${rigMode}/${String(emitManifest)}`).not.toMatch(
            /\[(?:DEFINE|OPTIONAL|IF):|\[\/IF\]/,
          );
        }
      }
    }
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
  const CORE = withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'THREE_CLASSIC' });

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

  it('makes the inventory demand one geometry rather than three designs', () => {
    expect(generatePrompt('CREATURE', SUBJECT, CORE)).toMatch(
      /the same piece of geometry drawn\s+at each object yaw section 3 lists/,
    );
  });

  it('orders the rules so aesthetics cannot outrank a stated direction', () => {
    expect(generatePrompt('CHARACTER', SUBJECT, CORE)).toContain('Nothing later overrides anything earlier');
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

  it('pins the core directional mode to the three facings its inventory names', () => {
    // Its 43-component inventory lists front-three-quarter, right-side and back-three-quarter entry
    // by entry, so a different set would leave section 3 asking for facings section 4 never lists.
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', directions: 'FOUR_CARDINAL' }),
    );
    expect(prompt).toContain('- Directions required: Front-three-quarter, right side, back-three-quarter');
    expect(prompt).toContain('- Primary assembly direction: front-three-quarter');
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
    // The five categories share sixteen keys but not their pools, so each one exercises a different
    // set of values through the same optional lines.
    const prompt = generatePrompt(category, defaultSubjectFor(category), OUTPUT);
    expect(prompt).toContain(`# MODULAR SPRITE-SHEET SPECIFICATION — ${category}`);
    expect(prompt).not.toMatch(/\[(?:DEFINE|OPTIONAL|IF):|\[\/IF\]/);
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
