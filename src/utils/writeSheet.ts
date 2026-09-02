import type { SpriteBox, SpriteDuplicateGroup } from '../types/quantiser.ts';
import type { SheetFormat, WrittenSheet } from '../types/sheetFormat.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import type { ManifestSheet, SpriteManifest } from '../types/spriteManifest.ts';
import { encodeAseprite } from './encodeAseprite.ts';
import { encodePng } from './encodePng.ts';
import { encodeSpritePack } from './encodeSpritePack.ts';
import { packLayout } from './packLayout.ts';
import { scaleBoxes } from './sheetLayout.ts';
import { sheetToken } from './sheetToken.ts';
import { oversizedSprites, oversizeReason } from './spriteCell.ts';
import { buildManifest, encodeManifest } from './spriteManifest.ts';
import { upscaleNearest } from './upscaleNearest.ts';

/**
 * One download, from the quantised sheet to the bytes of the file that leaves the app.
 *
 * **The decision of which writer answers a press lives here rather than in the worker**, because it
 * is the only part of a download that is a decision: `sheetWriteWorker.ts` is a thread to run this
 * on, and everything it does apart from calling this is plumbing that must not vary by format. Both
 * halves of that are load-bearing — a branch in the thread would be a branch nothing tests without
 * a worker, and this way the writers stay reachable from a plain unit test.
 *
 * **Magnifying is part of writing.** The 1:1 result and a factor are what cross the thread boundary,
 * so the enlargement happens here beside the encode — the sprite boxes are scaled by the same factor
 * in the same call, which is what stops a file and its manifest describing one sheet at two
 * coordinates. The manifest formats skip the enlargement entirely: a description of the sheet needs
 * the size arithmetic, never the 67-megabyte allocation that producing the pixels would cost.
 *
 * **A cell that a sprite does not fit is refused here**, before any of the above runs. It is the one
 * thing a download can be turned down for that is not a property of the file format, and the refusal
 * is the whole point of it: a sprite larger than the stated cell is a sheet drawn at a coarser scale
 * than the prompt asked for, and squeezing it would hand a rig a piece whose pixels no longer line
 * up with any of its neighbours. The panel says the same thing before the press, from the same
 * reading — see `oversizedSprites`.
 *
 * Pure, as everything in this directory is — asynchronous only because the PNG writer waits on the
 * platform's compressor.
 */

/** A sheet to write, how far to magnify it, what to write it as, and what is known about it. */
export interface SheetWriteJob {
  /** The result at its own size; the magnification happens here. */
  readonly image: ImageData;
  /** `1` for the sheet at its own size. */
  readonly scale: number;
  readonly format: SheetFormat;
  /**
   * The sprites the segmentation found, in the 1:1 result's own coordinates.
   *
   * The frames an Aseprite document is cut into, the sprites a pack holds, and the rects a manifest
   * states. Empty where the sheet held nothing to cut. **Sent whatever the format is**, and read
   * only by the writers that have sprites: the press does not have to know which formats care.
   */
  readonly boxes: readonly SpriteBox[];
  /** The duplicate reading over those boxes, which the manifest turns into links between sprites. */
  readonly duplicates: readonly SpriteDuplicateGroup[];
  /** One name per component the studio's prompt asks for, or empty where it states no sheet. */
  readonly names: readonly string[];
  /**
   * The fixed cell every sprite is cut into, at 1:1, or `null` where each keeps its bounding box.
   *
   * Read by the two formats that describe sprites and ignored by the two that do not, in the way the
   * boxes above are: the press does not have to know which formats care. See `SpriteCell`.
   */
  readonly cell: SpriteCell | null;
  /** What the manifest calls the picture its rects are into, where that picture is a file of its own. */
  readonly imageName: string;
  /** The studio's configuration at the moment of the press, or `null` where it states no sheet. */
  readonly sheet: ManifestSheet | null;
  /**
   * The facing that tells this sheet apart from the rest of its batch, or `null` where none does.
   *
   * The first half of what a pack names its entries by and what the download is called — see
   * `sheetToken`, which falls back to {@link SheetWriteJob.sheet}'s ordinal where this is `null`.
   * Resolved by `sheetIdentity` rather than here, because it is a reading of the whole batch and not
   * of this one sheet. Sent whatever the format is, for the reason {@link SheetWriteJob.boxes} is.
   */
  readonly facing: string | null;
}

export async function writeSheet(job: SheetWriteJob): Promise<WrittenSheet> {
  const { image, scale, format, boxes, cell } = job;

  if (format === 'PNG') return encodePng(magnify(image, scale));
  if (format === 'ASEPRITE') return encodeAseprite(magnify(image, scale), scaleBoxes(boxes, scale));

  // Both remaining formats state cells, so the refusal is taken once rather than in each of them.
  // Measured at 1:1, where the reader stated the cell and the segmentation measured the boxes: the
  // magnification multiplies both, so it can neither create nor cure an overhang.
  if (cell !== null) {
    const over = oversizedSprites(boxes, cell);
    if (over.length > 0) throw new Error(oversizeReason(boxes, cell, over));
  }

  if (format === 'SPRITE_PACK') {
    // All three of a pack's entry kinds are named by the word that tells this sheet apart from the
    // rest of its batch, so that a batch expands into a tree an engine importer scans rather than
    // colliding: the sprites in a directory that word names, and the sheet and the manifest at the
    // archive root carrying it as a prefix. `sheetToken` decides the word — the same one the
    // download itself is named by — and `packLayout` says why the two root files are prefixed rather
    // than moved inside. Resolved here rather than inside the encoder because the manifest states
    // two of the three names itself, and one archive may not describe its own layout twice.
    const layout = packLayout(sheetToken(job.facing, job.sheet));
    return encodeSpritePack(
      magnify(image, scale),
      manifestFor(job, layout.sheetFile, layout.spriteDirectory),
      layout,
    );
  }

  // No directory: this manifest describes a PNG the reader downloads separately, so no sprite files
  // exist for one to hold.
  const manifest = manifestFor(job, job.imageName, null);
  return {
    format: 'MANIFEST',
    bytes: encodeManifest(manifest),
    sprites: manifest.sprites.length,
    named: manifest.named,
  };
}

/** The sheet at the size the file is written in. */
function magnify(image: ImageData, scale: number): ImageData {
  return scale === 1 ? image : upscaleNearest(image, scale);
}

/**
 * The manifest for this job, describing the file at the magnification it is written in.
 *
 * `image` and `spriteDirectory` differ between the two formats that build one and nothing else
 * does: inside a pack the sheet is a member of the archive under the name `packLayout` gave it and
 * the sprites sit in a directory beside it, while a manifest downloaded alone describes the PNG the
 * same press would have written — so it names that file instead, and has no sprite files to point
 * at.
 */
function manifestFor(job: SheetWriteJob, image: string, spriteDirectory: string | null): SpriteManifest {
  return buildManifest({
    image,
    spriteDirectory,
    width: job.image.width * job.scale,
    height: job.image.height * job.scale,
    scale: job.scale,
    boxes: job.boxes,
    duplicates: job.duplicates,
    names: job.names,
    cell: job.cell,
    sheet: job.sheet,
  });
}
