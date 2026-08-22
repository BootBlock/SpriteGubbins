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
 * nothing to drop. It points at section 0's precedence list rather than restating it, which keeps
 * this from becoming a third copy of a rule the template already states twice.
 */
export function wrapForSeedream(prompt: string): string {
  return `Plan the grid and the per-component cells before rendering: this is a layout brief, not a scene.
It is longer than one image can hold every detail of. If anything must be dropped, keep the
precedence order stated in section 0 and drop surface detail first — never the component count,
the background, or a component’s stated direction.

${prompt}`;
}
