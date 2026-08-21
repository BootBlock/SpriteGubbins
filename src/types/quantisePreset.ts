import type { QuantiseTuning } from './quantiser.ts';

/**
 * Every dial on the Quantise tab, as one value — the pipeline's own {@link QuantiseTuning} plus the
 * three the tab has that the transform does not take directly.
 *
 * **It extends rather than restates**, and that is the whole point of the shape. `QuantiseTuning`
 * already names the twelve dials `quantiseImage` is handed; the tab has three more — the two keying
 * settings, which reach the pipeline as a `BackgroundKeying` rather than as fields, and the palette
 * snap, which reaches it inside a `ColorReduction`. Listing those twelve again here would be two lists
 * of the same dials free to drift, and a dial added to the pipeline's set — which is where a new
 * pipeline dial naturally lands — would silently not be saved. Extending means it is: the compiler
 * refuses it here, in `QUANTISE_DEFAULT_DIALS`, in `parseQuantiseDials` and in what
 * `saveQuantisePreset` stores, until each has been given an answer.
 *
 * **The whole set is workflow intent**, which is why `useQuantiseStore` carries all fifteen across
 * `setSource` and drops them only on `clear`. Which reading suits a sheet, how hard its contours
 * need rescuing, whether the background comes out and from how far — each is a judgement about the
 * *artwork's style*, and the sheet splitter hands back eight sheets in one style rather than eight
 * styles. The pixel grid is the opposite and falls with the sheet, because it is a measurement of
 * one image.
 *
 * **What a preset made from these leaves out is as much of the definition as what it holds.**
 *
 * - The **source sheet**, obviously — a preset is settings, not artwork.
 * - The **grid**, for the reason above: a preset carrying one would re-apply a scale nobody claimed
 *   applied to the sheet on screen, which is a confident result at the wrong size.
 * - The **locked palette**, because it is a specific sheet's colours rather than a setting: it names
 *   the file it was taken from and the studio setting it superseded. Saved into a preset it would be
 *   one sheet's output smuggled into a description of how to process any sheet. `paletteSnap` *is*
 *   here, because it is a dial — how near a locked colour a colour must sit — and it simply has
 *   nothing to reach while no palette is held.
 */
export interface QuantiseDials extends QuantiseTuning {
  /**
   * Whether the studio's background key is replaced with transparency.
   *
   * **Off by default, and opt-in.** Keying deletes pixels, and two of the four offered keys —
   * `PURE_WHITE` and `PURE_BLACK` — share their colour with real artwork, so a tolerance loose
   * enough to catch a drifting white field also takes the sheet's own highlights. Off by default
   * means that never happens to someone who did not ask for it.
   */
  readonly keyingEnabled: boolean;
  /** How far a pixel may sit from the key colour, as `keyDistanceSquared` measures that. */
  readonly keyTolerance: number;
  /**
   * How near a locked colour a colour must sit to be taken to it, from `PALETTE_SNAP_RANGE`.
   *
   * `0` is the pass not running, as every other dial's zero is: the lock reaches nothing. Read only
   * while a palette is locked.
   */
  readonly paletteSnap: number;
}

/**
 * A named set of dial positions the user has saved.
 *
 * The quantiser's twin of `PresetArchetype`, and separate from it on purpose: an archetype
 * describes a *subject to generate*, and this describes *how to read a raster that came back*. They
 * are saved on different tabs, at different points in the workflow, and neither is any use in the
 * other's place — a knight archetype says nothing about ink thresholds, and a set of dials says
 * nothing about what to draw.
 *
 * **There are no built-ins.** Every archetype ships with a library of them because a first-time
 * user has no idea what a good subject configuration looks like; the dials here already open at
 * defaults that were calibrated against a real sheet, so a "preset" offering a second set of
 * numbers with no sheet in front of it would be a guess wearing a recommendation's confidence.
 * What this exists for is the reader who has just spent ten minutes finding the settings that suit
 * *their* generator's output, and would like them again tomorrow.
 *
 * No `updatedAt` field, exactly as `PresetArchetype` has none: the SQLite table records a timestamp
 * so it can order the collection, and nothing above the backend has a use for the number itself.
 */
export interface QuantisePreset {
  readonly id: string;
  readonly name: string;
  /** The sentence the row carries, or empty for a preset that simply has none. */
  readonly description: string;
  readonly dials: QuantiseDials;
}
