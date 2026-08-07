import { describe, expect, it } from 'vitest';
import { TARGET_MODELS } from '../constants/models.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import type { OutputConfig } from '../types/output.ts';
import { generatePrompt } from './promptCompiler.ts';
import { supportsManifest } from './modelWrappers.ts';

/**
 * The wrappers differ in *kind*, not in wording — a reasoning contract, command flags, a negative
 * block, a directive prefix — so each test here pins the thing that would make the wrapper wrong for
 * its target rather than merely differently worded.
 *
 * Driven through `generatePrompt` rather than `wrapForModel` directly, because what matters is the
 * text the user actually copies.
 */
const SUBJECT = DEFAULT_PRESET.subject;

function withOutput(overrides: Partial<OutputConfig>): OutputConfig {
  return { ...DEFAULT_PRESET.output, ...overrides };
}

describe('wrapForModel', () => {
  it.each(TARGET_MODEL_IDS)('%s still carries the template', (targetModel) => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel }));
    expect(prompt).toContain('## 0. NON-NEGOTIABLE OUTPUT CONTRACT');
  });

  it('leaves the generic prompt unwrapped', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'GENERIC' }));
    expect(prompt.startsWith('# MODULAR SPRITE-SHEET SPECIFICATION')).toBe(true);
    expect(prompt.endsWith('Generate the sheet now.')).toBe(true);
  });

  it('gives Midjourney flags, without the two that did nothing', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'MIDJOURNEY' }));
    expect(prompt).toContain('--ar 16:9');
    expect(prompt).toContain('--style raw');
    expect(prompt).toContain('--s 50');
    // `--sw` is style-reference weight and does nothing without an accompanying `--sref`.
    expect(prompt).not.toContain('--sw');
    // Excluding "background" would risk losing the key colour the sheet is built around.
    expect(prompt).not.toMatch(/--no[^\n]*background/);
  });

  it('gives Flux prose rather than a negative block it would discard', () => {
    const flux = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'FLUX' }));
    expect(flux).not.toContain('Negative prompt:');
    expect(flux).toContain('no assembled figure');

    const sd = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'STABLE_DIFFUSION' }));
    expect(sd).toContain('Negative prompt:');
    expect(sd).toContain('(assembled character:1.3)');
  });

  it('names the chosen background key in the Flux restatement', () => {
    const prompt = generatePrompt(
      'CHARACTER',
      SUBJECT,
      withOutput({ targetModel: 'FLUX', backgroundKey: 'PURE_BLACK' }),
    );
    expect(prompt).toContain('on a flat pure black #000000 field');
  });

  it('does not restate in the Sol wrapper what the template now says twice', () => {
    const prompt = generatePrompt('CHARACTER', SUBJECT, withOutput({ targetModel: 'CHATGPT_5_6_SOL' }));
    expect(prompt).toContain('High reasoning effort');
    expect(prompt).toContain('Treat section 0 as a hard done-condition');
    // The old wrapper carried its own component count, background rule and checklist. Section 0 and
    // section 9 are those now, and stating a rule three times dilutes it.
    expect(prompt).not.toContain('[VERIFICATION CONTRACT');
    expect(prompt).not.toContain('Strict Done-Condition');
  });

  it('offers a manifest from the conversational targets only', () => {
    expect(supportsManifest('GENERIC')).toBe(true);
    expect(supportsManifest('CHATGPT_5_6_SOL')).toBe(true);
    for (const target of ['MIDJOURNEY', 'STABLE_DIFFUSION', 'FLUX', 'GOOGLE_IMAGEN', 'DALLE_3'] as const) {
      expect(supportsManifest(target), `${target} cannot return text with an image`).toBe(false);
    }
  });

  it('has a selector entry for every wrapped model, and no more', () => {
    expect(TARGET_MODELS.map((model) => model.id).sort()).toEqual([...TARGET_MODEL_IDS].sort());
  });
});
