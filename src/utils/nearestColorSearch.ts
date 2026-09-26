import type { Rgba } from '../types/quantiser.ts';
import { nearestPointSearch } from './nearestPointSearch.ts';

/**
 * A search for the palette entry closest to a colour: squared distance across all four channels,
 * the earliest entry taking a tie.
 *
 * Built once per palette and asked once per distinct colour, because "which palette entry does this
 * colour belong to" is asked three times — by `applyPalette` and `applyRgbPalette`, to redraw a
 * pixel, and by `identityPalette`, to total how much of the image each entry speaks for. Three
 * distance loops would be three answers to one question, and the tie-break is the half that would
 * quietly diverge.
 *
 * **Why an index rather than a loop over the list.** The loop this replaces read every entry
 * through string-keyed properties, once per distinct colour, and on `armour.png` it was most of the
 * palette step's cost, growing with the palette. The index redrew the same sheet five times faster at
 * a budget of 64 and over twenty times faster at 256, with the same output, and its cost barely moves
 * with the palette's size. How it prunes is `nearestPointSearch`'s, which this asks with the entries'
 * four bytes as the four axes.
 *
 * **The answer is the brute force's, exactly**, earliest entry and all.
 * `tests/nearest-color-search-corpus.test.ts` holds it to the brute force over every colour of the
 * reference sheet.
 */
export function nearestColorSearch(palette: readonly Rgba[]): (color: Rgba) => Rgba | null {
  const nearest = nearestPointSearch(palette.map((entry) => [entry.r, entry.g, entry.b, entry.a]));
  // `palette[-1]` is undefined, so an empty palette answers null here too.
  return (color) => palette[nearest(color.r, color.g, color.b, color.a)] ?? null;
}
