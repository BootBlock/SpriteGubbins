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
 * Two rather than 1.5, which is where the arithmetic alone would put it. `Math.round` returns `1`
 * for everything under 1.5×, so below that the multiplier stops distinguishing anything at all —
 * one token past a 4,500-token budget and two thousand past it render as the same phrase. From 1.5×
 * it starts answering, but coarsely enough to mislead in the other direction: 1.6× rounds *up* to
 * "2× over", overstating by a quarter. A whole multiple is only worth printing once rounding to it
 * is a small fraction of the claim, and the excess is exact all the way down.
 */
const MULTIPLIER_FROM = 2;

/**
 * The `~` marking a figure as the token estimator's answer rather than a count.
 *
 * It belongs on **every figure derived from `used`** — the size itself, the excess over the ceiling,
 * and the multiple of it — because all three inherit the estimate's error. It never belongs on
 * `limit`, which is a documented figure and exact whatever the unit.
 *
 * Keyed off `characters` rather than `tokens` so that it agrees with {@link readPromptBudget}, which
 * reaches for the estimator for any unit that is not `characters`. A unit added on one side and not
 * the other then ends up hedged rather than quietly presented as exact.
 */
function estimateMarker(reading: BudgetReading): string {
  return reading.budget.unit === 'characters' ? '' : '~';
}

/**
 * The prompt's measured size, marked as an estimate only where it actually is one.
 *
 * The `~` is not decoration: a token figure is `prompt.length / 4` because no tokeniser ships with
 * the app, while a character figure is the length itself. Putting a `~` in front of a character
 * count disclaims a precision the reading has, which is the same fault as claiming one it hasn't —
 * and it is the unit, not the target, that decides which of the two a given reading is.
 */
export function describeUsage(reading: BudgetReading): string {
  return `${estimateMarker(reading)}${String(reading.used)} ${reading.budget.unit}`;
}

/**
 * How far past its ceiling a prompt has gone, phrased at the magnitude it is actually at.
 *
 * A multiplier is the right unit for a prompt many times over: aimed at CLIP's 77-token window, this
 * app's specification is dozens of times past it, and *how many times* is the fact that lands — the
 * raw excess is a five-figure number that says far less. It is the wrong unit anywhere near the
 * ceiling, and that is the whole band a user editing their own prompt sits in: `Math.round`
 * collapses everything under 1.5× to `1`, so a prompt one token past a 4,500-token budget read
 * identically to one two thousand past it, and "1× over" reads as *equal to* rather than *past*.
 * Under {@link MULTIPLIER_FROM} the excess is both finer and directly actionable — it is how much
 * has to come out.
 *
 * Both branches are figures derived from `used`, so both carry {@link estimateMarker}: the excess of
 * an estimate is an estimate, and it is the number a user acts on.
 *
 * Only meaningful for a reading that is over — the studio's notice gates on `isOver`, and there is
 * no overage to describe otherwise.
 */
export function describeOverage(reading: BudgetReading): string {
  const marker = estimateMarker(reading);
  return reading.overBy >= MULTIPLIER_FROM
    ? `${marker}${String(Math.round(reading.overBy))}× over`
    : `over by ${marker}${String(reading.used - reading.budget.limit)}`;
}
