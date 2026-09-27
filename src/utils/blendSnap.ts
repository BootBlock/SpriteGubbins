import { COVERAGE_FLOOR } from '../constants/quantiser.ts';
import type { ColorReduction, Rgba } from '../types/quantiser.ts';
import { channelRungs } from './channelRungs.ts';
import { CHANNELS_PER_PIXEL, FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';
import { locateEntries, nearestOklab, type LocatedEntry } from './lockedPalette.ts';

/**
 * Where an anti-aliased blend is kept to under `SNAP`: the colour space the reduction in force
 * allows, one form per reduction.
 *
 * **The reduction's own space, not a reading of the sheet.** A sheet is only as legal as the
 * reduction made it, so the colours a blend may take are the ones that reduction permits:
 *
 * - `CHANNEL_DEPTH` — the nearest rung per channel, from the table `snapToChannelDepth` redraws the
 *   sheet with. A machine of this kind has no list to search; the ladder is the palette.
 * - `PALETTE` — the nearest of the machine's or the reader's entries, which the studio caps at
 *   `MAX_PALETTE_ENTRIES`.
 * - `LOCKED` — the nearest of the lock's entries, which `PaletteLockControls` caps at the same
 *   figure. The lock is the statement of which colours the series is drawn in.
 * - `MAX_COLORS` — the nearest of the colours the sheet holds, since a budget's palette is chosen
 *   from the sheet itself and every colour the sheet holds is one of its entries. The budget bounds
 *   the set.
 *
 * Reading the sheet's colours for every reduction instead is what this replaced, and it had to give
 * up past `MAX_PALETTE_ENTRIES` of them — the ordinary case for a channel depth, which barely reduces
 * the count — so a machine space quietly gained colours it could not display.
 *
 * **Each list is searched in scaled OKLab**, with `nearestOklab`, colour only: a palette entry is a
 * colour rather than a compositing state. A linear scan, so the answer is memoised on the blended
 * colour, and each search is paid once per distinct blend. The key drops alpha for the same reason
 * the search does, and it is arithmetic on the packed value because this runs once per claimed pixel.
 *
 * **Every answer keeps the blend's own coverage**, and a fully transparent blend is returned as it is:
 * a cleared pixel carries no colour, and zero throughout is what every pass writes when it clears one.
 *
 * `held` is where `MAX_COLORS` finds the sheet's colours: the sheet itself, or every region of a sheet
 * cut into several, which hold its colours between them — see `settleRegions`.
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

  const located = locateEntries(reduction.kind === 'MAX_COLORS' ? sheetColors(held) : reduction.entries);
  const resolved = new Map<number, Rgba>();
  return (blend) => (blend.a === FULLY_TRANSPARENT ? blend : nearestHeld(blend, located, resolved));
}

/** The blend taken to its nearest entry, memoised on its colour, keeping its own coverage. */
function nearestHeld(blend: Rgba, located: readonly LocatedEntry[], resolved: Map<number, Rgba>): Rgba {
  const key = (blend.r * 256 + blend.g) * 256 + blend.b;
  let nearest = resolved.get(key);
  if (nearest === undefined) {
    nearest = nearestOklab(blend, located)?.entry ?? blend;
    resolved.set(key, nearest);
  }
  return { r: nearest.r, g: nearest.g, b: nearest.b, a: blend.a };
}

/**
 * Every distinct colour the sheet holds, opaque, in the order it was first met. The sheet is every
 * image in `images`: one, or each region of a sheet cut into several.
 *
 * Alpha is dropped on the way in: a palette is a list of colours, and a soft pixel's own coverage is
 * a fact about that pixel. A pixel under `COVERAGE_FLOOR` is left out, since its channels are
 * rounding noise rather than a colour the sheet holds. First-met order is what settles a tie in
 * `nearestOklab`, which takes the earliest entry, so the answer is stable across two runs.
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
