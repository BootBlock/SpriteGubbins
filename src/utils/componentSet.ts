import { COMPONENT_BREAKDOWNS, COMPONENT_COUNTS } from '../constants/promptText/inventory.ts';
import type { AnatomyComponent } from '../types/anatomy.ts';
import type { DirectionalMode } from '../types/output.ts';
import { countAnatomyComponents, formatAnatomyComponent } from './additionalAnatomy.ts';

/**
 * The components the sheet actually asks for: the mode's own inventory, plus whatever anatomy the
 * subject names.
 *
 * Separate from `constants/promptText/inventory.ts` because the two answer different questions. That
 * file holds what a *mode* is — fixed data, one entry per member of the union. This resolves a mode
 * against a particular subject, which is the only place the two halves of the prompt's arithmetic
 * meet, and is therefore compiler logic rather than a constant.
 *
 * They have to meet somewhere. v2 declared additional anatomy to be separate pieces in section 1
 * while section 0 demanded exactly N components and section 4 listed exactly N — so a subject with a
 * tail asked for more pieces than it counted. Every reader of the number goes through the two
 * functions below, so the contract, the self-audit, the inventory heading, the mode selector and the
 * atlas grid cannot arrive at different totals.
 */

/** The count the prompt states, once the subject's own additional anatomy is included. */
export function componentCountFor(mode: DirectionalMode, additional: readonly AnatomyComponent[]): number {
  return COMPONENT_COUNTS[mode] + countAnatomyComponents(additional);
}

/**
 * The inventory section 4 carries: a heading stating the true total, the mode's own entries, then
 * one entry per named anatomy.
 *
 * The heading is written here rather than stored with each mode's body precisely because of the
 * total — a heading reading "15 in total" above a section 0 demanding 18 is the self-contradiction
 * the whole mechanism exists to prevent, and a model resolving it arbitrarily is how a sheet comes
 * back with the wrong number of pieces.
 *
 * The anatomy comes *last*, and the text says so. Labels are banned by section 0, so grid position
 * is the only thing that identifies a component — appending keeps every base entry at the position
 * the mode's inventory promised, where interleaving would silently renumber everything after it.
 */
export function componentBreakdownFor(
  mode: DirectionalMode,
  additional: readonly AnatomyComponent[],
): string {
  const inventory = `### Component inventory — ${String(componentCountFor(mode, additional))} in total

${COMPONENT_BREAKDOWNS[mode]}`;
  if (additional.length === 0) return inventory;

  const entries = additional.map((component) => `- ${formatAnatomyComponent(component)}.`).join('\n');

  return `${inventory}

#### Additional anatomy — ${String(countAnatomyComponents(additional))}

Genuine anatomy, so each of these is drawn as its own component rather than painted onto another.
They come last in reading order, after the ${String(COMPONENT_COUNTS[mode])} components above:

${entries}`;
}
