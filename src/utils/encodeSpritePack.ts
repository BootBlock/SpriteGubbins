import type { ManifestPlacement, ManifestSprite, SpriteManifest } from '../types/spriteManifest.ts';
import type { WrittenSpritePack } from '../types/sheetFormat.ts';
import { cropSprite } from './cropSprite.ts';
import { encodePng } from './encodePng.ts';
import type { PackLayout } from './packLayout.ts';
import { placeInCell } from './placeInCell.ts';
import { resampleArea } from './resampleArea.ts';
import { sheetColourHold } from './sheetColourHold.ts';
import { encodeManifest } from './spriteManifest.ts';
import { spriteOrdinal } from './spriteOrdinal.ts';
import { zipArchive } from './zipArchive.ts';
import type { ZipEntry } from './zipArchive.ts';

/**
 * The sheet, every sprite on it, and the manifest that says which is which — as one archive.
 *
 * **This is the step the app used to leave to the reader.** A quantised sheet left as one picture,
 * and the boxes the tab had already found — drawn in the preview, counted in the panel, cut into
 * Aseprite frames — never left with it, so the first thing anyone did with the download was find
 * those same boundaries again by hand. The pack is the whole answer to that: the sheet as it would
 * have been downloaded, one indexed PNG per sprite, and the manifest naming them.
 *
 * **All three are the same artwork, so all three come from the same bytes.** The sprite PNGs are cut
 * from the magnified sheet this function is handed rather than from the 1:1 result, and the manifest
 * states the boxes at that same magnification — the alternative is three descriptions of one sheet
 * that agree until someone chooses a magnification.
 *
 * **A sprite is cut at the rect the manifest states, and at no other**, transparent corners
 * included: it is what the preview ringed and what the manifest states, and trimming here would give
 * one sprite two sizes depending on which file it left in. See `cropSprite`.
 *
 * **A fixed cell is then a canvas that box is laid on, never a wider cut.** Where the manifest
 * states a cell, each sprite's file is that size with its artwork where the manifest's placement puts
 * it — because a sheet's sprites sit a gutter apart, and cutting the sheet at a cell-sized rect
 * would bake the neighbour into the margin. `placeInCell` measured that on all eight reference
 * sheets and says what it costs; `SpriteCell` says why a cell is offered at all.
 *
 * **Under a fit that resizes, the placement's region is resampled to its drawn size first**
 * (`resampleArea`), and then, on a sheet a palette step decided, mapped back onto the sheet's own
 * colours (`sheetColourHold`, which argues that order). A placement whose drawn size is its region's
 * own is cut exactly as before, so a sheet whose sprites are placed as drawn writes the same bytes it
 * always did. The resample reads the magnified sheet it is handed, which at a whole-number
 * magnification is the same average as reading the 1:1 result at the magnified size.
 *
 * **What every entry is called is `packLayout`'s answer, not this function's.** All three names
 * turn on the one word that tells this sheet apart from the rest of its batch — `sheetToken`'s
 * answer — so they are decided together and handed in. See `PackLayout`.
 *
 * Pure, as everything in this directory is — asynchronous only because the PNG writer waits on the
 * platform's compressor.
 */

/**
 * Where one sprite lands in the archive, derived from what the manifest already states.
 *
 * The ordinal leads so a file listing is in the sheet's own reading order, and `spriteOrdinal` pads
 * it to the width this sheet's own sprite count needs so that the listing stays in that order. The
 * name follows it only where the sheet is named — a positional name is the ordinal again, and
 * `07-sprite-07.png` says nothing twice.
 */
function spriteFileName(manifest: SpriteManifest, index: number, directory: string): string {
  const sprite = manifest.sprites[index];
  const ordinal = spriteOrdinal(index, manifest.sprites.length);
  const name = manifest.named && sprite !== undefined ? `-${sprite.name}` : '';
  return `${directory}/${ordinal}${name}.png`;
}

export async function encodeSpritePack(
  sheet: ImageData,
  manifest: SpriteManifest,
  layout: PackLayout,
  paletted: boolean,
): Promise<WrittenSpritePack> {
  const written = await encodePng(sheet);
  const files: ZipEntry[] = [{ name: layout.sheetFile, bytes: written.bytes }];
  // Built only where a sprite is resized on a paletted sheet, since reading it walks the whole sheet.
  const resizes = manifest.sprites.some((sprite) => sprite.placement !== null && resized(sprite.placement));
  const hold = paletted && resizes ? sheetColourHold(sheet) : null;

  for (const [index, sprite] of manifest.sprites.entries()) {
    // The two are `null` together — see `ManifestSprite.placement` — and are read as a pair rather
    // than one of them being trusted to imply the other.
    const { cell } = manifest;
    const { placement } = sprite;
    const cut = await encodePng(
      cell === null || placement === null
        ? ownBox(sheet, sprite)
        : placeInCell(drawn(sheet, placement, hold), cell, placement),
    );
    files.push({ name: spriteFileName(manifest, index, layout.spriteDirectory), bytes: cut.bytes });
  }

  // Last, so a reader scrolling an archive listing meets the sheet, then the sprites, then the index
  // to them — and so the manifest is written from the same object every file above was named by.
  files.push({ name: layout.manifestFile, bytes: encodeManifest(manifest) });

  return {
    format: 'SPRITE_PACK',
    bytes: zipArchive(files),
    // The sheet's palette, which is the one the sprites were cut out of. Each sprite's own PNG holds
    // whatever subset of it that sprite uses, so a per-sprite figure would be a different claim.
    paletteEntries: written.paletteEntries,
    sprites: manifest.sprites.length,
    naming: manifest.naming,
  };
}

/** A sprite's own bounding box, cut from the sheet with nothing resized. */
function ownBox(sheet: ImageData, sprite: ManifestSprite): ImageData {
  return cropSprite(sheet, {
    left: sprite.x,
    top: sprite.y,
    width: sprite.width,
    height: sprite.height,
    // Not read by the crop, and not worth recovering from the manifest, which states a sprite's
    // extent rather than how much of the box its artwork fills.
    pixels: 0,
  });
}

/** Whether a placement draws its region at a size other than the region's own. */
function resized(placement: ManifestPlacement): boolean {
  return placement.width !== placement.from.width || placement.height !== placement.from.height;
}

/**
 * The artwork a placement lays in the cell: the sprite's own box where nothing is resized, which is
 * the cut this pack always made, and otherwise its region resampled to the drawn size and held to the
 * sheet's colours where `hold` is given.
 */
function drawn(
  sheet: ImageData,
  placement: ManifestPlacement,
  hold: ((sprite: ImageData) => ImageData) | null,
): ImageData {
  const { from } = placement;
  const region = { left: from.x, top: from.y, width: from.width, height: from.height };
  // `pixels` is not read by the crop, as in `ownBox`.
  if (!resized(placement)) return cropSprite(sheet, { ...region, pixels: 0 });
  const resampled = resampleArea(sheet, region, placement.width, placement.height);
  return hold === null ? resampled : hold(resampled);
}
