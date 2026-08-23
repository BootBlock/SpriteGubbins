import type { SpriteBox, SpriteDuplicateGroup } from '../types/quantiser.ts';
import type { ManifestSheet, ManifestSprite, SpriteManifest } from '../types/spriteManifest.ts';
import { scaleBoxes } from './sheetLayout.ts';

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
  const boxes = scaleBoxes(input.boxes, input.scale);
  // Linked at 1:1, where both the segmentation and the duplicate reading were measured — the keys
  // would still match after scaling, and this keeps the one multiplication above.
  const links = duplicateLinks(input.boxes, input.duplicates);
  const named = input.names.length === boxes.length;

  const sprites: readonly ManifestSprite[] = boxes.map((box, index) => ({
    index: index + 1,
    name: named ? (input.names[index] ?? '') : `sprite-${String(index + 1).padStart(2, '0')}`,
    x: box.left,
    y: box.top,
    width: box.width,
    height: box.height,
    // The foot of the box, horizontally centred — see `ManifestSprite.pivot` for why this default
    // and not another. Floored rather than fractional: a pivot between two pixels is a half-pixel
    // offset a renderer resolves differently from an importer.
    pivot: { x: Math.floor(box.left + box.width / 2), y: box.top + box.height },
    // Stated beside the number rather than left to the documentation, because the number is the
    // whole of what a pipeline reads. Every pivot this app writes is the default; see `PivotSource`,
    // which says what a measured one would take that this app does not have.
    pivotSource: 'DEFAULT_BOTTOM_CENTRE',
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
    sprites,
  };
}

/** The manifest as the bytes a `.json` file holds — two-space indented, so a person can read it. */
export function encodeManifest(manifest: SpriteManifest): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`);
}
