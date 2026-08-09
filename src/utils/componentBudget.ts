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
 * That is said in the two places a prompt is taken away from: `ComponentBudgetNotice`, beside the
 * studio's own preview, and `SheetSplitRun`, on each row of the split drawer.
 *
 * **Both, because either alone leaves sheets nobody checked.** The studio holds one sheet of a batch
 * at a time, so on its own it compares whichever the sheet control is pointed at — exact for a rig
 * over eight facings, where every run carries the same plan and the same count, and blind on the
 * series axis, where a directional core and the articulation sheet beside it deliberately carry
 * different parts of one inventory. Asking it of every row of the drawer is what makes the answer
 * cover the batch, and the drawer is where the batch is visible.
 *
 * **It is a per-generation cap, and a batch total is deliberately not measured against it.** A split
 * configuration is several generations — `batchComponentCount` is what the whole batch asks for, and
 * the split drawer states it — so asking whether one hundred and twenty components exceed a budget of
 * forty-three would report every eight-facing rig as over budget while every sheet in it sits
 * comfortably inside. The two figures answer different questions: the budget says a *single image*
 * will come back short, and the batch total says how large the job is. This function is therefore
 * asked of one sheet, always, and the total is reported rather than compared.
 *
 * `NO_COMPONENT_BUDGET` is checked before the comparison rather than folded into it: without that,
 * an uncapped studio would report every sheet as over a budget of nought.
 */
export function exceedsComponentBudget(count: number, budget: number): boolean {
  return budget > NO_COMPONENT_BUDGET && count > budget;
}
