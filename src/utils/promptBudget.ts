import type { PromptBudget, TargetModelId } from '../types/output.ts';
import { estimateTokens } from './promptCompiler.ts';
import { promptBudgetFor } from './targetCapabilities.ts';

/** A compiled prompt measured against what its target actually reads. */
export interface BudgetReading {
  readonly budget: PromptBudget;
  /** The prompt's size in the budget's own unit. */
  readonly used: number;
  readonly isOver: boolean;
  /** How many times over the ceiling, for a prompt that is over it. `1` when exactly at the limit. */
  readonly overBy: number;
}

/**
 * Measure a compiled prompt against its target's documented ceiling, or `null` where the vendor
 * publishes none.
 *
 * This exists because the app cheerfully composes a two-and-a-half-thousand word specification and
 * then says nothing about the target that reads the first seventy-seven tokens of it. A word count
 * is not the same information: what matters is the count *this* endpoint is documented to accept.
 *
 * Tokens are the app's ~4-characters-per-token estimate, which is what the preview already shows —
 * deliberately, since no tokeniser ships with the app and every target uses a different one. That
 * makes a reading approximate, so **nothing may read one at the margin**: the studio's notice reports
 * a ceiling exceeded many times over, and `presetCoverage.test.ts` holds a shipped preset to a
 * fraction of its target's. Both are distances the estimate's error cannot argue with. A comparison
 * that turns on the last few per cent is asking this function for a precision it does not have —
 * which is what `used <= limit` quietly did to that test, until a preset landed on 4,500 of 4,500.
 */
export function readPromptBudget(prompt: string, target: TargetModelId): BudgetReading | null {
  const budget = promptBudgetFor(target);
  if (budget === null) return null;

  const used = budget.unit === 'characters' ? prompt.length : estimateTokens(prompt);
  return {
    budget,
    used,
    isOver: used > budget.limit,
    // Guarded rather than assumed positive: a budget of zero is a nonsense entry, and dividing by
    // it would put `Infinity` in front of the user instead of failing where it can be seen.
    overBy: budget.limit > 0 ? used / budget.limit : 0,
  };
}
