import type { ColorReduction, Rgba, ThresholdMatrix } from '../types/quantiser.ts';
import { ditherChannelDepth } from './ditherChannelDepth.ts';
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
import { lockReach, lockedEntryFor } from './lockedPalette.ts';
import { ditherCandidates, mixingPlan } from './mixingPlan.ts';
import type { MixingPlan } from './mixingPlan.ts';
import { buildPalette } from './wuQuantiser.ts';

/**
 * The palette step, taken positionally: every pixel written as one of the two colours its mixing
 * plan names, chosen by where the pixel sits in the threshold tile — or, for a channel-depth space,
 * each channel thresholded on its own by `ditherChannelDepth`.
 *
 * The drop-in replacement for the four functions `reduceColors` dispatches to — `applyPalette` and
 * `applyRgbPalette` in `applyPalette.ts`, `applyLockedPalette` in `lockedPalette.ts` and
 * `snapToChannelDepth` in `channelDepth.ts` — answering the same four questions they do; see
 * {@link ColorReduction}. That is why `quantiseImage` runs one or the other and never both: they are
 * the same step, and mapping a sheet onto a palette and *then* dithering it would be dithering a
 * sheet that has no colours left to express.
 *
 * **For a list it is not the undithered step with a pattern laid over the top, and the difference
 * is the metric.** `nearestColor`, which `applyPalette` and `applyRgbPalette` both use, measures
 * squared distance across raw RGBA. This measures in the scaled OKLab every colour *tolerance* on
 * this tab now uses, with coverage as a fourth axis on the same scale — the metric `mixingPlan` needs
 * to compare a mixture with a target at all, and the one every other colour gate in this tab already
 * speaks. So a colour whose plan comes back flat can land on a different entry than the undithered
 * step would have chosen. Only the locked palette's escape is decided identically both ways, because
 * both arms read `lockedPalette.lockedEntryFor`.
 *
 * **A channel-depth space takes the classic form instead, and it is the one reduction that can.** A
 * budget, a pinned list and a locked palette are all lists, and there is no next rung in a list for a
 * threshold to step to, so the plan searches it. A channel-depth space is the uniform lattice ordered
 * dithering was defined for, where a per-channel threshold reaches colours no pair of corners can and
 * costs O(pixels) rather than a search per distinct colour — see `ditherChannelDepth`.
 *
 * **Alpha follows each reduction's own rule rather than a rule of this pass.** A budget's entries are
 * pixels of this sheet and carry the coverage they were found at, so they are written whole, as
 * `applyPalette` writes them; a machine's palette and a locked palette are lists of *colours*, so the
 * pixel keeps its own coverage, as `applyRgbPalette`, `applyLockedPalette` and `snapToChannelDepth`
 * leave it. Nothing here
 * dithers transparency into existence: a fully transparent pixel is copied through untouched, as
 * every colour transform in this directory leaves it.
 *
 * **A locked palette's escape gate still applies.** A colour further than the lock's snap distance
 * from every entry keeps the colour it arrived with and is not dithered at all — the same rule, read
 * from the same function, because a gem the locked sheet never had is no more the lock's business
 * when a pattern is in force than when one is not.
 *
 * Pure, and a list's plan is worked out once per *distinct* colour rather than once per pixel — the same
 * economy `remapColors` makes, spelled out here because a positional pass cannot use it: what a
 * pixel becomes depends on where it is as well as on what colour it is.
 */
export function ditherImage(image: ImageData, reduction: ColorReduction, matrix: ThresholdMatrix): ImageData {
  if (reduction.kind === 'CHANNEL_DEPTH') return ditherChannelDepth(image, reduction.bitsPerChannel, matrix);

  const listed = entriesFor(image, reduction);
  // An empty palette is a sheet with no opaque pixels for a budget to choose from, or a stated
  // palette that failed to parse — which `colorPlanFor` answers with no reduction at all. Either
  // way there is nothing to dither against, and the sheet passes through.
  if (listed.length === 0) return copyOf(image);

  const reach = reduction.kind === 'LOCKED' ? lockReach(reduction.entries, reduction.snap) : null;
  // A lock whose snap reaches nothing leaves every colour as it arrived, as `applyLockedPalette` does.
  if (reduction.kind === 'LOCKED' && reach === null) return copyOf(image);

  const candidates = ditherCandidates(listed);
  // Only a budget's entries are pixels of this sheet, so only a budget's carry a coverage worth
  // writing. The other two are lists of colours — see the note above.
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
      plan =
        reach !== null && lockedEntryFor(color, reach) === null
          ? null
          : mixingPlan(color, candidates, matrix.levels);
      plans.set(key, plan);
    }

    const pixel = offset / CHANNELS_PER_PIXEL;
    const x = pixel % image.width;
    const y = (pixel - x) / image.width;
    writePixel(output.data, offset, chosen(plan, data, offset, matrix, x, y, keepsAlpha));
  }

  return output;
}

/** The three reductions that state their colours as a list, which is what a mixing plan searches. */
type ListReduction = Exclude<ColorReduction, { kind: 'CHANNEL_DEPTH' }>;

/** The colours a list-shaped reduction offers, from wherever that reduction states them. */
function entriesFor(image: ImageData, reduction: ListReduction): readonly Rgba[] {
  switch (reduction.kind) {
    case 'MAX_COLORS':
      return buildPalette(image, reduction.maxColors);
    case 'PALETTE':
    case 'LOCKED':
      return reduction.entries;
  }
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
