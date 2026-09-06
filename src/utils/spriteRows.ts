import type { SpriteBox } from '../types/quantiser.ts';

/**
 * The rows a sheet is read in, and the order that puts its sprites in.
 *
 * **One derivation of what a row is, because the app had two of them and they disagreed.** Section 4
 * of the prompt fixes the order the components are laid out in — "screen-left to screen-right, then
 * top to bottom" — and everything downstream of the segmentation names a sprite by its place in
 * that order: the manifest's `index`, every file name in a sprite pack, the oversize refusal, the
 * duplicate reading's canonical and the `.aseprite` frame sequence. `mergeNearby` used to answer it
 * by sorting on the exact `top` coordinate and `sheetLayout` by banding the boxes into rows, and the
 * two agree only where every sprite in a row shares an exact top edge. Generated art almost never
 * does, so one press-set wrote two files that named the same sprite differently — five of fifteen
 * on `test_sprites/armour.png`, and some row on seven of the eight sheets in that directory.
 *
 * **A row is a band of vertical overlap, not a shared coordinate.** A reader counting a sheet does
 * not measure top edges; they see a line of sprites and count along it, and a helmet drawn a pixel
 * lower than the one beside it is still the second one across. So a box joins the open row wherever
 * it reaches into the band that row occupies, and the band grows to include it — which is what lets
 * one tall sprite in the middle of a row hold the shorter ones on either side of it together.
 *
 * **Any overlap joins, and the band widens.** That is deliberately not the rule `spriteStrips` uses,
 * and the two are answering different questions rather than duplicating one. This one has to place
 * *every* sprite the sheet holds, exactly once, in an order a reader would agree with; that one is
 * looking for the runs whose pitch is worth fitting, so it narrows its band to half-overlap and
 * drops what is left under `SMALLEST_STRIP_FRAMES`. A rule that admits fewer boxes into a row
 * is right for a reading that may decline to answer and wrong for an ordering that may not.
 *
 * **It sorts its input rather than trusting it.** The scan order the labelling produces is what
 * makes the greedy walk below enough — a box that does not reach the open band cannot reach any band
 * opened before it — and a function whose answer depends on how its caller happened to order an
 * argument is how the two derivations came to part company in the first place.
 *
 * **It sorts a copy, and the copy is not tidiness.** `sheetLayout` is handed `SpriteSegmentation`'s
 * own box array whenever a download is written at 1×, because `scaleBoxes` returns its argument
 * unchanged at that scale — so sorting in place would reorder the list the store holds and the
 * preview draws its rings from, from inside a writer. The boxes themselves come back by reference:
 * there is nothing to gain by cloning them, and one set of box objects travelling the whole pipeline
 * is what lets `frameAlignment` exclude a frame's own box from the sheet's by object identity.
 *
 * Pure, and dominated by the one sort of its input — the banding walk and the per-row sort below it
 * are linear and near-linear in the boxes of a single row.
 */

/** One row of a sheet: the sprites on it, and the band of the sheet they occupy. */
export interface SpriteRow {
  /** Left to right, which is the order section 4 fixes within a row. Never empty. */
  readonly boxes: readonly SpriteBox[];
  /** The topmost edge of any box in the row. */
  readonly top: number;
  /** Exclusive — the first row of the sheet past the band. */
  readonly bottom: number;
}

/** The sheet's sprites gathered into rows, the rows top to bottom and each of them left to right. */
export function spriteRows(boxes: readonly SpriteBox[]): readonly SpriteRow[] {
  const scanned = [...boxes].sort((left, right) => left.top - right.top || left.left - right.left);

  const rows: { members: SpriteBox[]; top: number; bottom: number }[] = [];
  let open: { members: SpriteBox[]; top: number; bottom: number } | null = null;

  for (const box of scanned) {
    const bottom = box.top + box.height;
    if (open === null || box.top >= open.bottom) {
      open = { members: [box], top: box.top, bottom };
      rows.push(open);
      continue;
    }
    open.members.push(box);
    open.bottom = Math.max(open.bottom, bottom);
  }

  return rows.map((row) => ({
    boxes: [...row.members].sort((left, right) => left.left - right.left),
    top: row.top,
    bottom: row.bottom,
  }));
}

/**
 * The sheet's sprites in the one order section 4 fixes — the flat form of {@link spriteRows}.
 *
 * What `spriteSegments` hands back, so a consumer that only wants "the nth sprite" never has to know
 * a row exists. The rows themselves are what the `.aseprite` export needs, since a tag names a
 * contiguous run of frames and a row is that run.
 */
export function spriteReadingOrder(boxes: readonly SpriteBox[]): SpriteBox[] {
  return spriteRows(boxes).flatMap((row) => [...row.boxes]);
}
