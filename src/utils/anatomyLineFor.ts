import type { AnatomyComponent } from '../types/anatomy.ts';
import type { SheetFacings, SheetPlan } from '../types/components.ts';
import { formatAnatomyComponent } from './additionalAnatomy.ts';

/**
 * Section 1's line for the subject's additional anatomy on this sheet, or `''` where the sheet draws
 * none of it.
 *
 * Rendered from the parse rather than passed through raw, so section 1 and section 4 describe the
 * same anatomy: a field reading `Tail ×0` cannot say one thing at the top of the prompt and another in
 * the inventory. It also empties for `NONE`, which drops the line entirely rather than putting a bare
 * sentinel in the highest-weighted section.
 *
 * **And it empties on a sheet that does not carry the anatomy**, for the same reason and a sharper one.
 * Section 1's own prose excepts additional anatomy from its paint rule, as the field section 4 lists
 * and counts separately — so naming a tail here on the articulation sheet, whose inventory has no tail
 * in it and whose contract demands an exact count without one, is a contradiction inside one prompt.
 * The generator resolves it by drawing an uncounted piece or by ignoring a line it was told was
 * binding, and neither is recoverable.
 *
 * **A sheet that lists the pieces in a group of their own names its own share of them** — ICON's
 * overlay sheets (`ComponentGroup.additional`), which cut the reader's pieces across as many sheets as
 * they fill. Each line is the entry's own text, which `formatAnatomyComponent` wrote, so section 1 names
 * the pieces section 4 lists on this sheet and no others.
 */
export function anatomyLineFor(
  plan: SheetPlan,
  anatomy: readonly AnatomyComponent[],
  facings: SheetFacings | null,
): string {
  const listed = plan.groups
    .filter((group) => group.additional === true)
    .flatMap((group) => group.entries.map((entry) => entry.text));
  if (listed.length > 0) return listed.join(', ');
  return facings === null ? '' : anatomy.map(formatAnatomyComponent).join(', ');
}
