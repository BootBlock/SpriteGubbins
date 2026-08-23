import { IDENTITY_CAPTURE_UNAVAILABLE } from '../constants/identityCapture.ts';
import type { BackgroundKeying, ImportedImage, QuantiseResult, Rgba } from '../types/quantiser.ts';

/**
 * Whether the identity lock may read the sheet the Quantise tab is holding, and which image that is.
 *
 * `READY` carries an {@link ImportedImage} rather than a bare `ImageData` because the capture names
 * the sheet in its confirmation, and the name belongs to the file the reader dropped rather than to
 * the transform of it. `UNAVAILABLE` carries the sentence rather than a code, because every one of
 * the three states is resolved by a different control on a different panel and the reason is the only
 * thing that says which.
 */
export type QuantisedSheetCapture =
  | { readonly kind: 'READY'; readonly sheet: ImportedImage }
  | { readonly kind: 'UNAVAILABLE'; readonly reason: string };

/**
 * The quantised result, offered to the identity lock — or the reason it cannot be.
 *
 * **It is the result that is offered, never the sheet that was dropped**, and that is the decision
 * this function exists to hold in one place. The palette segment states what the accepted sheet is
 * *made of*, and a generator's return is made of a resampler's noise: measured on
 * `test_sprites/armour.png`, the six colours read off the raw file are `#F503F8`, `#185B23`,
 * `#000000`, `#AB8D4E`, `#BDA15E`, `#FFFFFF` — two shades of one gold, and a near-magenta the exact
 * key match does not catch. Read off the quantised result of the same sheet they are `#000000`,
 * `#196125`, `#12461A`, `#8E743C`, `#AB8D4E`, `#E7C07B`: the colours the reader settled, which are
 * also the colours the palette lock will snap the next sheet onto. One statement, twice, rather than
 * a prompt and a pipeline describing the same series differently.
 *
 * **The unkeyed result is refused rather than read**, and the same measurement is why. With the
 * Quantise tab's keying off, the field survives the transform as a palette entry of its own — the
 * `#F503F8` above — and `identityPalette` excludes the key by exact RGB, deliberately, so it misses.
 * A palette led by the background key tells the generator the character is magenta, which is the
 * failure this whole segment exists to prevent, and nothing downstream would report it. The tolerant
 * match that would catch it belongs to the Quantise tab, where the reader can see in the preview what
 * it took out; guessing at one here would be that pass run blind. So the button says which control to
 * turn on instead.
 *
 * `studioKey` decides only whether keying was *possible*: `TRANSPARENT` names no colour, the tab's
 * keying pass cannot run at all, and the space between components is alpha already.
 *
 * Pure, which is what lets the three states be asserted without a store or a canvas. The caller reads
 * `source` and the latest settled answer out of the two quantise stores and hands them over; `result`
 * and `keyedAt` are the two halves of one answer, so they are read off the same one.
 */
export function quantisedSheetCapture(
  source: ImportedImage | null,
  result: QuantiseResult | null,
  keyedAt: BackgroundKeying | null,
  studioKey: Rgba | null,
): QuantisedSheetCapture {
  if (source === null) return { kind: 'UNAVAILABLE', reason: IDENTITY_CAPTURE_UNAVAILABLE.noSheet };
  if (result === null) return { kind: 'UNAVAILABLE', reason: IDENTITY_CAPTURE_UNAVAILABLE.noResult };
  if (keyedAt === null && studioKey !== null) {
    return { kind: 'UNAVAILABLE', reason: IDENTITY_CAPTURE_UNAVAILABLE.keyStillOn };
  }
  return { kind: 'READY', sheet: { name: source.name, image: result.image } };
}
