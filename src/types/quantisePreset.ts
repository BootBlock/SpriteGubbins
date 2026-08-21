import type { DitherPattern, VoteMethod } from './quantiser.ts';

/**
 * Every dial on the Quantise tab, as one value.
 *
 * The tab's controls were reachable only one at a time — `setVote`, `setColorMerge`, thirteen
 * actions with nothing naming the set they belong to. That is right for a control changing one
 * thing, and it leaves no way to say "these settings" at all, which is what a preset is. So the
 * dials are named here once and `useQuantiseStore` holds exactly this shape alongside the two
 * things that are *not* dials.
 *
 * **What it deliberately leaves out is as much of the definition as what it holds.**
 *
 * - The **source sheet**, obviously — a preset is settings, not artwork.
 * - The **grid**, because it is a measurement of one particular image. The store already drops it
 *   on `setSource` for that reason, and a preset that carried one would re-apply a scale nobody
 *   claimed applied to the sheet on screen — a confident result at the wrong size.
 * - The **locked palette**, because it is a specific sheet's colours rather than a setting: it
 *   names the file it was taken from and the studio setting it superseded. Saved into a preset it
 *   would be one sheet's output smuggled into a description of how to process any sheet, and
 *   loading the preset a month later would repaint an unrelated series in it. `paletteSnap` *is*
 *   here, because it is a dial — how near a locked colour a colour must sit — and it simply has
 *   nothing to reach while no palette is held.
 */
export interface QuantiseTuning {
  readonly keyingEnabled: boolean;
  readonly keyTolerance: number;
  readonly vote: VoteMethod;
  readonly outlineExpansion: number;
  readonly lineStrength: number;
  readonly trimStrength: number;
  readonly inkThreshold: number;
  readonly fillCleanup: number;
  readonly colorMerge: number;
  readonly cleanupPasses: number;
  readonly dither: DitherPattern;
  readonly paletteSnap: number;
  readonly spriteGap: number;
}

/**
 * A named set of dial positions the user has saved.
 *
 * The quantiser's twin of `PresetArchetype`, and separate from it on purpose: an archetype
 * describes a *subject to generate*, and this describes *how to read a raster that came back*. They
 * are saved on different tabs, at different points in the workflow, and neither is any use in the
 * other's place — a knight archetype says nothing about ink thresholds, and a tuning says nothing
 * about what to draw.
 *
 * **There are no built-ins.** Every archetype ships with a library of them because a first-time
 * user has no idea what a good subject configuration looks like; the dials here already open at
 * defaults that were calibrated against a real sheet, so a "preset" offering a second set of
 * numbers with no sheet in front of it would be a guess wearing a recommendation's confidence.
 * What this exists for is the reader who has just spent ten minutes finding the settings that suit
 * *their* generator's output, and would like them again tomorrow.
 *
 * No `updatedAt` field, exactly as `PresetArchetype` has none: the backends record a timestamp so
 * they can order the collection, and nothing above them has a use for the number itself.
 */
export interface QuantisePreset {
  readonly id: string;
  readonly name: string;
  /** The sentence the card carries, or empty for a preset that simply has none. */
  readonly description: string;
  readonly tuning: QuantiseTuning;
}
