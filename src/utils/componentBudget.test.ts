import { describe, expect, it } from 'vitest';
import { NO_COMPONENT_BUDGET } from '../constants/componentBudget.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../constants/promptText/index.ts';
import { exceedsComponentBudget } from './componentBudget.ts';
import { generatePrompt } from './promptCompiler.ts';

describe('exceedsComponentBudget', () => {
  it('fires only once the count is past the budget, not when it reaches it', () => {
    // The budget is what one generation may be *asked* for, so a sheet sitting exactly on it is
    // within it. Off by one here would make the shipped default (a 43-component mode against a
    // 43-component budget) warn about itself on first paint.
    expect(exceedsComponentBudget(42, 43)).toBe(false);
    expect(exceedsComponentBudget(43, 43)).toBe(false);
    expect(exceedsComponentBudget(44, 43)).toBe(true);
  });

  it('treats a budget of zero as no cap rather than a budget nothing can fit', () => {
    // The reason `NO_COMPONENT_BUDGET` is checked before the comparison instead of being folded
    // into it: `count > 0` is true of every sheet there is.
    expect(exceedsComponentBudget(1, NO_COMPONENT_BUDGET)).toBe(false);
    expect(exceedsComponentBudget(999, NO_COMPONENT_BUDGET)).toBe(false);
  });
});

describe('the budget’s effect on the prompt', () => {
  it('compiles the same prompt whatever the budget is', () => {
    // The budget caps the *request*, not the contract, and this is the assertion that keeps it that
    // way. Clamping the count to fit would make section 0 demand a number section 4 does not list —
    // the self-contradiction v2 exists to remove — and emitting the budget as prose would ask the
    // generator to negotiate a figure only the user can change. Its whole visible effect is the two
    // warnings — the studio's, which `ComponentBudgetNotice.test.tsx` covers, and the split drawer's
    // per-row chip, which `SheetSplitModal.test.tsx` does.
    const { category, subject } = DEFAULT_PRESET;
    const output = DEFAULT_OUTPUT_CONFIG;
    const uncapped = generatePrompt(category, subject, { ...output, componentBudget: NO_COMPONENT_BUDGET });

    for (const componentBudget of [1, 5, PRACTICAL_COMPONENT_CEILING, 999]) {
      expect(
        generatePrompt(category, subject, { ...output, componentBudget }),
        `a budget of ${String(componentBudget)} changed the compiled prompt`,
      ).toBe(uncapped);
    }
  });
});
