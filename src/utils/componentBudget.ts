import { NO_COMPONENT_BUDGET } from '../constants/componentBudget.ts';

/**
 * Whether the sheet asks for more components than the budget allows.
 *
 * The whole of the budget's effect on the app. It is deliberately **not** wired into
 * `promptCompiler.ts`: the budget caps the *request*, not the contract. A prompt silently clamped to
 * fit would state a component count that no longer matches its own inventory — the exact
 * self-contradiction v2 was rewritten to remove — and a prompt carrying the budget as prose would
 * ask the generator to negotiate a number the user is the one who has to change.
 *
 * So the only correct response is to say so, before the prompt is copied, and leave the sheet alone.
 * See `ComponentBudgetNotice`, which is where that is said.
 *
 * `NO_COMPONENT_BUDGET` is checked before the comparison rather than folded into it: without that,
 * an uncapped studio would report every sheet as over a budget of nought.
 */
export function exceedsComponentBudget(count: number, budget: number): boolean {
  return budget > NO_COMPONENT_BUDGET && count > budget;
}
