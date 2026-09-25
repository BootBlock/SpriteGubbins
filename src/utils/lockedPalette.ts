import type { Rgba } from '../types/quantiser.ts';
import { remapColors } from './imageData.ts';
import { type MutableOklab, type Oklab, srgbToOklab, srgbToOklabInto } from './oklab.ts';
import { type OklabLattice, oklabLattice } from './oklabLattice.ts';

/**
 * Redrawing a sheet in the colours a previous one was locked at.
 *
 * **The colours themselves are not taken here.** A lock holds `QuantiseResult.paletteEntries`,
 * which the transform already read off the finished sheet — the entries are the contract between
 * the two halves of this feature, so a second reading taken on the main thread would be a second
 * answer to what counts as one colour, and is how a locked palette comes to hold thirty entries the
 * panel calls twenty-seven. Alpha is where that bites: a result carries the same green at several
 * coverages along an anti-aliased edge, and those are one colour, not five. `paletteEntries` says
 * why it is carried on the result rather than measured where it is wanted.
 *
 * A result with no entries locks nothing rather than an empty palette: an empty lock would map
 * every colour onto no colour at all, which {@link applyLockedPalette} would have to answer by
 * returning the sheet unchanged — a lock that silently does nothing while the panel says one is
 * held. `PaletteLockControls` holds the button shut in that state and names the reason, which it
 * can do because the entries are a prop rather than something a press discovers.
 *
 * **Distance is measured in scaled OKLab**, as every colour gate in this tab now is — see
 * `oklab.ts`. It is not a refinement here but the whole mechanism: the lock's job is to decide
 * whether the green this sheet produced *is* the green the last sheet was locked at, and the RGB
 * cube answers that question differently in the darks than in the lights, so one escape distance
 * could never mean one thing across a sheet.
 */

/**
 * The image with every pixel taking its nearest locked colour, unless it sits further than `escape`
 * from all of them.
 *
 * **The pixel keeps its own alpha**, as `applyRgbPalette` does and for the same reason: the entries
 * were made opaque when they were locked, so writing one whole would flatten every anti-aliased or
 * soft-keyed edge of *this* sheet to the coverage of a different one. What a lock fixes is colour.
 *
 * **`snap` is how far the lock's reach extends**, and what lies beyond it is a colour the locked
 * sheet did not have. A series is not always the same palette twice — a later sheet introduces a
 * gem, a flame, a faction colour — and taking that to the nearest locked entry would be the lock
 * destroying the artwork it exists to keep consistent. So a colour further than `snap` from every
 * entry keeps exactly the colour it arrived with, and the dial that sets it runs from `0`, where
 * the lock reaches nothing and the sheet passes through untouched, upward. It is monotone in the
 * obvious direction: every colour snapped at one setting is snapped at every higher one.
 *
 * Fully transparent pixels are copied through untouched, and the decision is taken once per distinct
 * colour rather than once per pixel — both are `remapColors`, which every colour transform in this
 * directory shares.
 */
export function applyLockedPalette(image: ImageData, entries: readonly Rgba[], snap: number): ImageData {
  const reach = lockReach(entries, snap);

  return remapColors(image, (color) => {
    const entry = lockedEntryFor(color, reach);
    return entry === null ? color : { r: entry.r, g: entry.g, b: entry.b, a: color.a };
  });
}

/** One locked colour, where it sits, and its place in the lock, which is what settles a tie. */
interface RankedEntry {
  readonly entry: Rgba;
  readonly lab: Oklab;
  readonly rank: number;
}

/**
 * A lock's entries filed for lookup at one snap distance, or `null` where the snap reaches nothing.
 *
 * Filed on `oklabLattice` in cells of the snap distance, so a lookup measures only the entries that
 * could be within reach. A lock holds up to `MAX_PALETTE_ENTRIES` colours, and a later sheet at a grid
 * of 1 can carry hundreds of thousands of distinct ones, so a scan of every entry per colour is what
 * made a transform take half a minute. Built once per transform and shared by `ditherImage`, which asks
 * the same question of the same palette: is this colour inside the lock's reach, and of which entry.
 *
 * A snap of `0` reaches nothing, as the dial says. The only colours it could take are ones already
 * identical to an entry, which it would write back unchanged.
 */
export interface LockReach {
  readonly entries: OklabLattice<RankedEntry>;
  readonly limit: number;
}

export function lockReach(entries: readonly Rgba[], snap: number): LockReach | null {
  if (!(snap > 0)) return null;
  const lattice = oklabLattice<RankedEntry>(snap);
  entries.forEach((entry, rank) => {
    const lab = srgbToOklab(entry.r, entry.g, entry.b);
    lattice.add(lab, { entry, lab, rank });
  });
  return { entries: lattice, limit: snap * snap };
}

// The lookup's scratch, reused rather than allocated per call, because it runs once per distinct
// colour of a sheet that may carry hundreds of thousands.
const TARGET: MutableOklab = { L: 0, a: 0, b: 0 };
const NEARBY: RankedEntry[] = [];

/**
 * The locked entry a colour is taken to, or `null` where it sits further than the snap distance from
 * all of them.
 *
 * The same answer {@link nearestOklab} gives with the threshold applied after it, tie included: the
 * lattice visits cells in no set order, so the earlier entry is chosen by its rank rather than by
 * when it was met. Colour only, coverage left out, for the reason `nearestOklab` states.
 */
export function lockedEntryFor(color: Rgba, reach: LockReach | null): Rgba | null {
  if (reach === null) return null;
  srgbToOklabInto(TARGET, color.r, color.g, color.b);
  reach.entries.near(TARGET, NEARBY);
  let best: RankedEntry | null = null;
  let shortest = reach.limit;

  for (const candidate of NEARBY) {
    const dL = TARGET.L - candidate.lab.L;
    const dA = TARGET.a - candidate.lab.a;
    const dB = TARGET.b - candidate.lab.b;
    const distance = dL * dL + dA * dA + dB * dB;
    if (distance > shortest) continue;
    if (distance < shortest || best === null || candidate.rank < best.rank) {
      best = candidate;
      shortest = distance;
    }
  }

  return best === null ? null : best.entry;
}

/** One locked colour and where it sits in scaled OKLab — the form {@link nearestOklab} searches. */
export interface LocatedEntry {
  readonly entry: Rgba;
  readonly lab: Oklab;
}

/**
 * The entries converted once, rather than once per colour looked up, for {@link nearestOklab}.
 *
 * `antiAlias` is the caller: it wants the nearest entry however far away it is, which a lattice cell
 * cannot bound, and its set is capped at `MAX_PALETTE_ENTRIES` so the scan stays affordable. A lock
 * asks a bounded question and is answered by {@link lockReach} instead.
 */
export function locateEntries(entries: readonly Rgba[]): readonly LocatedEntry[] {
  return entries.map((entry) => ({ entry, lab: srgbToOklab(entry.r, entry.g, entry.b) }));
}

/**
 * The entry closest to a colour in scaled OKLab, with the squared distance it won at.
 *
 * Squared, because the caller compares it with a squared threshold: the square root would be one per
 * distinct colour of a sheet and would change no comparison, distance being monotonic in its square.
 * The earliest entry takes a tie, which under `paletteEntriesFrom`'s population order means the
 * more-used of two equidistant colours wins.
 *
 * **Colour only, coverage left out**, as the lock itself is: the entries were made opaque when they
 * were taken, so a pixel's own alpha says nothing about which of them it is.
 */
export function nearestOklab(
  source: Rgba,
  located: readonly LocatedEntry[],
): { entry: Rgba; distance: number } | null {
  const color = srgbToOklab(source.r, source.g, source.b);
  let chosen: Rgba | null = null;
  let shortest = Infinity;

  for (const { entry, lab } of located) {
    const dL = color.L - lab.L;
    const dA = color.a - lab.a;
    const dB = color.b - lab.b;
    const distance = dL * dL + dA * dA + dB * dB;
    if (distance < shortest) {
      shortest = distance;
      chosen = entry;
    }
  }

  return chosen === null ? null : { entry: chosen, distance: shortest };
}
