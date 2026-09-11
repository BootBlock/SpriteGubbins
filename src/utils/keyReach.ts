import { DEFAULT_KEY_TOLERANCE } from '../constants/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';
import { keyBasis, keyDistanceSquared } from './keyDistance.ts';

/**
 * Whether a colour is one the background key takes with it — asked by the compiled prompt before it
 * offers a component any colour at all.
 *
 * Section 0 fixes the background as the key colour, and the Quantise tab removes that field by
 * **distance**, not by equality: `keyBackground` marks every pixel within the tolerance of the key,
 * wherever it sits on the sheet. So a component drawn in the key colour is not merely hard to cut
 * out, it is cut away, and so is a component drawn in a colour near enough to it — the ZX Spectrum's
 * dim magenta `#D800D8`, the NES's `#F878F8` and CGA's `#FF55FF` all fall inside the recommended
 * magenta's field, and PICO-8's `#FFF1E8` inside a white one. A palette that lists any of them tells
 * the generator a component may wear a colour the reader's own next step will delete.
 *
 * **This is `keyBackground`'s field pass, asked of one colour**, and it has to be that rather than a
 * second threshold: the prompt's promise is only worth making if it is the same answer the tab
 * reaches. `keyReach.test.ts` holds the two together over every entry of every fixed palette.
 *
 * **At {@link DEFAULT_KEY_TOLERANCE}, because the prompt is composed before any sheet exists.** The
 * tab opens at that rung, so it is the one position the prompt can know the reader will meet. A
 * reader who lowers the dial gets some of these colours back, and one who raises it loses more —
 * the prompt cannot follow a dial on a sheet it has not seen, and this is where the two part company.
 *
 * **The fringe pass is deliberately not asked.** It reaches only a pixel beside the field, so the
 * most it costs a component is the outermost pixel of its silhouette, and `KEY_TINT_OFF_HUE` names
 * the three colours on the key's own hue that it takes there along with the rung that returns them.
 * Withholding a colour from every component to save one pixel of edge would cost a sixteen-colour
 * palette a whole entry for a loss the tab already lets the reader undo.
 */
export function keyReaches(key: Rgba, color: Rgba): boolean {
  const pixel = new Uint8ClampedArray([color.r, color.g, color.b, color.a]);
  return keyDistanceSquared(pixel, 0, keyBasis(key)) <= DEFAULT_KEY_TOLERANCE * DEFAULT_KEY_TOLERANCE;
}
