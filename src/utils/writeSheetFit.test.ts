import { describe, expect, it } from 'vitest';
import { decodePng } from '../test/decodePng.ts';
import { PAINTED_STEP, paintedIconSheet } from '../test/paintedIconSheet.ts';
import { readZip } from '../test/readZip.ts';
import { sheetWriteJob } from '../test/sheetWriteJob.ts';
import type { IconLook } from '../types/iconRoster.ts';
import type { SpriteCell, SpriteFit } from '../types/spriteCell.ts';
import { DEFAULT_SPRITE_CELL_CHOICE } from '../constants/spriteCell.ts';
import { imageFrom } from '../test/images.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { applyPalette } from './applyPalette.ts';
import { cropSprite } from './cropSprite.ts';
import { encodePng } from './encodePng.ts';
import { colorHistogram } from './imageData.ts';
import { placeInCell } from './placeInCell.ts';
import { resolveSpriteCell } from './spriteCell.ts';
import { buildPalette } from './wuQuantiser.ts';
import { writeSheet } from './writeSheet.ts';

/**
 * A painted 4 × 4 icon sheet, through the sprite pack, into 128 × 128 files — the reason the two
 * resizing fits exist. The placements and the resampler have suites of their own; this is the claim
 * end to end, through the writer the download thread runs.
 */

const ICON_CELL: SpriteCell = {
  width: 128,
  height: 128,
  anchor: { x: 'CENTRE', y: 'MIDDLE' },
  fit: 'REFUSE',
};

/** The look a set is drawn in, and the fit its guidance sends a reader to. */
const FIT_FOR: Readonly<Record<IconLook, SpriteFit>> = {
  FULL_BLEED_TILE: 'FILL_SQUARE',
  ISOLATED_MARK: 'SCALE_SET',
};

/** Every sprite file in a pack, decoded, in the archive's own order. */
async function spriteFiles(bytes: Uint8Array) {
  const entries = readZip(bytes).filter((entry) => entry.name.startsWith('sprites/'));
  return Promise.all(entries.map(async (entry) => ({ name: entry.name, png: await decodePng(entry.bytes) })));
}

/** How many pixels of a decoded file carry any coverage at all. */
function covered(pixels: Uint8Array | Uint8ClampedArray): number {
  return pixels.filter((_, index) => index % 4 === 3 && (pixels[index] ?? 0) > 0).length;
}

/** Both looks of the sheet, drawn once for the whole file. */
const SHEETS = {
  FULL_BLEED_TILE: paintedIconSheet('FULL_BLEED_TILE'),
  ISOLATED_MARK: paintedIconSheet('ISOLATED_MARK'),
};

/** The pack for one look of the sheet, cut into 128 px cells under the fit given. */
async function pack(look: IconLook, fit: SpriteFit, paletted = false, image = SHEETS[look].image) {
  const { boxes, names } = SHEETS[look];
  return writeSheet(
    sheetWriteJob({
      image,
      format: 'SPRITE_PACK',
      boxes,
      names,
      naming: 'READING_ORDER',
      cell: { ...ICON_CELL, fit },
      paletted,
    }),
  );
}

describe('a painted icon sheet, packed into 128 × 128 cells', () => {
  it.each(['FULL_BLEED_TILE', 'ISOLATED_MARK'] as const)(
    'writes sixteen named 128 × 128 files under %s',
    async (look) => {
      const files = await spriteFiles((await pack(look, FIT_FOR[look])).bytes);

      expect(files.map((file) => file.name)).toStrictEqual(
        Array.from(
          { length: 16 },
          (_, index) => `sprites/${String(index + 1).padStart(2, '0')}-icon-${String(index + 1)}.png`,
        ),
      );
      for (const { png } of files) expect([png.width, png.height]).toStrictEqual([128, 128]);
    },
  );

  it('fills every full-bleed file edge to edge, so the interface’s frame meets the art', async () => {
    const files = await spriteFiles((await pack('FULL_BLEED_TILE', 'FILL_SQUARE')).bytes);

    for (const { png } of files) expect(covered(png.pixels)).toBe(128 * 128);
  });

  it('keeps the marks’ sizes relative to one another under one factor', async () => {
    const { boxes } = SHEETS.ISOLATED_MARK;
    const files = await spriteFiles((await pack('ISOLATED_MARK', 'SCALE_SET')).bytes);
    const factor = 128 / PAINTED_STEP;

    // Each disc's covered area scales by the factor squared, give or take its rim.
    for (const [index, { png }] of files.entries()) {
      const side = (boxes[index]?.width ?? 0) * factor;
      const expected = (Math.PI * side * side) / 4;
      expect(Math.abs(covered(png.pixels) - expected)).toBeLessThan(Math.PI * side * 1.5);
    }
  });

  it('refuses the same sheet placed as drawn, since every tile is larger than the cell', async () => {
    await expect(pack('FULL_BLEED_TILE', 'REFUSE')).rejects.toThrow(/icon-1 is 150 × 151 drawn pixels/);
  });
});

describe('a painted icon sheet held to a palette', () => {
  /** The sheet as the quantiser leaves it under a sixteen-colour budget. */
  const { image: painted } = SHEETS.FULL_BLEED_TILE;
  const reduced = applyPalette(painted, buildPalette(painted, 16));

  it('holds every resized file to the colours the sheet holds', async () => {
    const sheetColours = new Set(colorHistogram(reduced).keys());
    const files = await spriteFiles((await pack('FULL_BLEED_TILE', 'FILL_SQUARE', true, reduced)).bytes);

    for (const { png } of files) {
      const held = new ImageData(new Uint8ClampedArray(png.pixels), png.width, png.height);
      expect([...colorHistogram(held).keys()].every((colour) => sheetColours.has(colour))).toBe(true);
    }
  });

  it('keeps the resample’s blends where no palette step decided the sheet', async () => {
    const sheetColours = new Set(colorHistogram(reduced).keys());
    const files = await spriteFiles((await pack('FULL_BLEED_TILE', 'FILL_SQUARE', false, reduced)).bytes);
    const first = files[0]?.png;
    if (first === undefined) throw new Error('the pack held no sprite');
    const blended = new ImageData(new Uint8ClampedArray(first.pixels), first.width, first.height);

    expect([...colorHistogram(blended).keys()].some((colour) => !sheetColours.has(colour))).toBe(true);
  });
});

describe('a pixel-art sheet, packed into a cell', () => {
  /** Three sprites of a pixel-art sheet at one file pixel per drawn pixel, two of them uneven. */
  const sheet = imageFrom(20, 6, (x, y) => ({ r: x * 12, g: y * 40, b: 90, a: x % 7 === 6 ? 0 : 255 }));
  const boxes: readonly SpriteBox[] = [
    { left: 0, top: 0, width: 6, height: 6, pixels: 36 },
    { left: 7, top: 1, width: 5, height: 4, pixels: 20 },
    { left: 14, top: 0, width: 3, height: 5, pixels: 15 },
  ];
  const cell = { width: 8, height: 8, anchor: { x: 'CENTRE', y: 'BOTTOM' } } as const;

  it('writes every sprite exactly as the pack did before a fit could be chosen', async () => {
    // A stored resizing fit resolves to `REFUSE` on a sheet read at a pixel scale above 1, and
    // `REFUSE` is the cut this pack always made: the box, laid on a clear cell at the floored offset.
    const resolved = resolveSpriteCell(
      { ...DEFAULT_SPRITE_CELL_CHOICE, source: 'FIXED', fixed: { width: 8, height: 8 }, fit: 'SCALE_SET' },
      null,
      4,
    );
    const written = await writeSheet(
      sheetWriteJob({
        image: sheet,
        format: 'SPRITE_PACK',
        boxes,
        names: ['a', 'b', 'c'],
        cell: resolved,
        paletted: true,
      }),
    );
    const files = readZip(written.bytes).filter((entry) => entry.name.startsWith('sprites/'));

    expect(resolved?.fit).toBe('REFUSE');
    for (const [index, box] of boxes.entries()) {
      const offset = { x: Math.floor((cell.width - box.width) / 2), y: cell.height - box.height };
      const before = await encodePng(placeInCell(cropSprite(sheet, box), cell, offset));
      expect(files[index]?.bytes).toStrictEqual(before.bytes);
    }
  });
});
