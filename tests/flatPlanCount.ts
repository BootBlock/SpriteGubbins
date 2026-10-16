import type { Rgba } from '../src/types/quantiser.ts';
import type { ditherCandidates, mixingPlan } from '../src/utils/mixingPlan.ts';

/** The two halves of `mixingPlan.ts` a count needs, from whichever load of the module is in force. */
export interface PlanSearch {
  readonly ditherCandidates: typeof ditherCandidates;
  readonly mixingPlan: typeof mixingPlan;
}

/**
 * How many of an image's distinct colours the palette does not hold, and how many of those get no
 * mixture from the plan search and are drawn flat with their nearest entry.
 *
 * Counted per distinct colour because that is what the search runs once for: `ditherImage` memoises
 * the plan per colour, so this is the share of the searches that found no pair to mix, which is the
 * structural cost `DITHER_SHORTLIST` states for a shortlist of two.
 */
export function flatPlanCount(
  image: ImageData,
  palette: readonly Rgba[],
  search: PlanSearch,
  levels: number,
): { readonly missing: number; readonly flat: number } {
  const held = new Set(
    palette.map(({ r, g, b, a }) => `${String(r)},${String(g)},${String(b)},${String(a)}`),
  );
  const seen = new Set<string>();
  const candidates = search.ditherCandidates(palette);
  let missing = 0;
  let flat = 0;

  for (let offset = 0; offset < image.data.length; offset += 4) {
    const colour = {
      r: image.data[offset] ?? 0,
      g: image.data[offset + 1] ?? 0,
      b: image.data[offset + 2] ?? 0,
      a: image.data[offset + 3] ?? 0,
    };
    const key = `${String(colour.r)},${String(colour.g)},${String(colour.b)},${String(colour.a)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (held.has(key)) continue;
    missing += 1;
    if (search.mixingPlan(colour, candidates, levels).steps === 0) flat += 1;
  }
  return { missing, flat };
}
