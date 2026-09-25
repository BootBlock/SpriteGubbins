import type { PaletteLimit } from '../../types/output.ts';

/**
 * Colour, in the prose the prompt carries. The edge is in `outline.ts` and the light in
 * `lighting.ts`, each worded for the style it sits beside.
 *
 * v1 emitted these as `IDENTIFIER (parenthetical)`, which made the generator read an enum name it
 * had to interpret. v2 states the requirement instead — the identifier belongs in the app, not in
 * the prompt.
 */

/**
 * The colour budget, as section 2 states it.
 *
 * **A generator does not keep to it, and the line stays anyway** (#244). Across 27 sheets returned
 * for this app's prompts, all of them from GPT-5.6 Sol, none was drawn inside the budget it was
 * given — measured by recovering a 64-colour palette from each keyed sheet and pricing how far the
 * drawn pixels sit from it, against a control made by forcing a sheet from the same pack to 48
 * colours and resampling it — while the figure reached the image call on 9 of the 11 runs whose
 * composition could be read. So the wording is not what failed, and it needs no rewording to make
 * it land. It costs one line and is the only channel that could ever work. None of this is a
 * measurement of any other target.
 *
 * **Section 9 does not audit it either, on purpose.** Its native-grid check is the same kind of
 * pixel-level property asked of the same target in the same place, and all three sheets measured
 * against it missed the grid by three to five times its ceiling on the median row and up to eight
 * times on the worst (#247) — so a colour-count line would spend a deliberating target's attention
 * on a check the evidence predicts it will not run. That prediction is an inference from the grid
 * line, not a measurement of a colour check.
 *
 * What makes a budget true of a sheet is the Quantise tab, and `OUTPUT_TOOLTIPS.paletteLimit` is what
 * tells the reader so — which is where the fix for a sheet that came back in 90,000 colours belongs.
 */
export const PALETTE_TEXT: Readonly<Record<PaletteLimit, string>> = {
  STRICT_32_COLOR: 'Strict — 16 to 32 colours across the entire sheet',
  RESTRAINED_64_COLOR: 'Restrained — 32 to 64 colours across the entire sheet',
  EXPANDED_ALBEDO: 'Expanded albedo — controlled value bands with richer colour variation',
  UNRESTRICTED: 'Unrestricted — no colour budget to hold to',
};
