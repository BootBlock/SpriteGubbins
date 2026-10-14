import type { Rgba } from '../types/quantiser.ts';
import { FULLY_OPAQUE } from './imageData.ts';
import { nearestPointSearch } from './nearestPointSearch.ts';

/**
 * A search for the palette entry closest to a colour: squared distance across all four channels,
 * the earliest entry taking a tie — and **an opaque colour taking only an opaque entry**, wherever
 * the palette holds one.
 *
 * Built once per palette and asked once per distinct colour, because "which palette entry does this
 * colour belong to" is asked three times — by `applyPalette` and `applyRgbPalette`, to redraw a
 * pixel, and by `identityPalette`, to total how much of the image each entry speaks for. Three
 * distance loops would be three answers to one question, and the tie-break is the half that would
 * quietly diverge.
 *
 * **Why an opaque colour is held to the opaque entries.** A budget's palette holds real pixels of
 * the sheet, soft edges among them, and `applyPalette` writes the entry it finds whole — alpha and
 * all. Measured across four channels alone, an opaque pixel sits nearer a translucent entry of its
 * own hue than an opaque entry of the next hue along: `(140, 0, 0, 255)` is 25 from
 * `(140, 0, 0, 230)` and 60 from `(200, 0, 0, 255)`, and took the first, which punched a hole in
 * the sprite. A pixel inside a sprite has no nearness in opacity — any alpha under 255 is a hole
 * whatever its size — so its colour is matched on RGB among the opaque entries, and the alpha is
 * the one it had. A translucent colour keeps the four-channel measure over every entry, because its
 * alpha is a measured coverage, where a near one is a good answer. `mixingPlan` keeps the same rule
 * for the dithered palette step, which writes a budget's entries whole too. Only a palette with no
 * opaque entry at all leaves an opaque colour to the four-channel measure, since then there is no
 * better answer to give.
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
  const anyEntry = searchOver(palette);
  const opaque = palette.filter((entry) => entry.a === FULLY_OPAQUE);
  // Kept in palette order, so the earliest opaque entry still takes a tie among the opaque ones.
  const opaqueEntry = opaque.length === 0 ? anyEntry : searchOver(opaque);
  return (color) => (color.a === FULLY_OPAQUE ? opaqueEntry : anyEntry)(color);
}

/** The four-channel search over one list of entries. */
function searchOver(entries: readonly Rgba[]): (color: Rgba) => Rgba | null {
  const nearest = nearestPointSearch(entries.map((entry) => [entry.r, entry.g, entry.b, entry.a]));
  // `entries[-1]` is undefined, so an empty list answers null here too.
  return (color) => entries[nearest(color.r, color.g, color.b, color.a)] ?? null;
}
