import type { SpriteBox, SpriteDuplicateGroup } from '../types/quantiser.ts';
import { reachesAny } from './boxClearance.ts';
import { CHANNELS_PER_PIXEL, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

/**
 * Every near-duplicate sprite rewritten with the sprite its group is named after.
 *
 * The other half of what `duplicateSprites` finds: a reader who has just been told that three of
 * their eight facings are the same drawing usually wants them to *be* the same drawing. Two frames a
 * shade apart are two sets of palette entries, two atlas cells that could have been one, and — on an
 * animation strip — a flicker as the sheet plays. Snapping settles them onto one artwork, so what is
 * downloaded holds one drawing of each pose rather than several near-misses.
 *
 * **Each member is cleared and redrawn rather than block-copied**, because the relation admits
 * sprites of different extents and the member's own silhouette has to go with the rest of it. The
 * region written is the box covering both — the member's box and the canonical's extent laid at the
 * member's top-left corner, which is the same registration the comparison used. Inside it the
 * canonical's pixels are written where the canonical reaches, and transparency where it does not.
 *
 * **A member whose region would reach anything else on the sheet is left exactly as it was.** That
 * region can be larger than the box it replaces, so it can cross into a neighbour — and overwriting
 * a sprite nobody asked about is the one outcome a fold must never produce. The condition is the
 * segmentation's own: the region has to keep at least one clear pixel between itself and every other
 * sprite's box, and every accepted region before it, which is exactly the separation those boxes
 * already had. Anything closer is skipped, so the sheet keeps a repeat rather than losing a
 * neighbour. On a real sheet it does not arise — sprites sit in a gutter, and a canonical is at most
 * a pixel or two larger than the member it is folding.
 *
 * The result's own facts are re-read from what this returns rather than carried over from the sheet
 * it was measured on — see `quantiseImage`, which does the re-reading. That matters more here than
 * it would after a plain copy: a member that took a larger canonical has a larger box afterwards,
 * so the bounds the panel reports would otherwise describe a silhouette that is gone.
 *
 * **What comes back says how many members were actually folded**, not merely that the pass ran. A
 * sheet where every fold was skipped, and a sheet where the reader asked for a fold over a finding
 * with nothing in it, are the same sheet — and the panel has to be able to say so rather than
 * announcing an edit that did not happen.
 *
 * Pure: the source image is left exactly as it arrived, and a fresh one comes back. Every pixel read
 * comes from the source, so no fold can see another fold's output.
 */
export function snapDuplicates(
  image: ImageData,
  groups: readonly SpriteDuplicateGroup[],
  /** Every sprite on the sheet, as `spriteSegments` found them — what a write region must clear. */
  boxes: readonly SpriteBox[],
): { image: ImageData; folded: number } {
  const data = new Uint8ClampedArray(image.data);
  /** The regions already written, which a later one must keep clear of for the same reason. */
  const written: SpriteBox[] = [];

  for (const group of groups) {
    const { canonical } = group;
    for (const member of group.duplicates) {
      const region: SpriteBox = {
        left: member.box.left,
        top: member.box.top,
        width: Math.max(member.box.width, canonical.width),
        height: Math.max(member.box.height, canonical.height),
        pixels: 0,
      };
      if (region.left + region.width > image.width || region.top + region.height > image.height) continue;
      if (reachesAny(region, boxes, member.box) || reachesAny(region, written, null)) continue;

      for (let row = 0; row < region.height; row += 1) {
        const to = pixelOffset(image.width, region.left, region.top + row);
        const from =
          row < canonical.height ? pixelOffset(image.width, canonical.left, canonical.top + row) : -1;
        for (let column = 0; column < region.width; column += 1) {
          const at = to + column * CHANNELS_PER_PIXEL;
          if (from < 0 || column >= canonical.width) {
            // Past what the canonical covers: the member's own artwork is cleared rather than left,
            // or the fold would leave a fringe of the drawing it was meant to replace.
            data[at] = 0;
            data[at + 1] = 0;
            data[at + 2] = 0;
            data[at + 3] = FULLY_TRANSPARENT;
            continue;
          }
          const source = from + column * CHANNELS_PER_PIXEL;
          data[at] = image.data[source] ?? 0;
          data[at + 1] = image.data[source + 1] ?? 0;
          data[at + 2] = image.data[source + 2] ?? 0;
          data[at + 3] = image.data[source + 3] ?? 0;
        }
      }
      written.push(region);
    }
  }

  return { image: new ImageData(data, image.width, image.height), folded: written.length };
}
