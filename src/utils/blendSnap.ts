import { COVERAGE_FLOOR } from '../constants/quantiser.ts';
import type { ColorReduction, Rgba } from '../types/quantiser.ts';
import { channelRungs } from './channelRungs.ts';
import { CHANNELS_PER_PIXEL, FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';
import { nearestPointSearch } from './nearestPointSearch.ts';
import { type MutableOklab, srgbToOklab, srgbToOklabInto } from './oklab.ts';

/**
 * Where an anti-aliased blend is kept to under `SNAP`: the colour space the reduction in force
 * allows, one form per reduction.
 *
 * **The reduction's own space, not a count-limited reading of the sheet.** A sheet is only as legal
 * as the reduction made it, so the colours a blend may take are the ones that reduction permits:
 *
 * - `CHANNEL_DEPTH` — the nearest rung per channel, from the table `snapToChannelDepth` redraws the
 *   sheet with. A machine of this kind has no list to search; the ladder is the palette.
 * - `PALETTE` — the nearest of the machine's or the reader's entries.
 * - `LOCKED` — the nearest of the lock's entries and of the colours the sheet kept beyond the
 *   lock's reach. Both are colours the lock allows: it moves a colour only within its snap distance,
 *   and a colour further out stays on the sheet as the artwork's own. The entries come first, so an
 *   entry takes a tie.
 * - `MAX_COLORS` — the nearest of the colours the sheet holds, since a budget's palette is chosen
 *   from the sheet itself and every colour the sheet holds is one of its entries.
 *
 * Reading the sheet's colours for every reduction instead is what this replaced, and it had to give
 * up past `MAX_PALETTE_ENTRIES` of them — the ordinary case for a channel depth, which barely reduces
 * the count — so a machine space quietly gained colours it could not display.
 *
 * **Each list is searched in scaled OKLab, colour only**, since a palette entry is a colour rather
 * than a compositing state. The search is `nearestPointSearch` over the list's OKLab positions, so its
 * cost barely grows with the list: a lock over a sheet at a grid of 1 can leave hundreds of thousands
 * of colours beyond its reach. The answer is still memoised on the blended colour, because this runs
 * once per claimed pixel; the key drops alpha for the same reason the search does.
 *
 * **Every answer keeps the blend's own coverage**, and a fully transparent blend is returned as it is:
 * a cleared pixel carries no colour, and zero throughout is what every pass writes when it clears one.
 *
 * `held` is where the sheet's colours are read: the sheet itself, or every region of a sheet cut into
 * several, which hold its colours between them — see `settleRegions`.
 */
export function blendSnap(reduction: ColorReduction, held: readonly ImageData[]): (blend: Rgba) => Rgba {
  if (reduction.kind === 'CHANNEL_DEPTH') {
    const rungs = channelRungs(reduction.bitsPerChannel);
    // A blend's channels are integers 0–255, so the table always answers; the fallbacks are what
    // `noUncheckedIndexedAccess` asks for.
    return (blend) =>
      blend.a === FULLY_TRANSPARENT
        ? blend
        : {
            r: rungs[blend.r] ?? blend.r,
            g: rungs[blend.g] ?? blend.g,
            b: rungs[blend.b] ?? blend.b,
            a: blend.a,
          };
  }

  const nearest = nearestOf(allowedColors(reduction, held));
  return (blend) => (blend.a === FULLY_TRANSPARENT ? blend : nearest(blend));
}

/** The colours a list-shaped reduction allows a blend to take, in the order that settles a tie. */
function allowedColors(
  reduction: Exclude<ColorReduction, { kind: 'CHANNEL_DEPTH' }>,
  held: readonly ImageData[],
): readonly Rgba[] {
  switch (reduction.kind) {
    case 'PALETTE':
      return reduction.entries;
    case 'LOCKED':
      return [...reduction.entries, ...sheetColors(held)];
    case 'MAX_COLORS':
      return sheetColors(held);
  }
}

/**
 * The search over one list: each blend taken to its nearest colour in scaled OKLab, memoised on the
 * blended colour, keeping its own coverage. An empty list leaves the blend as it is.
 */
function nearestOf(colors: readonly Rgba[]): (blend: Rgba) => Rgba {
  const search = nearestPointSearch(
    colors.map((color) => {
      const lab = srgbToOklab(color.r, color.g, color.b);
      return [lab.L, lab.a, lab.b, 0] as const;
    }),
  );
  const target: MutableOklab = { L: 0, a: 0, b: 0 };
  const resolved = new Map<number, Rgba>();

  return (blend) => {
    const key = (blend.r * 256 + blend.g) * 256 + blend.b;
    let nearest = resolved.get(key);
    if (nearest === undefined) {
      srgbToOklabInto(target, blend.r, blend.g, blend.b);
      nearest = colors[search(target.L, target.a, target.b, 0)] ?? blend;
      resolved.set(key, nearest);
    }
    return { r: nearest.r, g: nearest.g, b: nearest.b, a: blend.a };
  };
}

/**
 * Every distinct colour the sheet holds, opaque, in the order it was first met. The sheet is every
 * image in `images`: one, or each region of a sheet cut into several.
 *
 * Alpha is dropped on the way in: a palette is a list of colours, and a soft pixel's own coverage is
 * a fact about that pixel. A pixel under `COVERAGE_FLOOR` is left out, since its channels are
 * rounding noise rather than a colour the sheet holds. First-met order is what settles a tie in
 * `nearestPointSearch`, which takes the earliest point, so the answer is stable across two runs.
 *
 * It reads the channel array directly rather than through `colorHistogram`, which would build a Map
 * of counts this has no use for.
 */
function sheetColors(images: readonly ImageData[]): readonly Rgba[] {
  const seen = new Set<number>();
  const entries: Rgba[] = [];

  for (const { data } of images) {
    for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
      if ((data[offset + 3] ?? 0) < COVERAGE_FLOOR) continue;
      const r = data[offset] ?? 0;
      const g = data[offset + 1] ?? 0;
      const b = data[offset + 2] ?? 0;
      const packed = (r * 256 + g) * 256 + b;
      if (seen.has(packed)) continue;
      seen.add(packed);
      entries.push({ r, g, b, a: FULLY_OPAQUE });
    }
  }

  return entries;
}
