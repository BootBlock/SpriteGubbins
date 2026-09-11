import { describe, expect, it } from 'vitest';
import { PALETTE_LIMITS } from '../../types/output.ts';
import { colorPlanFor } from '../../utils/colorReduction.ts';
import { OUTPUT_TOOLTIPS } from './tooltips.ts';

/**
 * That the colour budget's guidance says what becomes of the budget, and not only what it asks for.
 *
 * The card used to describe the request alone. Measured across 27 sheets a generator returned for
 * this app's prompts, none was drawn inside the budget it was given (#244), so a card saying only
 * that the prompt carries a budget implied a result that does not arrive — and the Quantise tab,
 * which is the one place the count actually becomes true, went unmentioned.
 *
 * **This is the mechanical half, not the judgement.** Whether the wording is fair to what a generator
 * does is not something an assertion can settle. What one can hold is that the card names the tab,
 * and that it states for every budget what the tab does with it — read from `colorPlanFor`, the
 * decision the tab acts on, rather than from the constant the card is built from, so a card stating
 * one figure while the tab reduces to another fails here.
 *
 * The prose, the punctuation, the length floor and the no-two-controls-share-a-sentence check are
 * `constants/tooltips/tooltips.test.ts`'s, which discovers this record by its name.
 */
describe('the colour budget guidance', () => {
  it('names the tab that makes the budget true of a sheet', () => {
    expect(OUTPUT_TOOLTIPS.paletteLimit).toContain('Quantise tab');
  });

  it.each(PALETTE_LIMITS)('states what the Quantise tab does with %s', (limit) => {
    const { reduction } = colorPlanFor('FREE', limit, null, 0);

    if (reduction === null) {
      expect(OUTPUT_TOOLTIPS.paletteLimit).toMatch(
        new RegExp(`leaves an? ${limit} sheet’s colours as they arrived`),
      );
      return;
    }

    // With no palette pinned and none locked, a budget can only resolve to a colour count. Anything
    // else is a change to `colorPlanFor` that this card would need rewriting for.
    expect(reduction.kind).toBe('MAX_COLORS');
    if (reduction.kind !== 'MAX_COLORS') return;

    expect(OUTPUT_TOOLTIPS.paletteLimit).toMatch(
      new RegExp(`\\b${String(reduction.maxColors)} (?:colours chosen from that sheet )?under ${limit}\\b`),
    );
  });
});
