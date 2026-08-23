import { describe, expect, it } from 'vitest';
import { decodePng } from '../test/decodePng.ts';
import { imageFrom } from '../test/images.ts';
import { readZip } from '../test/readZip.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { PACK_MANIFEST_FILE, PACK_SHEET_FILE, PACK_SPRITE_DIRECTORY } from './encodeSpritePack.ts';
import { writeSheet } from './writeSheet.ts';
import type { SheetWriteJob } from './writeSheet.ts';

const OPAQUE = { r: 20, g: 200, b: 90, a: 255 } as const;
const CLEAR = { r: 0, g: 0, b: 0, a: 0 } as const;

/**
 * A keyed sheet holding two 2 × 2 sprites, one at each end of a row — the smallest thing that has a
 * segmentation worth describing.
 */
const SHEET = imageFrom(8, 4, (x, y) => (y < 2 && (x < 2 || x >= 6) ? OPAQUE : CLEAR));
const BOXES: readonly SpriteBox[] = [
  { left: 0, top: 0, width: 2, height: 2, pixels: 4 },
  { left: 6, top: 0, width: 2, height: 2, pixels: 4 },
];

function job(overrides: Partial<SheetWriteJob> = {}): SheetWriteJob {
  return {
    image: SHEET,
    scale: 1,
    format: 'PNG',
    boxes: BOXES,
    duplicates: [],
    names: ['heads-south', 'heads-west'],
    imageName: 'armour-quantised.png',
    sheet: null,
    facing: null,
    ...overrides,
  };
}

describe('writeSheet', () => {
  it('writes the sheet as a PNG, magnified by the factor it was given', async () => {
    const written = await writeSheet(job({ scale: 3 }));

    expect(written.format).toBe('PNG');
    const decoded = await decodePng(written.bytes);
    expect([decoded.width, decoded.height]).toStrictEqual([24, 12]);
  });

  it('writes an Aseprite document cut into one frame per sprite', async () => {
    const written = await writeSheet(job({ format: 'ASEPRITE' }));

    expect(written.format === 'ASEPRITE' && written.frames).toBe(2);
  });

  describe('the sprite pack', () => {
    it('holds the sheet, one PNG per sprite, and the manifest', async () => {
      const written = await writeSheet(job({ format: 'SPRITE_PACK' }));
      const entries = readZip(written.bytes);

      expect(entries.map((entry) => entry.name)).toStrictEqual([
        PACK_SHEET_FILE,
        'sprites/01-heads-south.png',
        'sprites/02-heads-west.png',
        PACK_MANIFEST_FILE,
      ]);
      expect(written.format === 'SPRITE_PACK' && written.sprites).toBe(2);
    });

    it('cuts each sprite at its own box, at the magnification the sheet is written in', async () => {
      const written = await writeSheet(job({ format: 'SPRITE_PACK', scale: 2 }));
      const entries = readZip(written.bytes);
      const sprite = entries.find((entry) => entry.name.startsWith('sprites/01'));
      if (sprite === undefined) throw new Error('the pack held no first sprite');

      // A 2 × 2 box on a sheet written at 2× is 4 × 4 of the file's own pixels.
      const decoded = await decodePng(sprite.bytes);
      expect([decoded.width, decoded.height]).toStrictEqual([4, 4]);
      expect([...decoded.pixels.slice(0, 4)]).toStrictEqual([OPAQUE.r, OPAQUE.g, OPAQUE.b, OPAQUE.a]);
    });

    it('states inside its manifest what the pack itself is called', async () => {
      const written = await writeSheet(job({ format: 'SPRITE_PACK' }));
      const entry = readZip(written.bytes).find((file) => file.name === PACK_MANIFEST_FILE);
      const manifest: unknown = JSON.parse(new TextDecoder().decode(entry?.bytes));

      // The archive is self-contained, so the rects are into the sheet beside them rather than into
      // a file the reader would have had to download separately — and it says where the pieces sit,
      // which stopped being a constant the moment a facing could name that directory.
      expect(manifest).toMatchObject({
        image: PACK_SHEET_FILE,
        spriteDirectory: PACK_SPRITE_DIRECTORY,
        named: true,
      });
    });

    it('lays the sprites out under the facing that names the sheet', async () => {
      // The whole point of the change: eight rig runs expand into the per-facing tree an engine
      // importer scans, rather than into eight `sprites/` that overwrite one another. The sheet and
      // the manifest keep their fixed names, since one archive holds one of each.
      const written = await writeSheet(job({ format: 'SPRITE_PACK', facing: 'south-west' }));

      expect(readZip(written.bytes).map((entry) => entry.name)).toStrictEqual([
        PACK_SHEET_FILE,
        'south-west/01-heads-south.png',
        'south-west/02-heads-west.png',
        PACK_MANIFEST_FILE,
      ]);
    });

    it('states that directory in its manifest, which is the archive’s only index', async () => {
      // Whether a facing distinguishes a sheet is a reading of the whole batch, so nothing inside the
      // archive can re-derive it. A script that unzips a pack and reads `manifest.json` to find the
      // pieces would otherwise have two candidate paths and no way to choose between them.
      const written = await writeSheet(job({ format: 'SPRITE_PACK', facing: 'south-west' }));
      const entry = readZip(written.bytes).find((file) => file.name === PACK_MANIFEST_FILE);
      const manifest: unknown = JSON.parse(new TextDecoder().decode(entry?.bytes));

      expect(manifest).toMatchObject({ spriteDirectory: 'south-west' });
    });

    it('keeps the fixed directory where no facing names the sheet', async () => {
      // A tileset, and a run drawn at the one direction its set offers: a per-facing tree there
      // would always hold exactly one directory, so the layout follows what the sheet actually is.
      const written = await writeSheet(job({ format: 'SPRITE_PACK', facing: null }));

      expect(readZip(written.bytes).map((entry) => entry.name)).toContain(
        `${PACK_SPRITE_DIRECTORY}/01-heads-south.png`,
      );
    });

    it('numbers the files where the names do not match the sprites found', async () => {
      const written = await writeSheet(job({ format: 'SPRITE_PACK', names: ['heads-south'] }));

      expect(readZip(written.bytes).map((entry) => entry.name)).toStrictEqual([
        PACK_SHEET_FILE,
        'sprites/01.png',
        'sprites/02.png',
        PACK_MANIFEST_FILE,
      ]);
    });
  });

  describe('the manifest alone', () => {
    it('names the PNG the same press would have written', async () => {
      const written = await writeSheet(job({ format: 'MANIFEST' }));
      const manifest: unknown = JSON.parse(new TextDecoder().decode(written.bytes));

      // And points at no sprite directory: a manifest taken on its own describes a PNG the reader
      // downloads separately, so there are no sprite files for one to hold.
      expect(manifest).toMatchObject({
        image: 'armour-quantised.png',
        spriteDirectory: null,
        width: 8,
        height: 4,
      });
    });

    it('describes the file at the magnification that was asked for', async () => {
      // Without producing it: a description of the sheet needs the arithmetic, never the pixels.
      const written = await writeSheet(job({ format: 'MANIFEST', scale: 4 }));
      const manifest: unknown = JSON.parse(new TextDecoder().decode(written.bytes));

      expect(manifest).toMatchObject({ scale: 4, width: 32, height: 16 });
    });

    it('reports how many sprites it described', async () => {
      const written = await writeSheet(job({ format: 'MANIFEST' }));

      expect(written.format === 'MANIFEST' && written.sprites).toBe(2);
    });
  });
});
