/**
 * The vocabulary of the post-generation quantiser — the one capability in this app that reads an
 * image rather than composing text.
 *
 * It exists because no prompt wording fixes the problem it addresses: models return smooth artwork
 * that has been downscaled far more often than true pixel art, however firmly the template asks
 * otherwise. Grid alignment and palette reduction *on the returned image* are the only guarantee,
 * because they are the only step that does not depend on a model complying.
 */

/**
 * One colour, channel by channel, each 0–255 as the canvas stores it.
 *
 * Alpha is a channel like the other three rather than a separate concern: it is what the histogram
 * keys on, what a box is split by when it is the widest, and what makes two otherwise-identical
 * pixels different colours. The one place it is privileged is `FULLY_TRANSPARENT`, which is excluded
 * from the palette entirely — see `colorHistogram`.
 */
export interface Rgba {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly a: number;
}

/**
 * The channels a colour is measured, split and compared across, in a fixed order.
 *
 * Here rather than beside either of the two functions that walk it, because both of them do —
 * `buildPalette` splits a box across its widest channel and `applyPalette` measures distance across
 * all four, and a second copy of the tuple would be a second answer to what a colour is made of.
 */
export const RGBA_CHANNELS = ['r', 'g', 'b', 'a'] as const;
export type RgbaChannel = (typeof RGBA_CHANNELS)[number];

/**
 * A pixel scale: the side of the square block that one *drawn* pixel occupies in the image.
 *
 * A 16 × 16 sprite delivered on a 128 × 128 canvas has a grid of 8. A grid of 1 says the image is
 * already at its own resolution and only the palette needs work.
 *
 * A named alias over `number`, which the compiler cannot tell apart from any other number — it is
 * documentation, not a check. It earns the name because the same quantity crosses five signatures
 * and "grid" alone reads as a layout, not a scale.
 */
export type PixelGrid = number;

/** An image the user has brought in, and the filename anything derived from it is named after. */
export interface ImportedImage {
  readonly name: string;
  readonly image: ImageData;
}

/**
 * A key colour and how far a pixel may sit from it and still count as background.
 *
 * One value rather than two loose arguments, because neither means anything alone: a colour with no
 * tolerance is the exact match that keys almost nothing on a real returned sheet, and a tolerance with
 * no colour is a radius around nothing. Carried together, `null` says keying does not run at all —
 * which is a state with two distinct causes (the user has not asked for it, or the studio's key is
 * `TRANSPARENT` and there is no colour to match) that the transform does not need to tell apart.
 */
export interface BackgroundKeying {
  readonly color: Rgba;
  /**
   * Euclidean distance across RGB, alpha ignored.
   *
   * Euclidean because `nearestColor` already defines what "how far apart are two colours" means in
   * this app, and a second metric would be a second answer to one question. RGB-only because a key
   * field is opaque by definition, so a pixel's own alpha says nothing about whether it is background.
   */
  readonly tolerance: number;
}

/** Everything `quantiseImage` needs beyond the image itself. */
export interface QuantiseSettings {
  readonly grid: PixelGrid;
  /** The background to remove, or `null` to leave every pixel where it is. */
  readonly key: BackgroundKeying | null;
  /**
   * How many colours the result may use, or `null` to leave the palette alone.
   *
   * `null` rather than a large number, because `UNRESTRICTED` means the palette step does not run at
   * all — a painted or 3D-rendered sheet has no colour budget to enforce, and reducing it to some
   * high figure anyway would still be a reduction.
   */
  readonly maxColors: number | null;
}

/** What came back: the transformed image, and the numbers that say what it did. */
export interface QuantiseResult {
  readonly image: ImageData;
  /** Distinct non-transparent colours in the source. */
  readonly colorsBefore: number;
  /** Distinct non-transparent colours in {@link image}. */
  readonly colorsAfter: number;
  /**
   * The fraction of the source the key removed, 0–1, and `0` where keying did not run.
   *
   * Reported because it is the one question this feature cannot answer from the preview: the sheet
   * that prompted the work had a *visibly* magenta field almost none of which was `#FF00FF`, and at
   * 1× in a 24rem frame a field that was missed looks exactly like a field that was keyed. The number
   * is what says which happened.
   *
   * Counts only pixels that arrived carrying some colour — any alpha above zero — and left fully
   * transparent, so a sheet that already had empty space does not inflate it with area the key never
   * touched.
   */
  readonly keyedShare: number;
}
