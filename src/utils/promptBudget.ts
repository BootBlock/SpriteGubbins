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
 * deliberately, since no tokeniser ships with the app and every target uses a different one. A
 * *character* budget carries no such error: `prompt.length` is the count itself. So a reading knows
 * two different things depending on its unit, and **nothing may claim more precision than the unit
 * it is in** — {@link describeUsage} is where that distinction is spent, and
 * `presetCoverage.test.ts` holds a shipped preset to a fraction of its target's ceiling for the same
 * reason. A comparison that turns on the last few per cent is asking this function for a precision
 * it does not have, which is what `used <= limit` quietly did to that test until a preset landed on
 * 4,500 of 4,500.
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

/**
 * Where a multiplier starts carrying more information than the excess does.
 *
 * Below twice the ceiling `Math.round` returns `1` for everything, so the multiplier stops
 * distinguishing anything: one token past a 4,500-token budget and two thousand past it both render
 * as the same phrase.
 */
const MULTIPLIER_FROM = 2;

/**
 * The prompt's measured size, marked as an estimate only where it actually is one.
 *
 * The `~` is not decoration: a token figure is `prompt.length / 4` because no tokeniser ships with
 * the app, while a character figure is the length itself. Printing `~17771 characters` disclaims a
 * precision the reading has, which is the same fault as claiming one it hasn't — and it is the unit,
 * not the target, that decides which of the two a given reading is.
 */
export function describeUsage(reading: BudgetReading): string {
  const estimated = reading.budget.unit === 'tokens' ? '~' : '';
  return `${estimated}${String(reading.used)} ${reading.budget.unit}`;
}

/**
 * How far past its ceiling a prompt has gone, phrased at the magnitude it is actually at.
 *
 * A multiplier is the right unit for a prompt many times over: *58× over* is what a two-and-a-half
 * thousand token specification aimed at CLIP's 77-token window actually means, and the 4,410 tokens
 * it works out at says far less. It is the wrong unit anywhere near the ceiling, and that is the
 * whole band a user editing their own prompt sits in — `Math.round` collapses everything under 1.5×
 * to `1`, so a prompt one token past a 4,500-token budget read identically to one 2,000 past it, and
 * "1× over" reads as *equal to* rather than *past*. Under {@link MULTIPLIER_FROM} the excess itself
 * is exact, short, and directly actionable: it is how much has to come out.
 *
 * Only meaningful for a reading that is over — the studio's notice gates on `isOver`, and there is
 * no overage to describe otherwise.
 */
export function describeOverage(reading: BudgetReading): string {
  return reading.overBy >= MULTIPLIER_FROM
    ? `${String(Math.round(reading.overBy))}× over`
    : `over by ${String(reading.used - reading.budget.limit)}`;
}
