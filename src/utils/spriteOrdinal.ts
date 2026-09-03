/**
 * A sprite's place in the sheet's reading order, padded to sort in that order.
 *
 * **The ordinal leads every name a pack writes** — the entry a sprite's PNG takes in the archive,
 * and the positional name the manifest gives it where the sheet was not named — so that a file
 * listing, which is sorted lexically by every tool that produces one, comes out in the order the
 * sheet is read in. Padding is the whole of what buys that: unpadded, `10` sorts between `1` and
 * `2`, and the listing interleaves.
 *
 * **The width is derived from the count, and it has to be.** Both call sites used to pad to a
 * literal two digits, which is a width neither of them got from anything that bounds the sprite
 * count — and the count is bounded by `SCATTERED_SPRITE_CEILING`, which is 512. A sheet of a
 * hundred sprites or more therefore lost the property the padding exists for, with `100.png`
 * sorting between `10.png` and `11.png`; a tileset laid ten across and eleven down is an ordinary
 * sheet for the Quantise tab, which reads whatever the reader drops in. Widening the literal to
 * three would move the same defect to a thousand, so the width is `String(count).length` — the
 * narrowest that holds for this sheet, and one that cannot be outgrown.
 *
 * **One function, so the two names cannot part company.** The archive entry and the manifest's
 * positional name describe the same sprite, and a reader who matched them by their ordinals would
 * be reading a file the app had numbered two ways.
 *
 * Pure, as everything in this directory is.
 *
 * @param index The sprite's zero-based position in the segmentation's reading order.
 * @param count How many sprites the sheet holds, which is what decides the width.
 */
export function spriteOrdinal(index: number, count: number): string {
  return String(index + 1).padStart(String(count).length, '0');
}
