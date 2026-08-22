import { describe, expect, it } from 'vitest';
import { DEFAULT_IMAGE_CONFIG, DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { toImageConfig, withCompanionOutputs } from './imageConfig.ts';

/**
 * Which fields are the sheet's and which are the user's, asserted rather than assumed.
 *
 * TypeScript cannot carry this on its own: `OutputConfig` extends `ImageOutputConfig`, so a whole
 * configuration passes anywhere the image half is wanted and the two extra keys travel with it
 * silently. These are the checks that make the split real at runtime — the boundary a preset is
 * saved and loaded across.
 */

describe('toImageConfig', () => {
  it('drops the companion outputs and keeps everything else', () => {
    const image = toImageConfig({
      ...DEFAULT_OUTPUT_CONFIG,
      emitComponentMap: true,
      emitPromptFeedback: true,
      renderStyle: 'CEL_SHADED',
    });

    expect(Object.keys(image)).not.toContain('emitComponentMap');
    expect(Object.keys(image)).not.toContain('emitPromptFeedback');
    expect(image.renderStyle).toBe('CEL_SHADED');
  });

  it('leaves exactly the image defaults when given the studio’s opening state', () => {
    // Which is also the check that `DEFAULT_OUTPUT_CONFIG` is `DEFAULT_IMAGE_CONFIG` plus the two,
    // rather than a second literal that has drifted from it.
    expect(toImageConfig(DEFAULT_OUTPUT_CONFIG)).toEqual(DEFAULT_IMAGE_CONFIG);
  });

  it('does not mutate what it was given', () => {
    const output = { ...DEFAULT_OUTPUT_CONFIG, emitComponentMap: true };
    toImageConfig(output);

    expect(output.emitComponentMap).toBe(true);
  });
});

describe('withCompanionOutputs', () => {
  it('takes the companions from the studio and everything else from the image', () => {
    const whole = withCompanionOutputs(
      { ...DEFAULT_IMAGE_CONFIG, renderStyle: 'CEL_SHADED', targetModel: 'GEMINI_PRO_IMAGE' },
      { ...DEFAULT_OUTPUT_CONFIG, emitComponentMap: true, emitPromptFeedback: true },
    );

    expect(whole.renderStyle).toBe('CEL_SHADED');
    expect(whole.targetModel).toBe('GEMINI_PRO_IMAGE');
    expect(whole.emitComponentMap).toBe(true);
    expect(whole.emitPromptFeedback).toBe(true);
  });

  it('ignores companion values carried on the image half', () => {
    // The case structural typing lets through: a value already typed `OutputConfig`, handed in where
    // the image half was wanted. (A fresh literal is rejected — excess-property checking catches
    // that one — which is why this goes through a variable.) Its two answers are still overwritten
    // by the ones from `from`, so a preset that somehow held them could not decide them either.
    const carriesBoth: OutputConfig = {
      ...DEFAULT_OUTPUT_CONFIG,
      emitComponentMap: true,
      emitPromptFeedback: true,
    };

    const whole = withCompanionOutputs(carriesBoth, DEFAULT_OUTPUT_CONFIG);

    expect(whole.emitComponentMap).toBe(false);
    expect(whole.emitPromptFeedback).toBe(false);
  });

  it('round-trips a whole configuration through the split unchanged', () => {
    const output = {
      ...DEFAULT_OUTPUT_CONFIG,
      emitPromptFeedback: true,
      projection: 'TRUE_ISOMETRIC',
    } as const;

    expect(withCompanionOutputs(toImageConfig(output), output)).toEqual(output);
  });
});
