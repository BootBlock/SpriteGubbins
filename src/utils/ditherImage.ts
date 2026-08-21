import type { ColorReduction, Rgba, ThresholdMatrix } from '../types/quantiser.ts';
import { channelLevels } from './channelLevels.ts';
import {
  CHANNELS_PER_PIXEL,
  FULLY_TRANSPARENT,
  alphaAt,
  copyPixel,
  createImage,
  packedColorAt,
  unpackColor,
  writePixel,
} from './imageData.ts';
import { locateEntries, nearestOklab } from './lockedPalette.ts';
import { DITHER_LATTICE_CORNERS } from '../constants/quantiser.ts';
import { ditherCandidates, mixingPlan } from './mixingPlan.ts';
import type { MixingPlan } from './mixingPlan.ts';
import { buildPalette } from './wuQuantiser.ts';

/**
 * The palette step, taken positionally: every pixel written as one of the two colours its mixing
 * plan names, chosen by where the pixel sits in the threshold tile.
 *
 * The drop-in replacement for the four functions `reduceColors` dispatches to — `applyPalette` and
 * `applyRgbPalette` in `applyPalette.ts`, `applyLockedPalette` in `lockedPalette.ts` and
 * `snapToChannelDepth` in `channelDepth.ts` — answering the same four questions they do; see
 * {@link ColorReduction}. That is why `quantiseImage` runs one or the other and never both: they are
 * the same step, and mapping a sheet onto a palette and *then* dithering it would be dithering a
 * sheet that has no colours left to express.
 *
 * **It is not only those four with a pattern laid over the top, and the difference is the metric.**
 * `nearestColor`, which `applyPalette` and `applyRgbPalette` both use, measures squared distance
 * across raw RGBA; `snapToChannelDepth` rounds each channel independently. This measures in the
 * scaled OKLab every colour *tolerance* on this tab now uses, with coverage as a fourth axis on the
 * same scale — the metric `mixingPlan` needs to compare a mixture with a target at all, and the one
 * every other colour gate in this tab already speaks. So a colour whose plan comes back flat can land
 * on a different entry than the undithered step would have chosen. Only the locked palette is
 * measured identically both ways, because both arms read `lockedPalette.nearestOklab`.
 *
 * **The candidate set is what the four reductions differ in.** A budget, a pinned list and a locked
 * palette are all lists, so the plan searches the whole list; a channel-depth space is a lattice with
 * hundreds of thousands of points in it and no list to search, so the candidates are the eight
 * lattice corners of the cell the colour falls in — which are the only points a mixture could
 * usefully be made from, and are exactly the pair per channel that the classic threshold dither for
 * a bit-depth reduction chooses between.
 *
 * **Alpha follows each reduction's own rule rather than a rule of this pass.** A budget's entries are
 * pixels of this sheet and carry the coverage they were found at, so they are written whole, as
 * `applyPalette` writes them; a machine's palette and a locked palette are lists of *colours*, so the
 * pixel keeps its own coverage, as `applyRgbPalette` and `applyLockedPalette` leave it. Nothing here
 * dithers transparency into existence: a fully transparent pixel is copied through untouched, as
 * every colour transform in this directory leaves it.
 *
 * **A locked palette's escape gate still applies.** A colour further than the lock's snap distance
 * from every entry keeps the colour it arrived with and is not dithered at all — the same rule, read
 * from the same function, because a gem the locked sheet never had is no more the lock's business
 * when a pattern is in force than when one is not.
 *
 * Pure, and the plan is worked out once per *distinct* colour rather than once per pixel — the same
 * economy `remapColors` makes, spelled out here because a positional pass cannot use it: what a
 * pixel becomes depends on where it is as well as on what colour it is.
 */
export function ditherImage(image: ImageData, reduction: ColorReduction, matrix: ThresholdMatrix): ImageData {
  const lattice = reduction.kind === 'CHANNEL_DEPTH' ? channelLevels(reduction.bitsPerChannel) : null;
  const listed = lattice === null ? entriesFor(image, reduction) : null;
  // An empty palette is a sheet with no opaque pixels for a budget to choose from, or a stated
  // palette that failed to parse — which `colorPlanFor` answers with no reduction at all. Either
  // way there is nothing to dither against, and the sheet passes through.
  if (listed !== null && listed.length === 0) return copyOf(image);

  const candidates = listed === null ? null : ditherCandidates(listed);
  const located = reduction.kind === 'LOCKED' ? locateEntries(reduction.entries) : null;
  const escape = reduction.kind === 'LOCKED' ? reduction.snap * reduction.snap : 0;
  // Only a budget's entries are pixels of this sheet, so only a budget's carry a coverage worth
  // writing. The other three are lists of colours — see the note above.
  const keepsAlpha = reduction.kind !== 'MAX_COLORS';

  const output = createImage(image.width, image.height);
  const plans = new Map<number, MixingPlan | null>();
  const { data } = image;

  for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
    if (alphaAt(data, offset) === FULLY_TRANSPARENT) {
      copyPixel(data, output.data, offset);
      continue;
    }

    const key = packedColorAt(data, offset);
    let plan = plans.get(key);
    if (plan === undefined) {
      const color = unpackColor(key);
      plan = planFor(color, candidates, lattice, located, escape, matrix.levels);
      plans.set(key, plan);
    }

    const pixel = offset / CHANNELS_PER_PIXEL;
    const x = pixel % image.width;
    const y = (pixel - x) / image.width;
    writePixel(output.data, offset, chosen(plan, data, offset, matrix, x, y, keepsAlpha));
  }

  return output;
}

/** The colours a list-shaped reduction offers, from wherever that reduction states them. */
function entriesFor(image: ImageData, reduction: ColorReduction): readonly Rgba[] {
  switch (reduction.kind) {
    case 'MAX_COLORS':
      return buildPalette(image, reduction.maxColors);
    case 'PALETTE':
    case 'LOCKED':
      return reduction.entries;
    // The lattice case never reaches here — the caller resolves it before asking.
    case 'CHANNEL_DEPTH':
      return [];
  }
}

/**
 * One colour's plan, or `null` where a locked palette does not reach it.
 *
 * The lattice arm builds its candidates here rather than once for the whole sheet because they are
 * a fact about the *colour*, not about the palette — which costs nothing extra, since this runs once
 * per distinct colour either way.
 */
function planFor(
  color: Rgba,
  candidates: ReturnType<typeof ditherCandidates> | null,
  lattice: readonly number[] | null,
  located: ReturnType<typeof locateEntries> | null,
  escape: number,
  levels: number,
): MixingPlan | null {
  if (located !== null) {
    const nearest = nearestOklab(color, located);
    if (nearest === null || nearest.distance > escape) return null;
  }
  if (lattice !== null) {
    // Every corner, not the nearest few — see `DITHER_LATTICE_CORNERS` for the grey that came back
    // dithered against red when the pairs were drawn by nearness.
    const corners = ditherCandidates(latticeCorners(color, lattice));
    return mixingPlan(color, corners, levels, DITHER_LATTICE_CORNERS);
  }
  return candidates === null ? null : mixingPlan(color, candidates, levels);
}

/**
 * The eight lattice points around a colour — the rung at or below each channel, and the one above.
 *
 * Deduplicated, because a channel already sitting on a rung has one neighbour rather than two, and a
 * colour on the lattice already has one corner rather than eight. The alpha carried is the colour's
 * own, so coverage contributes the same nothing to every candidate: a channel-depth palette leaves
 * transparency exactly where it found it.
 */
function latticeCorners(color: Rgba, levels: readonly number[]): readonly Rgba[] {
  const corners: Rgba[] = [];
  const seen = new Set<number>();
  for (const r of neighbours(color.r, levels)) {
    for (const g of neighbours(color.g, levels)) {
      for (const b of neighbours(color.b, levels)) {
        const key = (r * 256 + g) * 256 + b;
        if (seen.has(key)) continue;
        seen.add(key);
        corners.push({ r, g, b, a: color.a });
      }
    }
  }
  return corners;
}

/** The rung at or below a channel value and the one above, which are the same rung on a rung. */
function neighbours(value: number, levels: readonly number[]): readonly number[] {
  let below = levels[0] ?? 0;
  let above = levels[levels.length - 1] ?? 255;
  for (const level of levels) {
    if (level <= value && level >= below) below = level;
    if (level >= value && level <= above) above = level;
  }
  return below === above ? [below] : [below, above];
}

/** What one pixel becomes: its plan's second colour where its rank is below the plan's steps. */
function chosen(
  plan: MixingPlan | null,
  data: Uint8ClampedArray,
  offset: number,
  matrix: ThresholdMatrix,
  x: number,
  y: number,
  keepsAlpha: boolean,
): Rgba {
  const alpha = data[offset + 3] ?? 0;
  if (plan === null) {
    return { r: data[offset] ?? 0, g: data[offset + 1] ?? 0, b: data[offset + 2] ?? 0, a: alpha };
  }
  const rank = matrix.ranks[(y % matrix.size) * matrix.size + (x % matrix.size)] ?? 0;
  const entry = rank < plan.steps ? plan.second : plan.first;
  return keepsAlpha ? { ...entry, a: alpha } : entry;
}

/** The sheet unchanged, as a new image — the answer where there is no palette to dither against. */
function copyOf(image: ImageData): ImageData {
  const output = createImage(image.width, image.height);
  output.data.set(image.data);
  return output;
}
