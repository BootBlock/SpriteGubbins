import type { Rgba } from '../types/quantiser.ts';
import type { BackgroundKey } from '../types/rendering.ts';

/**
 * The pixel colour each background key names, for measuring a returned sheet against.
 *
 * **This needs no exemption from the design-token rule, because it is not a UI value.** These are
 * channel numbers a *returned image* is compared against — operands for a pixel equality test, which
 * no CSS custom property could serve. Nothing here paints any part of the interface, and there is no
 * hex literal to exempt. `BACKGROUND_KEY_TEXT` states the same four keys as prompt prose, which is a
 * different job: that one is read by a model, this one by `identityPalette`. The two are pinned
 * together by a test, since nothing else would notice if a correction landed in only one of them.
 *
 * `TRANSPARENT` is `null` rather than a colour at zero alpha. `colorHistogram` already excludes
 * fully transparent pixels, so a transparent key needs no exclusion of its own — and giving it an
 * RGB would claim the field has a colour the sheet was never asked to draw.
 */
export const BACKGROUND_KEY_COLORS: Readonly<Record<BackgroundKey, Rgba | null>> = {
  MAGENTA_FF00FF: { r: 255, g: 0, b: 255, a: 255 },
  PURE_WHITE: { r: 255, g: 255, b: 255, a: 255 },
  PURE_BLACK: { r: 0, g: 0, b: 0, a: 255 },
  TRANSPARENT: null,
};
