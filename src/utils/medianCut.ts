import { RGBA_CHANNELS } from '../types/quantiser.ts';
import type { Rgba, RgbaChannel } from '../types/quantiser.ts';
import { colorHistogram, packColor, unpackColor } from './imageData.ts';

/**
 * Choosing the colours an image reduces to, by median cut.
 *
 * **Median cut, not k-means.** k-means generally scores better perceptually, but median cut is
 * *deterministic* — no seeding, no iteration budget, no `Math.random`. That matters twice: the same
 * image always yields the same sheet, which is what a user re-running a batch needs, and the tests
 * can assert an exact palette rather than a tolerance. Every tie below is broken for that reason.
 *
 * **RGB, not a perceptual colour space.** OKLab would place boundaries better on photographic input,
 * and the app now carries the conversion (`oklab.ts` — every tolerance *gate* measures there). This
 * file deliberately still does not use it: sprite sheets after alignment are flat colour regions,
 * where the two agree closely, and a perceptual median cut is half an algorithm — the moment the
 * palette is chosen in one space and applied in another, the two disagree about "nearest". The
 * quantiser roadmap replaces this algorithm wholesale rather than re-plumbing it. A known trade-off
 * rather than an oversight.
 *
 * **No dithering.** The standard companion to quantisation, and wrong here: the prompt template's
 * pixel-discipline block bans exactly the sparkle noise and scattered single-pixel highlights
 * ordered dithering produces. Not offered, rather than offered and defaulted off.
 *
 * Drawing the image in the chosen palette is `applyPalette` in ./applyPalette.ts — a different
 * algorithm over any palette, not only one this file produced.
 */

/** One distinct colour and how many pixels carry it. */
interface ColorEntry {
  readonly color: Rgba;
  readonly count: number;
}

/**
 * The palette the image reduces to: at most `maxColors` colours, every one of them a colour the
 * image already contained.
 *
 * The classic algorithm splits into `2^n` boxes; this variant repeatedly splits **the box with the
 * greatest channel range** until there are `maxColors` of them, so any count works rather than only
 * powers of two.
 *
 * Each box contributes its **most frequent** colour rather than its average. The average is what
 * most implementations use and it is the wrong answer here: it invents a colour that was not in the
 * image, which is exactly what `alignToGrid` refuses to do a step earlier. A sprite reduced to 32
 * colours should be reduced to 32 of *its own* colours.
 */
export function buildPalette(image: ImageData, maxColors: number): readonly Rgba[] {
  const entries: ColorEntry[] = [...colorHistogram(image)].map(([key, count]) => ({
    color: unpackColor(key),
    count,
  }));
  // Already inside the budget: reducing further would discard colours nothing asked to lose.
  if (entries.length <= maxColors) return entries.map((entry) => entry.color);

  const boxes: (readonly ColorEntry[])[] = [entries];
  while (boxes.length < maxColors) {
    const target = widestBox(boxes);
    // Only reachable if every box holds a single colour, which cannot be true while there are fewer
    // boxes than colours. Kept as the loop's termination proof rather than as a live case.
    if (target === null) break;
    boxes.splice(boxes.indexOf(target), 1, ...splitBox(target));
  }

  return boxes.map(representative).filter((color) => color !== null);
}

/** The box with the greatest spread in any one channel, earliest taking a tie; `null` if none splits. */
function widestBox(boxes: readonly (readonly ColorEntry[])[]): readonly ColorEntry[] | null {
  let chosen: readonly ColorEntry[] | null = null;
  let widest = -1;

  for (const box of boxes) {
    if (box.length < 2) continue;
    const { range } = widestChannel(box);
    if (range > widest) {
      widest = range;
      chosen = box;
    }
  }

  return chosen;
}

/** Which channel this box is most spread across, and by how much. */
function widestChannel(box: readonly ColorEntry[]): {
  readonly channel: RgbaChannel;
  readonly range: number;
} {
  let channel: RgbaChannel = 'r';
  let range = -1;

  for (const candidate of RGBA_CHANNELS) {
    let low = Infinity;
    let high = -Infinity;
    for (const entry of box) {
      low = Math.min(low, entry.color[candidate]);
      high = Math.max(high, entry.color[candidate]);
    }
    if (high - low > range) {
      range = high - low;
      channel = candidate;
    }
  }

  return { channel, range };
}

/** Two boxes, cut across the widest channel at the median *pixel*, not the median colour. */
function splitBox(box: readonly ColorEntry[]): readonly (readonly ColorEntry[])[] {
  const { channel } = widestChannel(box);
  // The packed value is a total order over colours, so entries sharing a channel value still sort
  // the same way every run — `sort` alone would only promise to leave them as it found them.
  const sorted = [...box].sort(
    (left, right) =>
      left.color[channel] - right.color[channel] || packColor(left.color) - packColor(right.color),
  );

  const total = sorted.reduce((sum, entry) => sum + entry.count, 0);
  let cut = 0;
  let running = 0;
  for (const entry of sorted) {
    running += entry.count;
    cut += 1;
    if (running * 2 >= total) break;
  }

  // Both halves must hold at least one colour. A cut at either end returns the same box back, and
  // `buildPalette` would keep choosing it without ever reaching `maxColors`.
  const at = Math.min(Math.max(cut, 1), sorted.length - 1);
  return [sorted.slice(0, at), sorted.slice(at)];
}

/** The colour that speaks for a box: the one the most pixels in it carry, earliest winning a tie. */
function representative(box: readonly ColorEntry[]): Rgba | null {
  let chosen: ColorEntry | null = null;
  for (const entry of box) {
    if (chosen === null || entry.count > chosen.count) chosen = entry;
  }
  return chosen?.color ?? null;
}
