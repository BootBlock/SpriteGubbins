import { describe, expect, it } from 'vitest';
import { SWATCH_BLOCK_PIXELS } from '../constants/paletteFiles.ts';
import { decodePng } from '../test/decodePng.ts';
import type { Rgba } from '../types/quantiser.ts';
import { writePalette } from './writePalette.ts';

const GREEN: Rgba = { r: 40, g: 160, b: 60, a: 255 };
const RED: Rgba = { r: 200, g: 40, b: 40, a: 255 };
const PALETTE = { name: 'armour', entries: [GREEN, RED] };

/** The bytes back as the text they were written from. */
function text(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

describe('writePalette', () => {
  it('writes a swatch PNG one block per colour wide, at the stated block size', async () => {
    const written = await writePalette(PALETTE, 'SWATCH_PNG');
    const decoded = await decodePng(written.bytes);

    expect(decoded.width).toBe(2 * SWATCH_BLOCK_PIXELS);
    expect(decoded.height).toBe(SWATCH_BLOCK_PIXELS);
    // Indexed, which is what carries the palette as a palette rather than as pixels that happen to
    // use it — the same claim the sheet's own PNG download makes.
    expect(decoded.colorType).toBe(3);
    expect(decoded.palette).toEqual([
      [40, 160, 60],
      [200, 40, 40],
    ]);
  });

  it('draws the swatch in the order the palette was given', async () => {
    const decoded = await decodePng((await writePalette(PALETTE, 'SWATCH_PNG')).bytes);

    expect([...decoded.pixels.slice(0, 4)]).toEqual([40, 160, 60, 255]);
    expect([...decoded.pixels.slice(SWATCH_BLOCK_PIXELS * 4, SWATCH_BLOCK_PIXELS * 4 + 4)]).toEqual([
      200, 40, 40, 255,
    ]);
  });

  it('writes a GIMP palette carrying the palette’s own name', async () => {
    const written = await writePalette(PALETTE, 'GPL');

    expect(text(written.bytes)).toBe(
      'GIMP Palette\nName: armour\nColumns: 0\n#\n 40 160  60\t#28A03C\n200  40  40\t#C82828\n',
    );
  });

  it('writes a hex list of nothing but the colours', async () => {
    expect(text((await writePalette(PALETTE, 'HEX_LIST')).bytes)).toBe('#28A03C\n#C82828\n');
  });

  it('reports how many colours went into the file, in every format', async () => {
    for (const format of ['SWATCH_PNG', 'GPL', 'HEX_LIST'] as const) {
      const written = await writePalette(PALETTE, format);
      expect(written.entries, format).toBe(2);
    }
  });
});
