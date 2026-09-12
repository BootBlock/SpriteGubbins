import type { SheetSeries } from '../../types/components.ts';
import type { DirectionalMode } from '../../types/output.ts';
import type { FacingTuple } from './directionalViews.ts';

/**
 * The two shapes every plan table in this directory is written in, and the one helper that fills them.
 *
 * A leaf of its own because two tables are written in them and one reads the other: `modes.ts` holds
 * each category's standard plans and resolves an assembly base against `assemblyBases.ts`, which holds
 * the bases that draw something else — so neither can import the helper from the other without a cycle.
 */

/**
 * One pairing's series, as a function of the facings the user chose.
 *
 * A function rather than a constant because the directional plans are *written against* the chosen
 * facings — the entries name them, the counts multiply by them, and the eight-compass core splits
 * across two sheets — where every other plan ignores the argument: a run-list sheet's inventory is
 * written for one facing whichever set drives the runs.
 */
export type SeriesFor = (facings: FacingTuple) => SheetSeries;

/**
 * Which sheet modes can draw one assembly base, and the series each of them takes.
 *
 * **`Partial` because a gap is an answer**, at both levels this shape is used at. A category offers no
 * mode its subject cannot be drawn on — nothing on an interface rotates about a pivot — and a base
 * offers no mode that cannot draw the way it comes apart: a rigid object has no pivot either, so it has
 * no rig pieces to draw, and a nine-slice frame has no state library that stretches it.
 */
export type ModePlans = Readonly<Partial<Record<DirectionalMode, SeriesFor>>>;

/** A pairing whose sheets do not vary with the chosen facings. */
export function fixed(...series: SheetSeries): SeriesFor {
  return () => series;
}
