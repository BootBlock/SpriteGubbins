import type { SpriteBox, SpriteDuplicateGroup } from '../types/quantiser.ts';
import { bordersArtwork } from './bordersArtwork.ts';
import { reachesAny } from './boxClearance.ts';
import { FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';
import { alphaProfile } from './alphaProfile.ts';
import { registerSprites } from './registerSprites.ts';
import { sameBox } from './sameBox.ts';

/**
 * Every member of a duplicate group rewritten with the group's source.
 *
 * The other half of what `duplicateSprites` finds: a reader who has just been told that three of
 * their eight facings are the same drawing usually wants them to *be* the same drawing. Two frames a
 * shade apart are two sets of palette entries, two atlas cells that could have been one, and — on an
 * animation strip — a flicker as the sheet plays. Snapping settles them onto one artwork, so what is
 * downloaded holds one drawing of each pose rather than several near-misses.
 *
 * **The source is the group's medoid, not the sprite it is named after** — see `groupMedoid`. The
 * earliest sprite is only the first one drawn, and folding from it wrote any flaw it carried into
 * every copy. So the canonical is rewritten like any other member wherever it is not the source.
 *
 * **Each member is cleared and redrawn rather than block-copied**, because the relation admits
 * sprites of different extents and the member's own silhouette has to go with the rest of it. The
 * region written is the box covering both — the member's box and the source laid where it matches
 * the member best, which is the registration the comparison judged the pair at (see
 * `registerSprites`). So a member that gained a pixel on its left edge takes the source one column
 * in from its corner, where the drawing is, rather than a column off. Inside the region the source's
 * pixels are written where the source reaches, and transparency where it does not.
 *
 * **A member whose region would reach anything else on the sheet is left exactly as it was.** That
 * region can be larger than the box it replaces, so it can cross into a neighbour — and overwriting
 * a sprite nobody asked about is the one outcome a fold must never produce. Nor may it land close
 * enough for the next segmentation to merge a neighbour into the member, which would change the
 * sprite count as surely. The condition is therefore the segmentation's own merge rule: the region
 * has to sit further than `gap` from every other sprite's box, and from every accepted region before
 * it — the separation the segmentation already found between those boxes, since it would otherwise
 * have merged them — and no drawn pixel may sit directly against it, since a speck the fold joined
 * would carry the member's box past the region (see `bordersArtwork`). Anything closer is skipped, so the sheet keeps a repeat rather than losing a
 * neighbour. On a real sheet it does not arise — sprites sit in a gutter, and a source is at most a
 * pixel or two larger than the member it is folding.
 *
 * The result's own facts are re-read from what this returns rather than carried over from the sheet
 * it was measured on — see `quantiseImage`, which does the re-reading. That matters more here than
 * it would after a plain copy: a member that took a larger source has a larger box afterwards,
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
  /** The sprite gap `boxes` were merged within, which a write region must stay further than. */
  gap: number,
): { image: ImageData; folded: number } {
  const data = new Uint8ClampedArray(image.data);
  /** The regions already written, which a later one must keep clear of for the same reason. */
  const written: SpriteBox[] = [];

  for (const group of groups) {
    const { source } = group;
    const sourceProfile = alphaProfile(image, source);
    // Every member but the source, the canonical included, in reading order.
    const members = [group.canonical, ...group.duplicates.map((member) => member.box)].filter(
      (box) => !sameBox(box, source),
    );
    for (const box of members) {
      // Where the source's top-left corner lands on the sheet, and the box covering both.
      const { shift } = registerSprites(
        image,
        { box, profile: alphaProfile(image, box) },
        { box: source, profile: sourceProfile },
      );
      const placed = { left: box.left + shift.x, top: box.top + shift.y };
      const left = Math.min(box.left, placed.left);
      const top = Math.min(box.top, placed.top);
      const region: SpriteBox = {
        left,
        top,
        width: Math.max(box.left + box.width, placed.left + source.width) - left,
        height: Math.max(box.top + box.height, placed.top + source.height) - top,
        pixels: 0,
      };
      if (left < 0 || top < 0 || left + region.width > image.width || top + region.height > image.height) {
        continue;
      }
      if (bordersArtwork(image, region)) continue;
      if (reachesAny(region, boxes, box, gap) || reachesAny(region, written, null, gap)) continue;

      for (let row = region.top; row < region.top + region.height; row += 1) {
        const sourceRow = row - placed.top;
        for (let column = region.left; column < region.left + region.width; column += 1) {
          const at = pixelOffset(image.width, column, row);
          const sourceColumn = column - placed.left;
          if (
            sourceRow < 0 ||
            sourceRow >= source.height ||
            sourceColumn < 0 ||
            sourceColumn >= source.width
          ) {
            // Past what the source covers: the member's own artwork is cleared rather than left,
            // or the fold would leave a fringe of the drawing it was meant to replace.
            data[at] = 0;
            data[at + 1] = 0;
            data[at + 2] = 0;
            data[at + 3] = FULLY_TRANSPARENT;
            continue;
          }
          const read = pixelOffset(image.width, source.left + sourceColumn, source.top + sourceRow);
          data[at] = image.data[read] ?? 0;
          data[at + 1] = image.data[read + 1] ?? 0;
          data[at + 2] = image.data[read + 2] ?? 0;
          data[at + 3] = image.data[read + 3] ?? 0;
        }
      }
      written.push(region);
    }
  }

  return { image: new ImageData(data, image.width, image.height), folded: written.length };
}
