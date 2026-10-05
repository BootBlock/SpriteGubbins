import { describe, expect, it } from 'vitest';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import { DRAWN_OVER_THE_GAME, litByEngine } from './categoryEngineLighting.ts';
import { LIGHTING_MODEL_CHOICES } from './output/choices.ts';
import { OUTPUT_TOOLTIPS } from './output/tooltips.ts';
import { lightingDescription } from './promptText/lighting.ts';

/**
 * That flat neutral lighting gives the engine's reason only where an engine lights the sprite (audit
 * finding C4): an icon set, an interface kit, a font and a dialogue portrait are drawn over the game,
 * where no light reaches.
 */
describe('the reason flat neutral lighting gives', () => {
  const ENGINE_REASON = 'a game engine can light the sprite itself';

  it.each(SUBJECT_CATEGORIES.map((category) => [category] as const))(
    '%s is told the reason true of it',
    (category) => {
      const line = lightingDescription('PIXEL_ART', 'FLAT_NEUTRAL_ALBEDO', category);
      expect(line.startsWith('Flat neutral albedo — even illumination with no directional key, so ')).toBe(
        true,
      );
      expect(line.includes(ENGINE_REASON)).toBe(litByEngine(category));
    },
  );

  it('draws ICON over the game, and every world sprite in it', () => {
    expect(litByEngine('ICON')).toBe(false);
    expect(litByEngine('CHARACTER')).toBe(true);
    expect(Object.keys(DRAWN_OVER_THE_GAME).sort()).toEqual(['FONT', 'ICON', 'INTERFACE', 'PORTRAIT']);
  });

  it('leaves a key light’s line alone in every category', () => {
    for (const category of SUBJECT_CATEGORIES) {
      expect(lightingDescription('PIXEL_ART', 'ISOMETRIC_TOP_LEFT', category)).toBe(
        lightingDescription('PIXEL_ART', 'ISOMETRIC_TOP_LEFT', 'CHARACTER'),
      );
    }
  });

  it('names the categories drawn over the game in the Lighting Model card, and calls no choice engine-lit', () => {
    for (const name of Object.values(DRAWN_OVER_THE_GAME)) {
      expect(OUTPUT_TOOLTIPS.lightingModel.toLowerCase()).toContain(name);
    }
    expect(OUTPUT_TOOLTIPS.lightingModel).not.toContain('is what a game engine wants');
    expect(LIGHTING_MODEL_CHOICES.map((choice) => choice.label).join(' ')).not.toMatch(/engine-lit/u);
  });
});
