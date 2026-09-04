import type { Rgba } from '../types/quantiser.ts';
import { FULLY_OPAQUE, fromHex, unpackColor } from './imageData.ts';

/**
 * The colours a palette is made of, from the two places one arrives in this app.
 *
 * A palette reaches the interface either as a **sheet the quantiser has settled** — read there, off
 * the histogram that pass takes anyway — or as a **list of hex**, which is how the machine palettes
 * in `src/constants/palettes/` are written down. Everything downstream of them wants one thing: an
 * ordered list of opaque colours, and the walk below is where the rules for that live.
 *
 * Pure, as everything in this directory is.
 */

/**
 * The colours a histogram was taken over, most-used first.
 *
 * **A histogram rather than an image**, because the one caller that wants this already has one:
 * `quantiseImage` reads `QuantiseResult.colors` off the same walk, and a second pass over a
 * 16.8-megapixel result to answer a second question about its colours would be one pass too many.
 * Everything that wants a settled sheet’s palette on the main thread takes
 * `QuantiseResult.paletteEntries`, which is this function’s answer carried on the result — the lock
 * panel, the export panel and the swatch writer all read that one list rather than each taking a
 * reading of their own.
 *
 * **Deduplicated across alpha, and returned opaque.** A palette is a statement about colour, and an
 * image’s alpha is a statement about its silhouette: the same fill appears at full coverage inside a
 * sprite and at a dozen partial coverages along its edge, and counting those as separate entries
 * would fill the palette with one colour many times over. That is why this list and
 * `QuantiseResult.colors` need not be the same length on an anti-aliased sheet — the count is of
 * distinct pixel values, this is of distinct colours — and why anything showing both has to say
 * which it is showing.
 *
 * Fully transparent pixels take no part, because `colorHistogram` leaves them out — a pixel
 * carrying no colour has no colour to name, so a sheet the keying took whole yields no entries at
 * all.
 *
 * Population order, ties broken by packed value, so the order is deterministic on every input. It is
 * what a swatch strip lists and what a written file carries, so the sheet’s dominant colours lead.
 */
export function paletteEntriesFrom(histogram: ReadonlyMap<number, number>): readonly Rgba[] {
  const counts = new Map<number, number>();
  for (const [packed, count] of histogram) {
    // The alpha byte off the end of the packing, leaving `0xRRGGBB` — the colour without its
    // coverage. `unpackColor` below turns it back into a full entry with `a` supplied.
    const color = Math.floor(packed / 256);
    counts.set(color, (counts.get(color) ?? 0) + count);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0] - right[0])
    .map(([color]) => unpackColor(color * 256 + FULLY_OPAQUE));
}

/**
 * A machine palette’s `#RRGGBB` entries as colours, in the machine’s own order.
 *
 * An entry that will not parse drops out rather than becoming black — `fromHex` is deliberately
 * strict, and the library’s own suite checks that every literal is written the way it expects. A
 * caller handed an empty list back has a palette it cannot honour, and each decides what to say
 * about that; nothing here invents a colour to fill the gap.
 */
export function fixedPaletteColors(entries: readonly string[]): readonly Rgba[] {
  return entries.map(fromHex).filter((entry): entry is Rgba => entry !== null);
}
