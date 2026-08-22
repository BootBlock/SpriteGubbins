import { citeSection } from '../templateEngine.ts';
import type { SectionNumbers } from '../templateEngine.ts';

/**
 * Seedream, whose known failure mode is neither truncation nor a missing channel but *dropping*.
 * ByteDance's own platform documentation puts the comfortable ceiling near 600 English words, against
 * a specification of roughly 2,500; fal, who host the model, put the consequence plainly — "if you
 * cram in more than the frame can hold, you can expect a few instructions to drop". That second line
 * is a host's observation rather than a vendor statement, and is marked as such because this
 * directory cites vendors everywhere else.
 *
 * So this is the one target told **what to sacrifice**. Nothing else needs that: a truncating
 * encoder cuts by position rather than by choice, and a model that reads the whole prompt has
 * nothing to drop. It points at the contract section's precedence list rather than restating it,
 * which keeps this from becoming a third copy of a rule the template already states twice.
 *
 * **It cites that section by name.** The numeral used to be written out here, which is a second
 * statement of a number the prompt body already derives — and a misdirected citation would send the
 * whole precedence order to the wrong block. `sections` comes from the walk that numbered the
 * headings, so a section added before the contract moves both at once.
 */
export function wrapForSeedream(prompt: string, sections: SectionNumbers): string {
  return `Plan the grid and the per-component cells before rendering: this is a layout brief, not a scene.
It is longer than one image can hold every detail of. If anything must be dropped, keep the
precedence order stated in section ${citeSection(sections, 'CONTRACT')} and drop surface detail first — never the component count,
the background, or a component’s stated direction.

${prompt}`;
}
