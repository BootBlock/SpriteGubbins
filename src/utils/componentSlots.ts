import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import type { ComponentEntry, SheetFacings } from '../types/components.ts';
import type { AnatomyComponent } from '../types/anatomy.ts';
import type { DirectionalMode, DirectionSet } from '../types/output.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { anatomyFacingsFor } from './componentSet.ts';
import { slugify } from './slugify.ts';

/**
 * One name per component the sheet asks for, in the order section 4 lays them out.
 *
 * **This is the inventory expanded to individual components**, where `componentBreakdownFor` renders
 * the same walk as the prose a generator reads and `componentCountFor` sums it to a number. All
 * three have to agree, so all three walk the plan's own entries: a name list of a different length
 * from the count would map every sprite after the divergence onto the wrong component, which is the
 * failure the whole arrangement is arranged against. `componentSlots.test.ts` holds the two lengths
 * equal across every category, mode and direction set.
 *
 * **The expansion order is section 4's own, and it is stated in two places for one reason.** The
 * inventory's intro fixes it for the reader — facings are the outer axis, with an entry's ×N copies
 * together at each — and this fixes it for the file. Anatomy comes last, exactly as the prose
 * appends it, because grid position is the only thing identifying a component and interleaving would
 * renumber everything after it.
 *
 * **What a name is worth, and what it is not.** It identifies the inventory *line* a component came
 * from, suffixed by the facing where the sheet draws one piece per facing and by an ordinal
 * otherwise. So `heads-south` is exact, and `left-arm-3` is the third of the eight variants that
 * line asks for — which of them is the hand is in the prompt's own text and deliberately not here.
 * An entry naming its parts in prose could have them read back out, and that is the parse this whole
 * `label` field exists to avoid.
 *
 * Pure, as everything in this directory is.
 */

/**
 * One entry's names: the facing where a sheet draws one per facing, an ordinal where it does not.
 *
 * The facing is slugged rather than used as it stands, because one of them is two words: the classic
 * vocabulary's `right side` would otherwise put a space in a file name and in an identifier.
 */
function entrySlots(entry: ComponentEntry, facings: SheetFacings): readonly string[] {
  if (facings !== 'run' && entry.count === facings.length) {
    return facings.map((facing) => `${entry.label}-${slugify(facing)}`);
  }
  if (entry.count === 1) return [entry.label];
  return Array.from({ length: entry.count }, (_, index) => `${entry.label}-${String(index + 1)}`);
}

/**
 * The subject's own anatomy, once per facing where the sheet turns it.
 *
 * The same product `anatomyCountAt` sums — every piece at every facing — laid out in the order the
 * inventory's intro states: the facing is the outer axis, with a piece's ×N copies together at each.
 */
function anatomySlots(component: AnatomyComponent, facings: SheetFacings): readonly string[] {
  const label = slugify(component.name);
  const copies = Array.from({ length: component.count }, (_, index) =>
    component.count === 1 ? label : `${label}-${String(index + 1)}`,
  );
  if (facings === 'run') return copies;
  return facings.flatMap((facing) => copies.map((copy) => `${copy}-${slugify(facing)}`));
}

/**
 * A name each, with a numeric suffix where two inventory lines slug to the same words.
 *
 * A collision is possible between an entry's label and a piece of anatomy the reader typed — nothing
 * stops a subject naming its own `tail` on a plan that already has one — and two sprites answering to
 * one name is a manifest whose consumers overwrite one with the other. The first keeps the name.
 *
 * **The suffixed name is registered too, and the suffix advances until one is free.** Counting
 * occurrences alone is not enough: `tail`, `tail`, `tail-2` renames the second `tail` to `tail-2`
 * and then hands the third component the name it has just given away — the collision this function
 * exists to remove, arriving one step later, in a pack where two entries share a path and only one
 * of them survives extraction.
 */
function unique(names: readonly string[]): readonly string[] {
  const taken = new Set<string>();
  return names.map((name) => {
    let candidate = name;
    for (let suffix = 2; taken.has(candidate); suffix += 1) candidate = `${name}-${String(suffix)}`;
    taken.add(candidate);
    return candidate;
  });
}

export function componentSlots(
  category: SubjectCategory,
  mode: DirectionalMode,
  directions: DirectionSet,
  sheetIndex: number,
  additional: readonly AnatomyComponent[],
): readonly string[] {
  const plan = sheetPlanFor(category, mode, directions, sheetIndex);
  const names = plan.groups.flatMap((group) =>
    group.entries.flatMap((entry) => entrySlots(entry, plan.facings)),
  );

  const anatomyFacings = anatomyFacingsFor(category, mode, directions, sheetIndex);
  if (anatomyFacings !== null) {
    names.push(...additional.flatMap((component) => anatomySlots(component, anatomyFacings)));
  }

  // A piece of anatomy the reader typed in a non-Latin script, or in punctuation alone, slugs to
  // nothing — `parseAdditionalAnatomy` has no reason to refuse such a name, and the prompt carries it
  // perfectly well. What it cannot be is an identifier, so it falls back to its position, which is
  // what an unnamed sprite is called anyway. Without this the manifest states `"name": ""` while
  // claiming the sheet is named, and the pack writes an entry called `13-.png`.
  return unique(names.map((name, index) => (name === '' ? `component-${String(index + 1)}` : name)));
}
