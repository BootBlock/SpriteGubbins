import { TEXTURE_FORMATS } from '../constants/atlas.ts';
import type { AtlasCanvasSize, TextureCost, TextureFormat } from '../types/atlas.ts';

/**
 * What a packed atlas costs in graphics memory.
 *
 * The question the calculator's status row claimed to answer and never did: it reported whether the
 * texture was a power of two — which every size offered is, so the check could not fail — and never
 * stated a single byte. A developer choosing between 2048 and 4096 is choosing between 16 MiB and
 * 64 MiB, and that is the number the decision turns on.
 *
 * Pure arithmetic over the format table in `constants/atlas.ts`, exact rather than estimated, so
 * every figure shown is one the reader can check against their own engine's texture inspector.
 */

const BYTES_PER_KIB = 1024;
const BYTES_PER_MIB = BYTES_PER_KIB * BYTES_PER_KIB;

/**
 * Bytes one mip level of a square texture occupies in `format`.
 *
 * Rounded up to whole blocks, which is what makes the bottom of a mip chain honest: a 2 × 2 level
 * of a block-compressed texture still costs one entire 16-byte block, and a chain that priced it at
 * a quarter of one would under-report every texture in the app.
 */
function levelBytes(size: number, format: TextureFormat): number {
  const blocks = Math.ceil(size / format.blockSize);
  return blocks * blocks * format.bytesPerBlock;
}

/**
 * Bytes the texture occupies in `format`, counting every mip level below the base when `mipmapped`.
 *
 * The chain is summed level by level rather than multiplied by the familiar 4/3, because that ratio
 * is the limit of an infinite series and the real chain stops at 1 × 1 — and, for a block format,
 * stops being a quarter of the level above it well before that.
 */
export function textureBytes(size: number, format: TextureFormat, mipmapped: boolean): number {
  if (!mipmapped) return levelBytes(size, format);

  let total = 0;
  for (let level = size; level >= 1; level = Math.floor(level / 2)) total += levelBytes(level, format);
  return total;
}

/** What this texture costs in each format the app reports, base level and full chain alike. */
export function textureCostsFor(size: AtlasCanvasSize): readonly TextureCost[] {
  return TEXTURE_FORMATS.map((format) => ({
    id: format.id,
    label: format.label,
    bytes: textureBytes(size, format, false),
    mipmappedBytes: textureBytes(size, format, true),
  }));
}

/**
 * A byte count as a reader budgets in — binary units, because that is what every engine's texture
 * inspector reports and a figure that disagrees with the tool it will be checked against is worse
 * than none.
 */
export function formatTextureBytes(bytes: number): string {
  if (bytes >= BYTES_PER_MIB) return `${(bytes / BYTES_PER_MIB).toFixed(1)} MiB`;
  return `${(bytes / BYTES_PER_KIB).toFixed(0)} KiB`;
}
