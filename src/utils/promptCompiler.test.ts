import { describe, expect, it } from 'vitest';
import { countWords, estimateTokens, generatePrompt } from './promptCompiler.ts';
import { PRESETS } from '../constants/presets.ts';
import { TARGET_MODELS } from '../constants/models.ts';
import { COMPONENT_COUNTS } from '../constants/output.ts';
import { DIRECTIONAL_MODES, TARGET_MODEL_IDS } from '../types/output.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../constants/categories/index.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import type { OutputConfig } from '../types/output.ts';
import type { SubjectDefinition } from '../types/subject.ts';

/**
 * The compiler is the app. Everything else is a way of choosing its arguments, so these tests
 * assert on what the generated prompt actually *says* — a check that it is merely a non-empty
 * string would pass for any of the ways this can go wrong.
 */

// The first preset is the studio's opening state, so it is the most valuable fixture.
const FIRST = PRESETS[0];
if (!FIRST) throw new Error('PRESETS must not be empty — it is the studio default.');
const { subject: SUBJECT, output: OUTPUT } = FIRST;

function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...OUTPUT, ...overrides };
}

describe('generatePrompt — subject definition', () => {
  it('writes every one of the sixteen subject fields into the prompt', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, OUTPUT);
    for (const value of Object.values(SUBJECT)) {
      expect(prompt, `subject value "${value}" is missing from the prompt`).toContain(value);
    }
  });

  it('names the category in the heading and the definition block', () => {
    const prompt = generatePrompt('BUILDING', SUBJECT, OUTPUT);
    expect(prompt).toContain('# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE (BUILDING)');
    expect(prompt).toContain('- Category / Type: `BUILDING`');
  });

  it('substitutes a placeholder rather than leaving an empty value', () => {
    const blank: SubjectDefinition = { ...SUBJECT, species: '', worn_details: '' };
    const prompt = generatePrompt('CHARACTER', blank, OUTPUT);
    expect(prompt).toContain('- Species / Archetype: `DEFINED`');
    expect(prompt).toContain('- Integrated Worn Details / Markings: `NONE`');
    expect(prompt).not.toContain('``');
  });
});

describe('generatePrompt — component counts', () => {
  it.each(DIRECTIONAL_MODES)('states the required count for %s', (directionalMode) => {
    const prompt = generatePrompt(
      'CHARACTER',
      { ...SUBJECT, additional_anatomy: 'NONE' },
      withOutput({ directionalMode, targetModel: 'GENERIC' }),
    );
    expect(prompt).toContain(`${COMPONENT_COUNTS[directionalMode]} isolated components`);
  });

  it('notes extra anatomy as additional segments beyond the base count', () => {
    const prompt = generatePrompt(
      'CHARACTER',
      { ...SUBJECT, additional_anatomy: 'Mechanical Wing Pair' },
      withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS', targetModel: 'GENERIC' }),
    );
    // The base number must survive — it is the done-condition the generator verifies against.
    expect(prompt).toContain(
      '43 isolated components (plus additional isolated segments for: Mechanical Wing Pair)',
    );
  });

  it('omits the rider when no extra anatomy is requested', () => {
    const prompt = generatePrompt(
      'CHARACTER',
      { ...SUBJECT, additional_anatomy: 'NONE' },
      withOutput({ targetModel: 'GENERIC' }),
    );
    expect(prompt).not.toContain('plus additional isolated segments');
  });

  it('includes the per-mode component breakdown, not just the number', () => {
    const single = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY' }),
    );
    expect(single).toContain('### Primary Direction Single Pose Set — 37');

    const full = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'FULL_DIRECTIONAL_POSE_LIBRARY' }),
    );
    expect(full).toContain('### Full 3-Direction Coverage Libraries — 111 Total');

    const core = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ directionalMode: 'CORE_DIRECTIONAL_VARIANTS' }),
    );
    expect(core).toContain('### Directional core — 9');
  });
});

describe('generatePrompt — technical settings', () => {
  it('expands the palette identifier into its contract text', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ paletteLimit: 'STRICT_32_COLOR' }));
    expect(prompt).toContain('STRICT_32_COLOR (Enforce 16 to 32 global color palette target)');
  });

  it('expands the outline and lighting identifiers, and repeats them in the rendering section', () => {
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({
        outlineStyle: 'PURE_BLACK_OUTLINE',
        lightingModel: 'ISOMETRIC_TOP_LEFT',
        targetModel: 'GENERIC',
      }),
    );
    const outline = 'PURE_BLACK_OUTLINE (Enforce crisp single 1px black outer contour boundary)';
    const lighting = 'ISOMETRIC_TOP_LEFT (Fixed 45-degree top-left key lighting with hard shadow bands)';
    // Section 2 declares them; section 8 restates them as rendering instructions.
    expect(prompt.split(outline)).toHaveLength(3);
    expect(prompt.split(lighting)).toHaveLength(3);
  });

  it.each([
    ['WIDE_16_9', 'WIDE 16:9 SHEET'],
    ['SQUARE_1_1', 'SQUARE 1:1 SHEET'],
    ['TALL_9_16', 'TALL 9:16 SHEET'],
    ['ULTRAWIDE_21_9', 'ULTRAWIDE 21:9 SHEET'],
  ] as const)('describes the %s sheet as "%s"', (aspectRatio, expected) => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ aspectRatio }));
    expect(prompt).toContain(expected);
  });
});

describe('generatePrompt — target model wrapping', () => {
  it('leaves a generic prompt unwrapped', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GENERIC' }));
    expect(prompt.startsWith('# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE')).toBe(true);
    expect(prompt.trimEnd().endsWith('exactly as written.')).toBe(true);
  });

  it('wraps Sol in a reasoning contract and a verification checklist', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'CHATGPT_5_6_SOL' }));
    expect(prompt.startsWith('[SYSTEM DIRECTIVE: CHATGPT 5.6 SOL')).toBe(true);
    expect(prompt).toContain('[VERIFICATION CONTRACT FOR CHATGPT 5.6 SOL]');
    // The prompt itself must survive being wrapped, not be replaced by the contract.
    expect(prompt).toContain('# MODULAR SPRITE-SHEET PROMPT ARCHITECTURE (CHARACTER)');
  });

  it('appends Midjourney flags with the aspect ratio that was selected', () => {
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ targetModel: 'MIDJOURNEY', aspectRatio: 'TALL_9_16' }),
    );
    expect(prompt).toContain(
      '--ar 9:16 --v 6.1 --style raw --sw 250 --no background shadows text labels grid frame',
    );
  });

  it('appends a negative prompt block for Stable Diffusion', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'STABLE_DIFFUSION' }));
    expect(prompt).toContain('Negative Prompt: (deformed hands, merged limbs');
  });

  it('prefixes Imagen and DALL-E with their directives', () => {
    const imagen = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GOOGLE_IMAGEN_3' }));
    expect(imagen.startsWith('[IMAGEN 3 DESCRIPTIVE VISUAL SPECIFICATION')).toBe(true);

    const dalle = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'DALLE_3' }));
    expect(dalle.startsWith('[DALL-E 3 DIRECTIVE')).toBe(true);
  });

  it('produces a distinct prompt for every model the selector offers', () => {
    // Guards the pairing between TARGET_MODELS and the compiler's wrapper branches: a model
    // added to the dropdown without a branch would silently produce the generic prompt.
    const byModel = new Map(
      TARGET_MODEL_IDS.map((targetModel) => [
        targetModel,
        generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel })),
      ]),
    );
    expect(new Set(byModel.values()).size).toBe(TARGET_MODEL_IDS.length);
    expect(TARGET_MODELS.map((model) => model.id).sort()).toEqual([...TARGET_MODEL_IDS].sort());
  });
});

describe('generatePrompt — determinism and coverage', () => {
  it('is a pure function of its arguments', () => {
    // This is what lets the preview derive the prompt during render instead of mirroring it
    // into state through an effect.
    expect(generatePrompt('CHARACTER', SUBJECT, OUTPUT)).toBe(generatePrompt('CHARACTER', SUBJECT, OUTPUT));
  });

  it.each(SUBJECT_CATEGORIES)('compiles a complete prompt for a default %s subject', (category) => {
    const prompt = generatePrompt(category, defaultSubjectFor(category), OUTPUT);
    expect(prompt).toContain('## EXECUTION');
    // A default subject is fully populated, so nothing should fall back to a placeholder.
    expect(prompt).not.toContain('`DEFINED`');
    for (const field of CATEGORY_OPTIONS[category].fields) {
      expect(prompt).toContain(field.options[0] ?? '');
    }
  });

  it.each(PRESETS)('compiles every built-in preset ($name) without placeholders', (preset) => {
    const prompt = generatePrompt(preset.category, preset.subject, preset.output);
    expect(prompt).not.toContain('`DEFINED`');
    expect(prompt.length).toBeGreaterThan(1000);
  });
});

describe('countWords / estimateTokens', () => {
  it('counts words in the compiled prompt', () => {
    expect(countWords('one two three')).toBe(3);
    expect(countWords('  padded   with   space  ')).toBe(3);
  });

  it('reports zero for empty or whitespace-only text', () => {
    // `''.split(/\s+/)` yields [''], so a naive implementation reports 1 word for no text.
    expect(countWords('')).toBe(0);
    expect(countWords('   \n  ')).toBe(0);
  });

  it('estimates tokens at roughly four characters each', () => {
    expect(estimateTokens('a'.repeat(400))).toBe(100);
    expect(estimateTokens('')).toBe(0);
  });
});
