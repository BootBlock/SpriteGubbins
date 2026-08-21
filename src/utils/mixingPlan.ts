import { DITHER_LATTICE_CORNERS, DITHER_SHORTLIST } from '../constants/quantiser.ts';
import type { Rgba } from '../types/quantiser.ts';
import { conesToOklabInto, srgbToConesInto, srgbToOklabInto } from './oklab.ts';
import type { MutableCones, MutableOklab } from './oklab.ts';

/**
 * Yliluoma's arbitrary-palette positional dithering, algorithm 1: the two palette colours and the
 * ratio between them whose *mixture* comes nearest a target colour.
 *
 * Ordered dithering was defined for a palette that is a uniform lattice, where the two colours
 * either side of a value are simply the two adjacent rungs. A sprite palette is nothing of the
 * kind — sixty-four colours chosen from the sheet, or a machine's four fixed greens — so there is
 * no next rung to reach for, and the classic threshold form has nothing to add its offset to.
 * Yliluoma's answer is to search: for every pair of palette colours and every ratio the pattern can
 * express, ask how far the mixture sits from the colour being replaced, and keep the best. What a
 * pixel then takes is decided by its position in the tile alone, which is what makes the result
 * stable across the frames of an animation.
 *
 * **The mixture is taken in linear light and judged in scaled OKLab**, and both halves matter.
 * What a dither asks of the eye is to average the light two alternating pixels emit, and light adds
 * linearly — half black and half white is the linear-light midpoint, sRGB 188, not the 128 an sRGB
 * average gives. Judging it is a question about how far apart two colours *look*, which is the one
 * metric this tab measures every colour distance in (`oklab.ts`), with coverage as a fourth axis on
 * the same scale exactly as `differenceMap` puts it there.
 *
 * **One restriction on the published search, and it is an improvement rather than a compromise.**
 * The published version pairs every colour of the palette with every other, which the article
 * applies to a sixteen-colour palette; this one runs against a palette of up to 128, on a sheet that
 * may carry two hundred thousand distinct colours at a grid of 1. So pairs are drawn from the
 * {@link DITHER_SHORTLIST} colours nearest the target instead — which is both what makes it
 * affordable and what makes it *look* right, because a pair drawn from opposite ends of the palette
 * is optimal only for the whole tile and puts a stray pixel of something wildly different into every
 * small flat region. The measurements are under that constant.
 *
 * **The ratio ladder is walked whole, though, and that is deliberate.** Seeding it from where the
 * target projects onto the straight OKLab line between the two colours looks like the obvious saving
 * and is wrong for exactly the pairs a small palette is made of: mid grey projects 60% of the way
 * from black to white on that line, where the mixture that actually reads as mid grey is 21% white,
 * because the eye averages light and light is what the cube root is taken of. A window around that
 * seed would have missed the answer by two thirds of the ladder on a four-colour palette.
 *
 * Pure, and called once per *distinct* colour of the sheet rather than once per pixel:
 * `ditherImage` owns that memo, as `remapColors` owns the equivalent one for the transforms that
 * need no position.
 */
export interface MixingPlan {
  /** The colour a position takes when its rank is at or above {@link steps}. */
  readonly first: Rgba;
  /** The colour a position takes when its rank is below {@link steps}. */
  readonly second: Rgba;
  /** How many of the tile's levels take {@link second}; `0` makes the plan one flat colour. */
  readonly steps: number;
}

/**
 * A palette prepared for the search: the entries, where each sits on the four axes, and the linear
 * light a mixture is interpolated in.
 *
 * Flat typed arrays rather than an array of objects because the search reads them once per pair per
 * target colour, and that is the one allocation-free path this file has to keep.
 */
export interface DitherCandidates {
  readonly entries: readonly Rgba[];
  /** Four per entry: L, a, b, and coverage on the same 0–255 scale. */
  readonly lab: Float64Array;
  /** Three per entry: the linear cone responses `srgbToConesInto` leaves. */
  readonly cones: Float64Array;
}

/** The palette, converted once — the form {@link mixingPlan} searches. */
export function ditherCandidates(entries: readonly Rgba[]): DitherCandidates {
  const lab = new Float64Array(entries.length * 4);
  const cones = new Float64Array(entries.length * 3);
  const colour: MutableOklab = { L: 0, a: 0, b: 0 };
  const light: MutableCones = { long: 0, medium: 0, short: 0 };

  for (const [index, entry] of entries.entries()) {
    srgbToOklabInto(colour, entry.r, entry.g, entry.b);
    lab[index * 4] = colour.L;
    lab[index * 4 + 1] = colour.a;
    lab[index * 4 + 2] = colour.b;
    lab[index * 4 + 3] = entry.a;
    srgbToConesInto(light, entry.r, entry.g, entry.b);
    cones[index * 3] = light.long;
    cones[index * 3 + 1] = light.medium;
    cones[index * 3 + 2] = light.short;
  }

  return { entries, lab, cones };
}

/** The scratches the search reuses — one set for the life of the module, as `keyDistance.ts` keeps. */
const MIXED: MutableOklab = { L: 0, a: 0, b: 0 };
const TARGET: MutableOklab = { L: 0, a: 0, b: 0 };
const LONGEST_SHORTLIST = Math.max(DITHER_SHORTLIST, DITHER_LATTICE_CORNERS);
const SHORTLIST = new Int32Array(LONGEST_SHORTLIST);
const SHORTLIST_DISTANCE = new Float64Array(LONGEST_SHORTLIST);

/**
 * The best plan for one target colour, over `levels` rungs of ratio.
 *
 * The baseline is the nearest entry taken flat, which is what the palette step would have done with
 * no dither at all — so a plan can only improve on it, and a colour the palette already holds comes
 * back as itself with `steps` of zero rather than as a pattern of two colours that average to it.
 *
 * `pairFrom` is how many of the nearest candidates the pairs may be drawn from, and the default is
 * the one a *list* palette wants. **It is clamped to the larger of the two figures the app actually
 * asks for**, because the shortlist is written into module-scoped scratch arrays sized once at load
 * — so a caller asking for more silently gets that ceiling rather than overrunning them. Neither
 * caller is clamped; a third that wanted a wider search would have to widen the arrays with it. A channel-depth lattice overrides it with the whole corner set for
 * a reason worth knowing: nearness is the wrong ordering there. The eight corners around a grey sit
 * at wildly different distances from it — the corner that raises one channel is much the nearest,
 * and the diagonal corner that raises all three is the furthest of the eight — while the diagonal is
 * the only one whose mixture stays neutral. Drawn from the three nearest, a mid grey came back
 * dithered between grey and *red*. See {@link DITHER_LATTICE_CORNERS}.
 */
export function mixingPlan(
  target: Rgba,
  candidates: DitherCandidates,
  levels: number,
  pairFrom = DITHER_SHORTLIST,
): MixingPlan {
  srgbToOklabInto(TARGET, target.r, target.g, target.b);
  const shortlisted = shortlist(candidates, TARGET, target.a, Math.min(pairFrom, LONGEST_SHORTLIST));
  const nearest = SHORTLIST[0] ?? 0;

  let bestFirst = nearest;
  let bestSecond = nearest;
  let bestSteps = 0;
  let bestPenalty = SHORTLIST_DISTANCE[0] ?? 0;

  for (let a = 0; a < shortlisted; a += 1) {
    for (let b = a + 1; b < shortlisted; b += 1) {
      const from = SHORTLIST[a] ?? 0;
      const to = SHORTLIST[b] ?? 0;

      // From 1 rather than 0, and short of `levels`: both ends are flat colours, and the baseline
      // above already holds the best flat colour there is.
      for (let step = 1; step < levels; step += 1) {
        const penalty = mixPenalty(candidates, from, to, step / levels, TARGET, target.a);
        if (penalty < bestPenalty) {
          bestPenalty = penalty;
          bestFirst = from;
          bestSecond = to;
          bestSteps = step;
        }
      }
    }
  }

  const first = candidates.entries[bestFirst];
  const second = candidates.entries[bestSecond];
  // Only reachable with an empty palette, which `ditherImage` refuses before it gets here.
  if (first === undefined || second === undefined) return { first: target, second: target, steps: 0 };
  return { first, second, steps: bestSteps };
}

/**
 * The `wanted` entries nearest the target, nearest first, written into the module's scratch —
 * returning how many there are, which is fewer than asked for only for a palette smaller than that.
 *
 * An insertion sort over a list that short, rather than a sort of the whole palette: the palette is
 * up to 128 entries and this runs once per distinct colour of the sheet, so the scan is the cost
 * and the ordering is not. Ties keep the earlier entry, which under `buildPalette`'s ordering is
 * the more-used of two equidistant colours.
 */
function shortlist(
  candidates: DitherCandidates,
  target: MutableOklab,
  alpha: number,
  wanted: number,
): number {
  let held = 0;
  for (let index = 0; index < candidates.entries.length; index += 1) {
    const distance = entryPenalty(candidates, index, target, alpha);
    if (held === wanted && distance >= (SHORTLIST_DISTANCE[held - 1] ?? Infinity)) continue;

    let at = Math.min(held, wanted - 1);
    while (at > 0 && (SHORTLIST_DISTANCE[at - 1] ?? Infinity) > distance) {
      SHORTLIST_DISTANCE[at] = SHORTLIST_DISTANCE[at - 1] ?? 0;
      SHORTLIST[at] = SHORTLIST[at - 1] ?? 0;
      at -= 1;
    }
    SHORTLIST_DISTANCE[at] = distance;
    SHORTLIST[at] = index;
    if (held < wanted) held += 1;
  }
  return held;
}

/** How far one entry sits from the target, squared, across colour and coverage. */
function entryPenalty(
  candidates: DitherCandidates,
  index: number,
  target: MutableOklab,
  alpha: number,
): number {
  const dL = (candidates.lab[index * 4] ?? 0) - target.L;
  const dA = (candidates.lab[index * 4 + 1] ?? 0) - target.a;
  const dB = (candidates.lab[index * 4 + 2] ?? 0) - target.b;
  const dAlpha = (candidates.lab[index * 4 + 3] ?? 0) - alpha;
  return dL * dL + dA * dA + dB * dB + dAlpha * dAlpha;
}

/** How far the mixture of two entries at `ratio` sits from the target, squared. */
function mixPenalty(
  candidates: DitherCandidates,
  from: number,
  to: number,
  ratio: number,
  target: MutableOklab,
  alpha: number,
): number {
  const long = mix(candidates.cones, from * 3, to * 3, ratio);
  const medium = mix(candidates.cones, from * 3 + 1, to * 3 + 1, ratio);
  const short = mix(candidates.cones, from * 3 + 2, to * 3 + 2, ratio);
  conesToOklabInto(MIXED, long, medium, short);

  const dL = MIXED.L - target.L;
  const dA = MIXED.a - target.a;
  const dB = MIXED.b - target.b;
  const dAlpha = mix(candidates.lab, from * 4 + 3, to * 4 + 3, ratio) - alpha;
  return dL * dL + dA * dA + dB * dB + dAlpha * dAlpha;
}

/** One channel of the mixture, `ratio` of the way from the first entry to the second. */
function mix(values: Float64Array, from: number, to: number, ratio: number): number {
  const start = values[from] ?? 0;
  return start + ratio * ((values[to] ?? 0) - start);
}
