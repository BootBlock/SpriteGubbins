import type { Rgba } from '../types/quantiser.ts';
import { FULLY_TRANSPARENT, colorHistogram, remapColors, unpackColor } from './imageData.ts';
import { nearestColorSearch } from './nearestColorSearch.ts';

/**
 * A redrawing of resized sprites in the colours their sheet already holds, so resizing adds none.
 *
 * **Why this runs after the resample, and the resample after the palette.** Resizing a painted sprite
 * by area averages neighbouring pixels, which writes blends no palette holds. The two obvious orders
 * both break something:
 *
 * - Resampling after the palette step and stopping there leaves those blends in the file: a sheet the
 *   reader held to sixty-four colours, or to a palette locked across a series, comes out as sprites in
 *   hundreds, written as truecolour, and the series stops sharing a palette.
 * - Resampling before the palette step changes what the palette is chosen from. The budget, the lock
 *   and every cleanup pass read the whole sheet at the size it was drawn; run them on 128-pixel icons
 *   instead and the sheet in the pack and the sprites beside it are quantised to two different
 *   palettes, and a lock taken from the sheet describes colours the sprites do not hold.
 *
 * So the sheet is quantised whole and at full size, as every other download is, each sprite is
 * resampled from that result, and then every pixel is mapped back onto the colours the result holds.
 * The palette step is not run again; nothing is chosen, only matched — so every colour a sprite file
 * holds is one the sheet file beside it holds, and its indexed palette is a subset of the sheet's.
 *
 * **Coverage first, then colour, and the colour only among that coverage.** The resample writes
 * fractional coverage along every edge. Each pixel's alpha is first taken to the nearest coverage the
 * sheet itself uses — on a hard-edged sheet that is opaque or clear, split at half coverage, so the
 * silhouette neither grows nor shrinks — and then the colour to the nearest of the sheet's colours
 * *at that coverage*, through a `nearestColorSearch` over those colours alone. One search over every
 * colour matches all four channels together, so a pixel held at half coverage could still land on an
 * opaque colour of a nearer hue, and the silhouette grew wherever it did. A pixel taken to no
 * coverage is written clear.
 *
 * Only for a sheet a palette step decided (`QuantiseResult.paletted`). A sheet left at its own colours
 * holds thousands, none of them a palette, and its resized edges are kept as the resample wrote them.
 *
 * Pure, as everything in this directory is.
 */
export function sheetColourHold(sheet: ImageData): (sprite: ImageData) => ImageData {
  // Read once per sheet and asked once per sprite: the walk is over the whole sheet, magnified.
  const colours = [...colorHistogram(sheet).keys()].map(unpackColor);
  const levels = [...new Set([FULLY_TRANSPARENT, ...colours.map((colour) => colour.a)])];
  const atLevel = new Map(
    levels.map((level) => [level, nearestColorSearch(colours.filter((colour) => colour.a === level))]),
  );
  return (sprite) =>
    remapColors(sprite, (colour): Rgba => {
      const a = nearestLevel(levels, colour.a);
      if (a === FULLY_TRANSPARENT) return CLEAR;
      const held = { ...colour, a };
      return atLevel.get(a)?.(held) ?? held;
    });
}

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

/** The level nearest `alpha`, the more opaque of two at the same distance. */
function nearestLevel(levels: readonly number[], alpha: number): number {
  let best = FULLY_TRANSPARENT;
  for (const level of levels) {
    const distance = Math.abs(level - alpha);
    const held = Math.abs(best - alpha);
    if (distance < held || (distance === held && level > best)) best = level;
  }
  return best;
}
