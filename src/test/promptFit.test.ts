import { describe, expect, it } from 'vitest';
import { TARGET_MODEL_IDS } from '../types/output.ts';
import type { TargetModelId } from '../types/output.ts';
import { readPromptBudget } from '../utils/promptBudget.ts';
import { generatePrompt } from '../utils/promptCompiler.ts';
import { promptBudgetFigureFor } from '../utils/targetCapabilities.ts';
import { LIBRARY_CONFIGURATIONS } from './libraryConfigurations.ts';
import { measurePromptFit } from './promptFit.ts';

/**
 * The reading three suites decide from — which descriptions may claim a fit, which targets the preset
 * library owes a worked example, which ceilings the pieces exemption is priced against. It is a test
 * helper, but a wrong figure from it is printed in every one of their failure messages and was once
 * recorded in a comment as a finding, so what it measures is pinned here.
 */

/** Every size the library compiles to for `target`, in the unit of that target's own figure. */
function sizesFor(target: TargetModelId): readonly number[] {
  return LIBRARY_CONFIGURATIONS.map(({ category, subject, output }) => {
    const reading = readPromptBudget(
      generatePrompt(category, subject, { ...output, targetModel: target }),
      target,
    );
    if (reading === null) throw new Error(`${target} has a figure and read no budget`);
    return reading.used;
  });
}

describe('measurePromptFit', () => {
  it.each(TARGET_MODEL_IDS)('reads %s’s ceiling against the prompts that target is handed', (target) => {
    const reading = measurePromptFit(target);
    if (reading === null) {
      expect(promptBudgetFigureFor(target)?.kind, `${target} has a ceiling and was not measured`).not.toBe(
        'CEILING',
      );
      return;
    }

    // The defect this pins (#231): each prompt was compiled at the target its own preset declared, so
    // GPT Image's largest was a Sol prompt 3,784 characters longer than anything a GPT Image reader
    // receives.
    const sizes = sizesFor(target);
    expect([reading.smallest, reading.largest]).toEqual([Math.min(...sizes), Math.max(...sizes)]);
  });

  it('measures a target whose prompts differ in length from the ones the presets declare', () => {
    // The assertion above can only fail where compiling for another target changes the text. GPT
    // Image is denied the self-audit Sol receives and has a wrapper of its own, so if its prompts ever
    // measured the same as Sol's the regression would pass unseen. Compared in characters, because
    // the two targets' own figures are in different units.
    const longest = (target: TargetModelId): number =>
      Math.max(
        ...LIBRARY_CONFIGURATIONS.map(
          ({ category, subject, output }) =>
            generatePrompt(category, subject, { ...output, targetModel: target }).length,
        ),
      );
    expect(longest('GPT_IMAGE')).toBeLessThan(longest('CHATGPT_5_6_SOL'));
  });
});
