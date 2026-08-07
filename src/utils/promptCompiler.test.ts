import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DIRECTIONAL_MODE_CHOICES } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import * as promptText from '../constants/promptText/index.ts';
import { COMPONENT_BREAKDOWNS, COMPONENT_COUNTS } from '../constants/promptText/index.ts';
import { PROMPT_TEMPLATE } from '../constants/promptTemplate.ts';
import { DIRECTIONAL_MODES, RENDER_STYLES, RIG_MODES } from '../types/output.ts';
import type { OutputConfig } from '../types/output.ts';
import { SUBJECT_CATEGORIES, SUBJECT_FIELD_KEYS } from '../types/subject.ts';
import type { SubjectDefinition } from '../types/subject.ts';
import { calculateAtlasMetrics, widthBiasFor } from './atlasCalculator.ts';
import { countWords, estimateTokens, generatePrompt } from './promptCompiler.ts';

/**
 * The compiler is the app. Everything else is a way of choosing its arguments, so these tests assert
 * on what the generated prompt actually *says* — a check that it is merely a non-empty string would
 * pass for every way this can go wrong.
 */

const SUBJECT = DEFAULT_PRESET.subject;
const OUTPUT = DEFAULT_PRESET.output;

function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...OUTPUT, ...overrides };
}

/** Tokens the compiler computes rather than looking up. See the test that pins each one. */
const COMPUTED_DESCRIPTIONS = new Set(['DIRECTIONS_DESCRIPTION']);

/** Every field cleared — the case v1 filled with `DEFINED` tokens. */
const EMPTY_SUBJECT: SubjectDefinition = Object.fromEntries(
  SUBJECT_FIELD_KEYS.map((key) => [key, '']),
) as SubjectDefinition;

describe('generatePrompt — the subject', () => {
  it('writes every stated subject field into the prompt', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, OUTPUT);
    for (const value of Object.values(SUBJECT)) {
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

describe('component counts', () => {
  it.each(DIRECTIONAL_MODES)(
    '%s states one count consistently across the prompt, the inventory, the selector and the atlas',
    (mode) => {
      const count = COMPONENT_COUNTS[mode];
      expect(Number.isInteger(count) && count > 0).toBe(true);

      // The prompt states it twice — once as the contract, once as the self-audit — and both must
      // be the same number the inventory below them lists.
      const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ directionalMode: mode }));
      expect(prompt).toContain(`Exactly ${count} components`);
      expect(prompt).toContain(`Component count is exactly ${count}.`);
      expect(COMPONENT_BREAKDOWNS[mode]).toContain(`— ${count} in total`);

      // The selector must promise the same number the prompt will ask for.
      const choice = DIRECTIONAL_MODE_CHOICES.find((candidate) => candidate.value === mode);
      expect(choice?.label).toContain(String(count));

      // And the atlas has to lay out a grid that actually holds them.
      const metrics = calculateAtlasMetrics({
        canvasSize: 2048,
        padding: 4,
        componentCount: count,
        widthBias: widthBiasFor('WIDE_16_9'),
      });
      expect(metrics.columns * metrics.rows).toBeGreaterThanOrEqual(count);
    },
  );

  it('has no mode asking for more than a model can deliver', () => {
    // 111 components in one image was deleted for this reason; the ceiling is roughly 40.
    for (const mode of DIRECTIONAL_MODES) {
      expect(COMPONENT_COUNTS[mode], `${mode} exceeds the practical ceiling`).toBeLessThanOrEqual(43);
    }
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

describe('the template itself', () => {
  it('fills every _DESCRIPTION token from a matching _TEXT map', () => {
    // The naming convention is the contract between the template and `constants/promptText/`: a
    // `[DEFINE:FOO_DESCRIPTION]` is filled from `FOO_TEXT`. Walking it here is what stops a token
    // being added without its map — which would otherwise reach a model as literal template text.
    const tokens = [...PROMPT_TEMPLATE.matchAll(/\[DEFINE:([A-Z0-9_]+_DESCRIPTION)\]/g)].map(
      (match) => match[1] ?? '',
    );
    expect(new Set(tokens).size).toBeGreaterThan(0);

    const exported = new Set(Object.keys(promptText));
    for (const token of new Set(tokens)) {
      if (COMPUTED_DESCRIPTIONS.has(token)) continue;
      const mapName = token.replace(/_DESCRIPTION$/, '_TEXT');
      expect(exported, `[DEFINE:${token}] has no ${mapName} to fill it from`).toContain(mapName);
    }
  });

  it('computes the descriptions that no fixed map could hold', () => {
    // The one documented exception to the convention, asserted rather than merely allowed: the
    // directions line describes the set the compiler *narrowed to*, which is a function of the mode
    // as well as the chosen set, so a lookup keyed on the set alone would state the wrong thing.
    expect(typeof promptText.describeDirections).toBe('function');
    expect(promptText.describeDirections(['south', 'west'])).toBe('South, west');
  });

  it('opens with the output contract rather than burying it', () => {
    // Attention weighting favours early tokens, and background, pixel density and "no text" are the
    // constraints that fail most often. v1 had them in sections 8 and 9.
    const contractAt = PROMPT_TEMPLATE.indexOf('## 0. NON-NEGOTIABLE OUTPUT CONTRACT');
    const subjectAt = PROMPT_TEMPLATE.indexOf('## 1. SUBJECT DEFINITION');
    expect(contractAt).toBeGreaterThan(-1);
    expect(contractAt).toBeLessThan(subjectAt);
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
