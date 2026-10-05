import { describe, expect, it } from 'vitest';
import { LIGHTING_HAS_KEY, lightingDescription } from '../constants/promptText/index.ts';
import { reachableSheets } from '../test/reachableSheets.ts';
import { LIGHTING_MODELS } from '../types/output.ts';
import { generatePrompt } from './promptCompiler.ts';

/**
 * No sheet asks for a light direction under a lighting model that has none (audit finding P9).
 *
 * The icon sheets said every icon "is lit from the same direction", section 3 held every component to
 * one "lighting direction" and "key-light direction", and the self-audit checked "one light direction"
 * — under `FLAT_NEUTRAL_ALBEDO`, "even illumination with no directional key", and the unlit model. A key
 * light keeps its direction; every other model asks every component to be lit alike.
 */

const DIRECTIONAL = [
  'lighting direction',
  'key-light direction',
  'one light direction',
  'lit from the same direction',
];

describe('the light every component shares', () => {
  it('declares a key light exactly where section 2’s own words state one', () => {
    for (const lighting of LIGHTING_MODELS) {
      const words = lightingDescription('PIXEL_ART', lighting, 'CHARACTER');
      expect(LIGHTING_HAS_KEY[lighting], words).toBe(words.includes('key light'));
    }
  });

  // 30 seconds, as `tests/resolution-profile-fit.test.ts` budgets its own sweep: this compiles every
  // reachable sheet, and can run past the 5,000ms default under full-suite contention.
  it('is never a direction under a lighting model without a key light, on any sheet', () => {
    // Pixel art offers all three lighting models, so each is stated as itself on every sheet.
    for (const lighting of ['FLAT_NEUTRAL_ALBEDO', 'UNLIT_EMISSIVE_BAKED'] as const) {
      for (const { where, category, subject, output } of reachableSheets()) {
        const prompt = generatePrompt(category, subject, {
          ...output,
          renderStyle: 'PIXEL_ART',
          lightingModel: lighting,
        });
        for (const phrase of DIRECTIONAL) expect(prompt, `${where} / ${lighting}`).not.toContain(phrase);
      }
    }
  }, 30_000);

  it('keeps the direction, and the check on it, under a key light', () => {
    const [character] = reachableSheets().filter(({ category }) => category === 'CHARACTER');
    if (character === undefined) throw new Error('No CHARACTER sheet is reachable.');
    const lit = generatePrompt(character.category, character.subject, {
      ...character.output,
      renderStyle: 'PIXEL_ART',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
    });
    expect(lit).toContain('pixel density and lighting direction are identical');
    expect(lit).toContain('One camera, one scale and one light direction across every component');

    const flat = generatePrompt(character.category, character.subject, {
      ...character.output,
      renderStyle: 'PIXEL_ART',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    });
    expect(flat).toContain('or lit differently from the rest is a defect.');
    expect(flat).toContain('One camera and one scale across every component, and none lit differently');
  });
});
