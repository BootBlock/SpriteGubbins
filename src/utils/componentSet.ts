import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import type { ComponentGroup, SheetPlan } from '../types/components.ts';
import type { AnatomyComponent } from '../types/anatomy.ts';
import type { DirectionalMode } from '../types/output.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { countAnatomyComponents, formatAnatomyComponent } from './additionalAnatomy.ts';

/**
 * The components a sheet actually asks for: the category's plan for the chosen mode, plus whatever
 * anatomy the subject names.
 *
 * **Both halves come from one structure.** The count is a sum over the plan's entries and the
 * inventory prose is rendered from those same entries, so the two cannot disagree — where previously
 * a hand-maintained `Record<DirectionalMode, number>` sat beside a hand-written
 * `Record<DirectionalMode, string>` and nothing checked that 43 was what the bullets added up to.
 *
 * Every reader of the number — the prompt's contract, its inventory heading, its self-audit, the mode
 * selector, the component-budget notice and the atlas grid — goes through `componentCountFor`, so
 * there is one sum with six readers rather than six additions that must stay equal.
 */

/** What one group contributes, summing its entries rather than trusting a number in its heading. */
function groupTotal(group: ComponentGroup): number {
  return group.entries.reduce((total, entry) => total + entry.count, 0);
}

/** What the plan itself contributes, before the subject's own anatomy. */
export function planComponentCount(plan: SheetPlan): number {
  return plan.groups.reduce((total, group) => total + groupTotal(group), 0);
}

/** The count the prompt states, once the subject's own additional anatomy is included. */
export function componentCountFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  additional: readonly AnatomyComponent[],
): number {
  return planComponentCount(sheetPlanFor(category, mode)) + countAnatomyComponents(additional);
}

/** What the component set must assemble into — the category's own answer, not another's. */
export function assemblyFor(category: SubjectCategory, mode: DirectionalMode): string {
  return sheetPlanFor(category, mode).assembly;
}

/** One group as the Markdown section 4 carries, with its total written from its own entries. */
function renderGroup(group: ComponentGroup): string {
  const parts: string[] = [];
  if (group.heading !== null) parts.push(`#### ${group.heading} — ${String(groupTotal(group))}`);
  if (group.intro !== undefined) parts.push(group.intro);
  parts.push(group.entries.map((entry) => `- ${entry.text}.`).join('\n'));
  if (group.outro !== undefined) parts.push(group.outro);
  return parts.join('\n\n');
}

/**
 * The inventory section 4 carries: a heading stating the true total, the category's own entries, then
 * one entry per named anatomy.
 *
 * The heading total is derived here for the same reason the group totals are — a heading reading
 * "15 in total" above a section 0 demanding 18 is the self-contradiction the whole mechanism exists
 * to prevent, and a model resolving it arbitrarily is how a sheet comes back with the wrong number of
 * pieces.
 *
 * The anatomy comes *last*, and the text says so. Labels are banned by section 0, so grid position is
 * the only thing that identifies a component — appending keeps every base entry at the position the
 * plan promised, where interleaving would silently renumber everything after it.
 */
export function componentBreakdownFor(
  category: SubjectCategory,
  mode: DirectionalMode,
  additional: readonly AnatomyComponent[],
): string {
  const plan = sheetPlanFor(category, mode);
  const total = componentCountFor(category, mode, additional);

  const inventory = `### Component inventory — ${String(total)} in total

${plan.groups.map(renderGroup).join('\n\n')}`;
  if (additional.length === 0) return inventory;

  const entries = additional.map((component) => `- ${formatAnatomyComponent(component)}.`).join('\n');

  return `${inventory}

#### Additional anatomy — ${String(countAnatomyComponents(additional))}

Genuine anatomy, so each of these is drawn as its own component rather than painted onto another.
They come last in reading order, after the ${String(planComponentCount(plan))} components above:

${entries}`;
}
