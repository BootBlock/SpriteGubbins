import { imageFrom, soften } from '../src/test/images.ts';
import { colorHistogram, packColor } from '../src/utils/imageData.ts';
import { srgbToOklab } from '../src/utils/oklab.ts';
import { pixelDistanceOf } from '../src/utils/pixelDistance.ts';
import { upscaleNearest } from '../src/utils/upscaleNearest.ts';
import type { Rgba } from '../src/types/quantiser.ts';

/**
 * The two softened fixtures the four `BLEND_*` docblocks in `constants/quantiser.ts` state their
 * figures on, rebuilt exactly as they were first measured.
 *
 * Both are art of a known set of flat colours whose edges have been blended, so a palette can be
 * scored by how many of the art's own colours it kept. **Scattered** art is drawn at a scale of four
 * and resampled by `soften`, the three-tap kernel a model's own resampler leaves; **seamed** art has
 * the two pixels either side of every cell boundary moved a quarter of the way toward the other side,
 * which is where the 24-colour figures come from. The colours are fixed by formula rather than
 * listed, and the formulas are the ones the figures were read off: a different set of colours is a
 * different fixture and a different claim.
 */
export interface BlendFixture {
  readonly sheet: ImageData;
  readonly art: readonly Rgba[];
}

/** A colour from hue in sixths of the wheel, saturation and value, rounded to bytes. */
function hsv(hue: number, saturation: number, value: number): Rgba {
  const chroma = value * saturation;
  const second = chroma * (1 - Math.abs((hue % 2) - 1));
  const floor = value - chroma;
  const sector = [
    [chroma, second, 0],
    [second, chroma, 0],
    [0, chroma, second],
    [0, second, chroma],
    [second, 0, chroma],
    [chroma, 0, second],
  ][Math.floor(hue) % 6] ?? [0, 0, 0];
  const [r = 0, g = 0, b = 0] = sector.map((channel) => Math.round((channel + floor) * 255));
  return { r, g, b, a: 255 };
}

/** Which of `count` colours the cell at (`column`, `row`) is painted, scattered so every pair meets. */
function scatter(column: number, row: number, count: number): number {
  const mixed = (column * 73856093) ^ (row * 19349663);
  return ((mixed ^ (mixed >>> 13)) >>> 0) % count;
}

/** `count` art colours in cells of four on a 32-pixel field, upscaled by four and softened. */
export function scatteredFixture(count: number): BlendFixture {
  const art = Array.from({ length: count }, (_, index) =>
    hsv(((index * 137) % 360) / 60, 0.35 + ((index * 3) % 3) * 0.3, 0.25 + ((index * 5) % 4) * 0.23),
  );
  const cells = imageFrom(
    32,
    32,
    (x, y) => art[scatter(Math.floor(x / 4), Math.floor(y / 4), count)] ?? art[0]!,
  );
  return { sheet: soften(upscaleNearest(cells, 4)), art };
}

/** Twenty-four art colours in cells of eight on a 240-pixel field, each seam blended a quarter across. */
export function seamedFixture(): BlendFixture {
  const side = 240;
  const cell = 8;
  const art = Array.from({ length: 24 }, (_, index) =>
    hsv(index / 4, [0.9, 0.55, 0.3][index % 3] ?? 0, [0.95, 0.7, 0.45, 0.25][index % 4] ?? 0),
  );
  const colorAt = (x: number, y: number): Rgba =>
    art[scatter(Math.floor(x / cell), Math.floor(y / cell), art.length)] ?? art[0]!;
  const sheet = imageFrom(side, side, (x, y) => {
    const own = colorAt(x, y);
    // The outermost ring of the field is left hard, as it was when the figures were measured.
    if (x === 0 || y === 0 || x === side - 1 || y === side - 1) return own;
    const across = x % cell === cell - 1 ? [x + 1, y] : x % cell === 0 ? [x - 1, y] : null;
    const down = y % cell === cell - 1 ? [x, y + 1] : y % cell === 0 ? [x, y - 1] : null;
    const [nx, ny] = across ?? down ?? [x, y];
    const other = colorAt(nx ?? x, ny ?? y);
    const toward = (from: number, to: number): number => Math.round(from + (to - from) * 0.25);
    return { r: toward(own.r, other.r), g: toward(own.g, other.g), b: toward(own.b, other.b), a: 255 };
  });
  return { sheet, art };
}

/** How many of the art's colours the palette holds exactly. */
export function artKept({ art }: BlendFixture, palette: readonly Rgba[]): number {
  const entries = new Set(palette.map(packColor));
  return art.filter((color) => entries.has(packColor(color))).length;
}

/**
 * The mean scaled-OKLab distance from each of the art's pixels to its nearest palette entry — the
 * error *at the art's own colours*, so the blends between them are not part of it.
 */
export function artError({ sheet, art }: BlendFixture, palette: readonly Rgba[]): number {
  const histogram = colorHistogram(sheet);
  let total = 0;
  let pixels = 0;
  for (const color of art) {
    const count = histogram.get(packColor(color)) ?? 0;
    const from = srgbToOklab(color.r, color.g, color.b);
    const nearest = Math.min(
      ...palette.map((entry) => {
        const to = srgbToOklab(entry.r, entry.g, entry.b);
        return pixelDistanceOf(from.L, from.a, from.b, color.a, to.L, to.a, to.b, entry.a);
      }),
    );
    total += nearest * count;
    pixels += count;
  }
  return total / pixels;
}
