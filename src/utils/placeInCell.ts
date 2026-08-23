import { CHANNELS_PER_PIXEL, createImage, pixelOffset } from './imageData.ts';

/**
 * One sprite's own pixels, laid on a transparent cell of a stated size at a stated offset.
 *
 * **The step that makes a cell a canvas rather than a window.** Widening the rect and cutting the
 * sheet at it looks equivalent and is not: a sheet's sprites are laid out a gutter apart, so a cell
 * roomy enough for the largest of them reaches into its neighbours, and the sprite's own file comes
 * out with somebody else's artwork baked into the margin. Measured on the eight sheets in
 * `test_sprites/`, at the *tightest* cell every sprite fits — thirty of the thirty-one sprites on
 * `cyborg_healer.png` picked up foreign pixels that way, one of them 76,867 of them. Every cell
 * larger than that tightest one is worse. So the cut takes the bounding box, which is the artwork
 * and nothing else, and this places it.
 *
 * That is the same rule `boxClearance` states for the two passes that write past a box: crossing
 * into a neighbour, and overwriting a sprite nobody asked about, is the one outcome none of them may
 * produce.
 *
 * **The offset is given rather than derived**, because it is decided at 1:1 and magnified with
 * everything else — see `cellOffsets`. Recomputing it here from the magnified sizes would floor a
 * different quantity and put the artwork a pixel off its anchor at some rungs and not others.
 *
 * Rows outside the cell are not copied, so an offset that would hang the artwork over an edge is
 * clipped rather than allowed to write past the end of the array. Nothing produces one — the caller
 * refuses a sprite larger than the cell — and the clip is what keeps that a refusal rather than a
 * corrupted file.
 *
 * Row by row rather than pixel by pixel: a row is contiguous in both images, so this is one `set`
 * per row against four channel writes per pixel.
 *
 * Pure, as everything in this directory is.
 */
export function placeInCell(
  sprite: ImageData,
  cell: { readonly width: number; readonly height: number },
  offset: { readonly x: number; readonly y: number },
): ImageData {
  const placed = createImage(cell.width, cell.height);

  for (let row = 0; row < sprite.height; row += 1) {
    const y = offset.y + row;
    if (y < 0 || y >= cell.height) continue;

    const left = Math.max(0, offset.x);
    const right = Math.min(cell.width, offset.x + sprite.width);
    if (right <= left) continue;

    const from = pixelOffset(sprite.width, left - offset.x, row);
    const to = pixelOffset(cell.width, left, y);
    placed.data.set(sprite.data.subarray(from, from + (right - left) * CHANNELS_PER_PIXEL), to);
  }

  return placed;
}
