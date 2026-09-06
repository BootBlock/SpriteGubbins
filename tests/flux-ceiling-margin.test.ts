import { describe, expect, it } from 'vitest';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../src/constants/categories/index.ts';
import { TARGET_MODELS } from '../src/constants/models.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../src/constants/output/index.ts';
import type { SubjectCategory } from '../src/types/subject.ts';
import { generatePrompt } from '../src/utils/promptCompiler.ts';
import { estimateTokens } from '../src/utils/promptMetrics.ts';

/**
 * The two margins the Flux wrapper's design decisions rest on, re-derived from the compiler.
 *
 * `modelWrapperText/flux.ts` decides two things by measuring how long the compiled prompt is against
 * the 512-token ceiling Black Forest Labs' own inference code truncates at. It leads the prompt
 * rather than trailing it, because a sentence at the end of a specification many times the ceiling
 * is guaranteed to be cut; and it states the sheet's style itself, because section 2's `Style:` line
 * lands past the ceiling and is therefore never read. `RENDER_STYLE_SURFACE`'s docblock states the
 * second of those a second time, in a second directory.
 *
 * Both were written as absolute token counts and both had drifted — "roughly 3,600" against a
 * measured 6,529, and "around token 1,070" against 1,280 — because the prompt grows with every block
 * the template gains and nothing recomputed either (issue #266). Worse than stale: 3,600 was within
 * a rounding of the *smallest* category the app offers rather than of the specification, so the
 * sentence generalised a floor.
 *
 * **So the prose states multiples of the ceiling and this suite holds the bounds**, which is the
 * durable half: the decisions need "far past 512", not a number, and a multiple only moves when the
 * margin genuinely changes. Both bounds are asserted over **every** category, because that is what
 * the corrected sentences claim, and the range across them is what the original figure lost.
 *
 * The ceiling is read out of `TARGET_MODELS.FLUX` rather than written here, so a re-checked vendor
 * figure moves this suite with it. `estimateTokens` is the app's own estimate rather than a real
 * tokeniser — none is available offline — and that is the right instrument here, because it is also
 * what the docblocks' own figures were, which is what makes them comparable.
 */

const CEILING = (() => {
  const flux = TARGET_MODELS.find((model) => model.id === 'FLUX');
  const budget = flux?.capabilities.promptBudget;
  if (budget?.kind !== 'CEILING' || budget.unit !== 'tokens') {
    throw new Error('FLUX no longer declares a token ceiling');
  }
  return budget.limit;
})();

/** Every category, as the compiled prompt's length and where section 2's `Style:` line falls in it. */
const MEASURED = (Object.keys(CATEGORY_OPTIONS) as SubjectCategory[]).map((category) => {
  const prompt = generatePrompt(category, defaultSubjectFor(category), {
    ...DEFAULT_OUTPUT_CONFIG,
    targetModel: 'FLUX',
  });
  const at = prompt.indexOf('Style:');
  return {
    category,
    tokens: estimateTokens(prompt),
    styleAt: at,
    before: estimateTokens(prompt.slice(0, at)),
  };
});

describe('the margins the Flux wrapper is written around', () => {
  it('compiles a specification six to thirteen times the ceiling, on every category', () => {
    for (const { category, tokens } of MEASURED) {
      expect
        .soft(tokens / CEILING, `${category} against the ${String(CEILING)}-token ceiling`)
        .toBeGreaterThan(6);
      expect
        .soft(tokens / CEILING, `${category} against the ${String(CEILING)}-token ceiling`)
        .toBeLessThan(13);
    }
  });

  it('lands section 2’s Style: line past twice the ceiling, on every category', () => {
    for (const { category, styleAt, before } of MEASURED) {
      // A prompt with no `Style:` line at all would make the assertion below vacuous rather than
      // failing, since `slice(0, -1)` is the whole prompt bar its last character.
      expect(styleAt, `${category} carries a Style: line`).toBeGreaterThan(0);
      expect.soft(before / CEILING, `${category}: tokens before its Style: line`).toBeGreaterThan(2);
    }
  });
});
