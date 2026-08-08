import { describe, expect, it } from 'vitest';
import { formatTextureBytes, textureBytes, textureCostsFor } from './atlasBudget.ts';
import { TEXTURE_FORMATS } from '../constants/atlas.ts';
import { ATLAS_CANVAS_SIZES } from '../types/atlas.ts';
import type { TextureFormat } from '../types/atlas.ts';

const RGBA8: TextureFormat = { id: 'rgba8', label: 'RGBA8', blockSize: 1, bytesPerBlock: 4 };
const BC7: TextureFormat = { id: 'block_compressed', label: 'BC7', blockSize: 4, bytesPerBlock: 16 };

const MIB = 1024 * 1024;

describe('textureBytes', () => {
  it('prices an uncompressed texture at four bytes a texel', () => {
    expect(textureBytes(2048, RGBA8, false)).toBe(2048 * 2048 * 4);
    expect(textureBytes(512, RGBA8, false)).toBe(512 * 512 * 4);
  });

  it('prices a 4 × 4 block format at a quarter of that', () => {
    expect(textureBytes(2048, BC7, false)).toBe((2048 * 2048 * 4) / 4);
  });

  it('adds a mip chain of roughly a third again', () => {
    // The familiar 4/3 is the limit of an infinite series; a real chain stops at 1 × 1, so the
    // total is a shade under it and the code sums the levels rather than assuming the ratio.
    const base = textureBytes(2048, RGBA8, false);
    const chained = textureBytes(2048, RGBA8, true);
    expect(chained).toBeGreaterThan(base);
    expect(chained).toBeLessThan((base * 4) / 3);
    expect(chained / base).toBeGreaterThan(1.33);
  });

  it('charges a block-compressed mip level for whole blocks', () => {
    // A 2 × 2 level still occupies one entire 16-byte block. Pricing it as a quarter of the 4 × 4
    // level above would under-report every compressed texture in the app.
    expect(textureBytes(2, BC7, false)).toBe(16);
    expect(textureBytes(1, BC7, false)).toBe(16);
    // 4 + 2 + 1, each one whole block.
    expect(textureBytes(4, BC7, true)).toBe(48);
  });

  it('rises exactly fourfold when the edge doubles', () => {
    for (const format of [RGBA8, BC7]) {
      expect(textureBytes(2048, format, false)).toBe(textureBytes(1024, format, false) * 4);
    }
  });
});

describe('textureCostsFor', () => {
  it('returns one row per format the app reports, in table order', () => {
    // Against the literal ids, not against `TEXTURE_FORMATS.map(…)` — the subject *is* that map, so
    // comparing the two would be one expression checked against itself and could never fail.
    expect(textureCostsFor(2048).map((cost) => cost.id)).toEqual(['rgba8', 'block_compressed']);
    expect(textureCostsFor(2048).map((cost) => cost.label)).toEqual(
      TEXTURE_FORMATS.map((format) => format.label),
    );
  });

  it('always costs more with a mip chain than without, at every size offered', () => {
    for (const size of ATLAS_CANVAS_SIZES) {
      for (const cost of textureCostsFor(size)) {
        expect(cost.mipmappedBytes).toBeGreaterThan(cost.bytes);
      }
    }
  });

  it('reports the figures a developer would recognise for the default atlas', () => {
    const [uncompressed, compressed] = textureCostsFor(2048);
    expect(uncompressed?.bytes).toBe(16 * MIB);
    expect(compressed?.bytes).toBe(4 * MIB);
  });
});

describe('formatTextureBytes', () => {
  it('reports binary units, as an engine texture inspector does', () => {
    expect(formatTextureBytes(16 * MIB)).toBe('16.0 MiB');
    expect(formatTextureBytes(256 * MIB)).toBe('256.0 MiB');
  });

  it('drops to kibibytes below a mebibyte, which the smallest compressed atlas is', () => {
    expect(formatTextureBytes(textureBytes(512, BC7, false))).toBe('256 KiB');
  });
});
