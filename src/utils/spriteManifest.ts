import type { SpriteBox, SpriteDuplicateGroup } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import type { ManifestSheet, ManifestSprite, SpriteManifest } from '../types/spriteManifest.ts';
import { scaleBoxes } from './sheetLayout.ts';
import { cellOffsets, cellPivot } from './spriteCell.ts';

/**
 * The written sheet described as data: where every sprite sits, what it is called, and which sheet
 * of which deliverable it came off.
 *
 * **The rects are the file's own**, not the 1:1 result's: segmentation runs before the download's
 * magnification, so both the boxes and the duplicate links are scaled here through `scaleBoxes`,
 * which is the same multiplication the Aseprite frames take. Doing it in one place is what stops the
 * manifest and the frames describing the same sprite at two different coordinates.
 *
 * **Names are attached only where the count matches.** The mapping from sprite to component is
 * positional — section 4 fixes the reading order, `componentSlots` expands the inventory into that
 * order — so it holds exactly while the sheet came back with the number of components it was asked
 * for. A sheet one component short would otherwise have every name after the gap describing the
 * wrong piece, silently, in a file a pipeline believes. Where the two disagree the sprites take
 * positional names and {@link SpriteManifest.named} says so.
 *
 * **A rect is always the artwork's own bounding box**, whatever the cut is. Where a cell was asked
 * for, the cell is stated once at the top and each sprite carries the displacement its box sits at
 * inside that cell — so a consumer compositing from the sheet does exactly what the pack does, and
 * the rect still describes a region of the sheet that holds this sprite and nothing a gutter away.
 * See `placeInCell`, which measured what widening the rect instead costs, and `SpriteCell` for why
 * a fixed cell is offered at all.
 *
 * Pure, as everything in this directory is.
 */

/** What the caller knows: the file, the sheet it holds, and what was read off it. */
export interface ManifestInput {
  /** The image the rects are into, as the pack names it beside this manifest. */
  readonly image: string;
  /** Where the pack puts the cut-out sprites, or `null` for a manifest written on its own. */
  readonly spriteDirectory: string | null;
  /** The written file's size, so a consumer needs nothing but this manifest to place a rect. */
  readonly width: number;
  readonly height: number;
  /** How far the file magnifies the quantised sheet. The boxes below are at 1:1. */
  readonly scale: number;
  /** The segmentation's boxes, in reading order, in the 1:1 result's coordinates. */
  readonly boxes: readonly SpriteBox[];
  /** The duplicate reading, in the same coordinates — empty where nothing was compared. */
  readonly duplicates: readonly SpriteDuplicateGroup[];
  /** One name per component the prompt asked for, or empty where the studio states no sheet. */
  readonly names: readonly string[];
  /**
   * The fixed cell each sprite is cut into, in the 1:1 result's own pixels, or `null` for the boxes.
   *
   * At 1:1 beside the boxes, and scaled with them, so the offset a sprite sits at inside its cell is
   * one placement magnified rather than a rounding that moves with the factor.
   *
   * **Every sprite must fit it**; `writeSheet` refuses the download otherwise, which is why nothing
   * here checks again. See `oversizedSprites`, which is the one reading that question is taken from.
   */
  readonly cell: SpriteCell | null;
  readonly sheet: ManifestSheet | null;
}

/** This manifest shape's version — see {@link SpriteManifest.version}, which is not a compatibility surface. */
export const MANIFEST_VERSION = 2;

/** A box as its own key, so a duplicate group's member can be found in the segmentation's list. */
function boxKey(box: SpriteBox): string {
  return `${String(box.left)},${String(box.top)},${String(box.width)},${String(box.height)}`;
}

/**
 * Which sprite each duplicate answers to, as the {@link ManifestSprite.index} of its canonical.
 *
 * **Matched by position rather than by identity**, because a duplicate group carries its own boxes:
 * the reading describes the sheet as it stood before any snap, and a snap rewrites pixels, which can
 * split or join a region. A member whose box the final segmentation no longer holds simply gets no
 * link — dropping it is the honest answer, where guessing at the nearest box would put a reference
 * to the wrong artwork into a file a packer acts on.
 */
function duplicateLinks(
  boxes: readonly SpriteBox[],
  duplicates: readonly SpriteDuplicateGroup[],
): ReadonlyMap<number, number> {
  const indexOf = new Map(boxes.map((box, index) => [boxKey(box), index]));
  const links = new Map<number, number>();

  for (const group of duplicates) {
    const canonical = indexOf.get(boxKey(group.canonical));
    if (canonical === undefined) continue;
    for (const member of group.duplicates) {
      const index = indexOf.get(boxKey(member.box));
      // Counting from one, as `ManifestSprite.index` does — a manifest states one numbering.
      if (index !== undefined) links.set(index, canonical + 1);
    }
  }
  return links;
}

export function buildManifest(input: ManifestInput): SpriteManifest {
  const { cell } = input;
  const boxes = scaleBoxes(input.boxes, input.scale);
  // Measured at 1:1 and then magnified, which is what keeps one placement across the rungs: floored
  // after scaling instead, an odd amount of slack would move the artwork a pixel off its anchor at
  // some rungs and not others, and the 1× file would stop being a clean magnification of itself.
  const offsets = cell === null ? null : cellOffsets(input.boxes, cell);
  // Linked at 1:1, where both the segmentation and the duplicate reading were measured — the keys
  // would still match after scaling, and this keeps the one multiplication above.
  const links = duplicateLinks(input.boxes, input.duplicates);
  const named = input.names.length === boxes.length;
  // Bottom-centre where no cell was asked for, which is the default `ManifestSprite.pivot`
  // describes — and the same arithmetic, so the two cuts cannot state one point two ways.
  const anchor = cell?.anchor ?? { x: 'CENTRE' as const, y: 'BOTTOM' as const };

  const sprites: readonly ManifestSprite[] = boxes.map((box, index) => ({
    index: index + 1,
    name: named ? (input.names[index] ?? '') : `sprite-${String(index + 1).padStart(2, '0')}`,
    x: box.left,
    y: box.top,
    width: box.width,
    height: box.height,
    // The anchor point of the box above — the foot of it, horizontally centred, where no cell was
    // asked for; see `ManifestSprite.pivot` for why that default and not another. Floored rather
    // than fractional, inside `cellPivot`: a pivot between two pixels is a half-pixel offset a
    // renderer resolves differently from an importer.
    pivot: cellPivot(box, anchor),
    // Stated beside the number rather than left to the documentation, because the number is the
    // whole of what a pipeline reads — and the two cuts genuinely differ here, which is the reason
    // this field is not a constant. See `PivotSource`.
    pivotSource: cell === null ? 'DEFAULT_BOTTOM_CENTRE' : 'CELL_ANCHOR',
    cellOffset: scaleOffset(offsets?.[index], input.scale),
    duplicateOf: links.get(index) ?? null,
  }));

  return {
    version: MANIFEST_VERSION,
    image: input.image,
    spriteDirectory: input.spriteDirectory,
    width: input.width,
    height: input.height,
    scale: input.scale,
    sheet: input.sheet,
    named,
    cell:
      cell === null
        ? null
        : {
            width: cell.width * input.scale,
            height: cell.height * input.scale,
            anchor: cell.anchor,
          },
    sprites,
  };
}

/**
 * One sprite's displacement inside its cell, at the magnification the file is written in.
 *
 * `null` where no cell was asked for, which is the same condition {@link SpriteManifest.cell} is
 * `null` under — the two are stated apart because one is per sprite and one is per file, and a
 * consumer reads them together.
 */
function scaleOffset(
  offset: { readonly x: number; readonly y: number } | undefined,
  scale: number,
): { x: number; y: number } | null {
  return offset === undefined ? null : { x: offset.x * scale, y: offset.y * scale };
}

/** The manifest as the bytes a `.json` file holds — two-space indented, so a person can read it. */
export function encodeManifest(manifest: SpriteManifest): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
}
