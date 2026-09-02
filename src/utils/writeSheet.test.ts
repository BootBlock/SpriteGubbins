import { describe, expect, it } from 'vitest';
import { decodePng } from '../test/decodePng.ts';
import { imageFrom } from '../test/images.ts';
import { readZip } from '../test/readZip.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';
import type { ManifestSheet } from '../types/spriteManifest.ts';
import { FLAT_PACK_LAYOUT } from './packLayout.ts';
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

/** A directional core of a batch: several facings, so no one facing names it. */
function core(ordinal: number, total = 10): ManifestSheet {
  return {
    category: 'CHARACTER',
    plan: 'Directional core — cardinal facings',
    ordinal,
    total,
    facings: ['south', 'west', 'north', 'east'],
    assembly: 'south',
    components: 2,
    rigMode: 'CUTOUT_RIG',
  };
}

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
        FLAT_PACK_LAYOUT.sheetFile,
        'sprites/01-heads-south.png',
        'sprites/02-heads-west.png',
        FLAT_PACK_LAYOUT.manifestFile,
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
      const entry = readZip(written.bytes).find((file) => file.name === FLAT_PACK_LAYOUT.manifestFile);
      const manifest: unknown = JSON.parse(new TextDecoder().decode(entry?.bytes));

      // The archive is self-contained, so the rects are into the sheet beside them rather than into
      // a file the reader would have had to download separately — and it says where the pieces sit,
      // which stopped being a constant the moment a facing could name that directory.
      expect(manifest).toMatchObject({
        image: FLAT_PACK_LAYOUT.sheetFile,
        spriteDirectory: FLAT_PACK_LAYOUT.spriteDirectory,
        named: true,
      });
    });

    it('names every entry after the facing that names the sheet', async () => {
      // The whole point of the change: eight rig runs expand into a tree an engine importer scans,
      // rather than colliding. The sprites take a directory the facing names, and the sheet and the
      // manifest — which are one file each and were therefore left at the archive root — take the
      // facing in their own names, since eight archives extracted into one root hold eight of each.
      const written = await writeSheet(job({ format: 'SPRITE_PACK', facing: 'south-west' }));

      expect(readZip(written.bytes).map((entry) => entry.name)).toStrictEqual([
        'south-west-sheet.png',
        'south-west/01-heads-south.png',
        'south-west/02-heads-west.png',
        'south-west-manifest.json',
      ]);
    });

    it('shares no entry name with the pack for another facing of the same batch', async () => {
      // The defect itself, stated as the reader meets it: two packs of one batch unzipped into one
      // directory. Every name has to differ, not only the sprites' — a surviving `manifest.json` is
      // an index to one of the eight sheets with nothing on disk saying which.
      const south = await writeSheet(job({ format: 'SPRITE_PACK', facing: 'south' }));
      const north = await writeSheet(job({ format: 'SPRITE_PACK', facing: 'north' }));
      const names = readZip(north.bytes).map((entry) => entry.name);

      expect(readZip(south.bytes).filter((entry) => names.includes(entry.name))).toStrictEqual([]);
    });

    it('states the names it chose in its manifest, which is the archive’s only index', async () => {
      // Whether a facing distinguishes a sheet is a reading of the whole batch, so nothing inside the
      // archive can re-derive it. A script that unzips a pack and reads the manifest to find the
      // sheet and the pieces would otherwise have two candidate paths for each and no way to choose.
      const written = await writeSheet(job({ format: 'SPRITE_PACK', facing: 'south-west' }));
      const entry = readZip(written.bytes).find((file) => file.name === 'south-west-manifest.json');
      const manifest: unknown = JSON.parse(new TextDecoder().decode(entry?.bytes));

      expect(manifest).toMatchObject({ image: 'south-west-sheet.png', spriteDirectory: 'south-west' });
    });

    it('names a sheet no facing tells apart after its place in the batch', async () => {
      // The two directional cores of an eight-compass batch draw four facings each, so neither has a
      // facing to be named by — and both packs carried every entry name in common until the ordinal
      // reached the layout. Their archives already differed, which is what hid it.
      const first = await writeSheet(job({ format: 'SPRITE_PACK', facing: null, sheet: core(1) }));
      const second = await writeSheet(job({ format: 'SPRITE_PACK', facing: null, sheet: core(2) }));
      const names = readZip(second.bytes).map((entry) => entry.name);

      expect(readZip(first.bytes).map((entry) => entry.name)).toStrictEqual([
        'sheet-1-sheet.png',
        'sheet-1/01-heads-south.png',
        'sheet-1/02-heads-west.png',
        'sheet-1-manifest.json',
      ]);
      expect(readZip(first.bytes).filter((entry) => names.includes(entry.name))).toStrictEqual([]);
    });

    it('keeps the flat layout where the batch holds one sheet, and nothing tells it apart', async () => {
      // A tileset, and a studio composing a single sheet: there are no siblings to collide with, so
      // naming everything after a series that does not exist would buy nothing.
      const written = await writeSheet(job({ format: 'SPRITE_PACK', facing: null, sheet: core(1, 1) }));

      expect(readZip(written.bytes).map((entry) => entry.name)).toStrictEqual([
        'sheet.png',
        'sprites/01-heads-south.png',
        'sprites/02-heads-west.png',
        'manifest.json',
      ]);
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
      const entry = readZip(written.bytes).find((file) => file.name === FLAT_PACK_LAYOUT.manifestFile);
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
        FLAT_PACK_LAYOUT.sheetFile,
        'sprites/01.png',
        'sprites/02.png',
        FLAT_PACK_LAYOUT.manifestFile,
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
