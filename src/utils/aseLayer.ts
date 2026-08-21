import { ASEPRITE_BACKGROUND_LAYER_NAME, ASEPRITE_LAYER_NAME } from '../constants/aseprite.ts';
import { aseChunk } from './aseChunk.ts';
import { ByteWriter } from './byteWriter.ts';

/**
 * The one layer every file this app writes carries, and the one decision it takes.
 *
 * A quantised sheet is a single picture — the app has nothing that separates a sprite into an
 * outline layer and a fill layer — so a document with more than one layer would be inventing
 * structure the artwork does not have. One layer, every frame's cel on it.
 *
 * **A sheet with no transparency is written as a *background* layer, and that is a correctness
 * matter rather than a nicety.** The file header names one palette entry as the transparent colour,
 * and this writer always names entry 0 because `indexImage` sorts the palette by ascending alpha and
 * so puts a keyed sheet's transparent entry first. On a sheet that carries no transparency at all
 * there is no such entry, and entry 0 is an ordinary colour — usually the darkest one — which a
 * normal layer would then render as holes. The specification says the transparent-index field
 * applies to "all non-background layers", so a background layer is exactly the state in which entry
 * 0 means what it says. A fully opaque sheet is also the one this can happen to: `spriteSegments`
 * reports such a sheet as `SOLID` and finds no boxes on it, so it is written as a single cel covering
 * the whole canvas, which is what a background layer is for.
 *
 * Pure, as everything in this directory is.
 */

/** Layer chunk (0x2004). */
const LAYER_CHUNK = 0x2004;

/** Visible, editable, and — for a sheet with nothing transparent on it — the background. */
const VISIBLE = 1;
const EDITABLE = 2;
const BACKGROUND = 8;

/** Layer type 0: an ordinary image layer, as opposed to a group or a tilemap. */
const IMAGE_LAYER = 0;

/** Blend mode 0 and full opacity — one layer has nothing to blend with. */
const NORMAL_BLEND = 0;
const FULLY_OPAQUE = 255;

export function aseLayerChunk(background: boolean): Uint8Array<ArrayBuffer> {
  return aseChunk(
    LAYER_CHUNK,
    new ByteWriter(32)
      .u16(VISIBLE | EDITABLE | (background ? BACKGROUND : 0))
      .u16(IMAGE_LAYER)
      // Child level 0: there is no group above it to be nested in.
      .u16(0)
      // The default layer size, which the specification marks as ignored on read.
      .u16(0)
      .u16(0)
      .u16(NORMAL_BLEND)
      .u8(FULLY_OPAQUE)
      .zeros(3)
      .text(background ? ASEPRITE_BACKGROUND_LAYER_NAME : ASEPRITE_LAYER_NAME)
      .toBytes(),
  );
}
