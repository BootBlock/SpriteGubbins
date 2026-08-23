import type { SpriteManifest } from '../types/spriteManifest.ts';
import type { WrittenSpritePack } from '../types/sheetFormat.ts';
import { cropSprite } from './cropSprite.ts';
import { encodePng } from './encodePng.ts';
import { encodeManifest } from './spriteManifest.ts';
import { zipArchive } from './zipArchive.ts';
import type { ZipEntry } from './zipArchive.ts';

/**
 * The sheet, every sprite on it, and the manifest that says which is which — as one archive.
 *
 * **This is the step the app used to leave to the reader.** A quantised sheet left as one picture,
 * and the boxes the tab had already found — drawn in the preview, counted in the panel, cut into
 * Aseprite frames — never left with it, so the first thing anyone did with the download was find
 * those same boundaries again by hand. The pack is the whole answer to that: the sheet as it would
 * have been downloaded, one indexed PNG per sprite, and `manifest.json` naming them.
 *
 * **All three are the same artwork, so all three come from the same bytes.** The sprite PNGs are cut
 * from the magnified sheet this function is handed rather than from the 1:1 result, and the manifest
 * states the boxes at that same magnification — the alternative is three descriptions of one sheet
 * that agree until someone chooses a magnification.
 *
 * **A sprite keeps its bounding box**, transparent corners included: it is what the preview ringed
 * and what the manifest states, and trimming here would give one sprite two sizes depending on which
 * file it left in. See `cropSprite`.
 *
 * Pure, as everything in this directory is — asynchronous only because the PNG writer waits on the
 * platform's compressor.
 */

/** What the sheet itself is called inside the archive, and what the manifest's `image` names. */
export const PACK_SHEET_FILE = 'sheet.png';
/** What the manifest is called inside the archive. */
export const PACK_MANIFEST_FILE = 'manifest.json';
/** The directory the cut-out sprites sit in, where the sheet's own facing does not name one. */
export const PACK_SPRITE_DIRECTORY = 'sprites';

/**
 * Where one sprite lands in the archive, derived from what the manifest already states.
 *
 * The ordinal leads so a file listing is in the sheet's own reading order, and it is padded so that
 * ten sorts after nine. The name follows it only where the sheet is named — a positional name is
 * the ordinal again, and `07-sprite-07.png` says nothing twice.
 */
function spriteFileName(manifest: SpriteManifest, index: number, directory: string): string {
  const sprite = manifest.sprites[index];
  const ordinal = String(index + 1).padStart(2, '0');
  const name = manifest.named && sprite !== undefined ? `-${sprite.name}` : '';
  return `${directory}/${ordinal}${name}.png`;
}

export async function encodeSpritePack(
  sheet: ImageData,
  manifest: SpriteManifest,
  directory: string,
): Promise<WrittenSpritePack> {
  const written = await encodePng(sheet);
  const files: ZipEntry[] = [{ name: PACK_SHEET_FILE, bytes: written.bytes }];

  for (const [index, sprite] of manifest.sprites.entries()) {
    const cut = await encodePng(
      cropSprite(sheet, {
        left: sprite.x,
        top: sprite.y,
        width: sprite.width,
        height: sprite.height,
        // Not read by the crop, and not worth recovering from the manifest, which states a sprite's
        // extent rather than how much of the box its artwork fills.
        pixels: 0,
      }),
    );
    files.push({ name: spriteFileName(manifest, index, directory), bytes: cut.bytes });
  }

  // Last, so a reader scrolling an archive listing meets the sheet, then the sprites, then the index
  // to them — and so the manifest is written from the same object every file above was named by.
  files.push({ name: PACK_MANIFEST_FILE, bytes: encodeManifest(manifest) });

  return {
    format: 'SPRITE_PACK',
    bytes: zipArchive(files),
    // The sheet's palette, which is the one the sprites were cut out of. Each sprite's own PNG holds
    // whatever subset of it that sprite uses, so a per-sprite figure would be a different claim.
    paletteEntries: written.paletteEntries,
    sprites: manifest.sprites.length,
    named: manifest.named,
  };
}
