import { describe, expect, it } from 'vitest';
import { decodePng } from '../test/decodePng.ts';
import { imageFrom } from '../test/images.ts';
import { readZip } from '../test/readZip.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
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

/** The same sheet read as two sprites of different sizes, which is what a cell is for. */
const UNEVEN_BOXES: readonly SpriteBox[] = [
  { left: 0, top: 0, width: 2, height: 2, pixels: 4 },
  { left: 5, top: 0, width: 3, height: 2, pixels: 4 },
];

/** A cell every box above fits inside, at the anchor the manifest's pivot already defaulted to. */
const CELL: SpriteCell = { width: 4, height: 4, anchor: { x: 'CENTRE', y: 'BOTTOM' } };

/** Two 2 × 2 sprites one clear pixel apart, which is the gutter a returned sheet actually has. */
const TIGHT = imageFrom(6, 2, (x) => (x < 2 || x >= 3 ? OPAQUE : CLEAR));
const TIGHT_BOXES: readonly SpriteBox[] = [
  { left: 0, top: 0, width: 2, height: 2, pixels: 4 },
  { left: 3, top: 0, width: 3, height: 2, pixels: 6 },
];

/** Wide enough that a cell-sized cut of `TIGHT` centred on either sprite reaches the other. */
const WIDE: SpriteCell = { width: 6, height: 2, anchor: { x: 'CENTRE', y: 'BOTTOM' } };

function job(overrides: Partial<SheetWriteJob> = {}): SheetWriteJob {
  return {
    image: SHEET,
    scale: 1,
    format: 'PNG',
    boxes: BOXES,
    cell: null,
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

    it('cuts every sprite into the cell where one was asked for, whatever its own box measured', async () => {
      const written = await writeSheet(
        job({ format: 'SPRITE_PACK', cell: CELL, boxes: UNEVEN_BOXES, names: [] }),
      );
      const files = readZip(written.bytes).filter((entry) => entry.name.startsWith('sprites/'));
      const sizes = await Promise.all(
        files.map(async (file) => {
          const decoded = await decodePng(file.bytes);
          return [decoded.width, decoded.height];
        }),
      );

      // Two boxes of different sizes, one cell — which is the whole of what a rig importer needs and
      // what the bounding-box cut could not give it.
      expect(sizes).toStrictEqual([
        [4, 4],
        [4, 4],
      ]);
    });

    it('leaves a neighbouring sprite out of a sprite’s own file', async () => {
      // The whole point of the cut being a canvas rather than a wider window. `TIGHT` puts its two
      // sprites one clear pixel apart, which is the gutter a returned sheet actually has, and the
      // cell is wide enough to reach across it — so a cell-sized cut of the sheet would bake the
      // second sprite into the first one's file. `placeInCell` measured that on all eight reference
      // sheets; this is the same claim end to end.
      const written = await writeSheet(
        job({ format: 'SPRITE_PACK', image: TIGHT, boxes: TIGHT_BOXES, cell: WIDE, names: [] }),
      );
      const first = readZip(written.bytes).find((entry) => entry.name.startsWith('sprites/01'));
      if (first === undefined) throw new Error('the pack held no first sprite');
      const decoded = await decodePng(first.bytes);

      expect([decoded.width, decoded.height]).toStrictEqual([WIDE.width, WIDE.height]);
      // The first sprite's own four pixels, and not one more: the neighbour would add four again.
      const drawn = [...decoded.pixels].filter(
        (_, index) => index % 4 === 3 && decoded.pixels[index] === 255,
      );
      expect(drawn).toHaveLength(4);
    });

    it('magnifies the cell with the artwork, so the pack states one cut at one set of coordinates', async () => {
      const written = await writeSheet(job({ format: 'SPRITE_PACK', cell: CELL, scale: 3 }));
      const entry = readZip(written.bytes).find((file) => file.name === PACK_MANIFEST_FILE);
      const manifest: unknown = JSON.parse(new TextDecoder().decode(entry?.bytes));

      expect(manifest).toMatchObject({
        cell: { width: 12, height: 12, anchor: { x: 'CENTRE', y: 'BOTTOM' } },
      });
    });

    it('refuses the download rather than squeezing a sprite the cell cannot hold', async () => {
      // A sprite larger than the cell is a sheet that came back at a coarser scale than the prompt
      // asked for, and resampling it would hand a rig a piece whose pixels no longer line up with
      // any of its neighbours.
      await expect(writeSheet(job({ format: 'SPRITE_PACK', cell: { ...CELL, width: 1 } }))).rejects.toThrow(
        /Sprite 1 is 2 × 2 drawn pixels, larger than the 1 × 4 cell/,
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
