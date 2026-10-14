import type { SheetPlan } from '../types/components.ts';

/**
 * How many cells a sheet's native grid is fitted to: the square grid the plan declares, where it
 * declares one (`SheetPlan.cellGrid`), and otherwise the components the sheet draws.
 *
 * One answer for the prompt's native grid (`promptFacts`) and the Quantise tab's suggested scale
 * (`useSuggestedGrid`), because a sheet read back at a scale its prompt did not ask for is cut wrong.
 */
export function seatedCells(plan: SheetPlan, components: number): number {
  return plan.cellGrid === undefined ? components : plan.cellGrid * plan.cellGrid;
}
