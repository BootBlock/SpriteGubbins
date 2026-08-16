import {
  LINE_BRIGHT_SHARE,
  LINE_DARK_SHARE,
  LINE_INK_CEILING,
  LINE_LUMA_GAP,
  LINE_LUMA_RANGE,
  LINE_TRIM_FLOOR,
} from '../constants/quantiser.ts';
import { FULLY_OPAQUE } from './imageData.ts';

/**
 * The luma-skew rescue: whether a cell's vote should keep a minority that is a drawn line.
 *
 * The reported failure is a broken outline. A one-pixel contour rendered at a drifting scale lands
 * astride the mesh, and the cell holding the thinner slice loses the vote to its own body colour —
 * the line survives in one cell and snaps in the next, which no later step can repair. The majority
 * is the right answer for a *surface*; for a cell that holds a surface **and a drawn line over it**,
 * the line is what the artist meant the cell to read as, and this pass is how the vote can tell the
 * two cells apart.
 *
 * Everything is decided from the tally the vote already made — no second walk of the pixels — and
 * every judgement is made in **luma**, the standard measure of how light a colour reads
 * ({@link lumaOf}), because a drawn line is defined by tone against its body, not by hue. The
 * gates, each with its reasoning:
 *
 * - the cell must **span** enough luma to be holding two tones at all ({@link LINE_LUMA_RANGE}) —
 *   the anti-flatness gate that leaves soft shading, and every flat cell, exactly as the vote left
 *   them;
 * - the cell's pixel mass must sit **skewed** to one end of that span by {@link LINE_LUMA_GAP} —
 *   a thin line over a body puts the median with the body, far from the line's own extreme, where
 *   an even mix of two tones is a texture and keeps its majority;
 * - the candidate must hold a **share** of the cell's opaque mass no anti-aliased speckle
 *   reaches — {@link LINE_DARK_SHARE} for a dark line, and the deliberately stricter
 *   {@link LINE_BRIGHT_SHARE} for a bright trim, because generators bloom highlights and thin
 *   shadows. Opaque mass rather than cell area, because a keyed cell's art is the pixels still
 *   carrying colour, and a line's share of *that* is what says whether it was drawn;
 * - the candidate must sit at least {@link LINE_LUMA_GAP} beyond the winner it replaces, so a
 *   surface is never traded for its own shadow;
 * - the candidate must be a line *tone* in absolute terms — ink in the darkest quarter
 *   ({@link LINE_INK_CEILING}), trim in the brightest ({@link LINE_TRIM_FLOOR}) — because a
 *   majority-line cell with a sliver of body is the same tally as a majority-body cell with a
 *   sliver of trim, and only where the tones actually sit can say which one the cell is;
 * - and the bright pass stands aside entirely when the **winner is itself ink**: a cell whose vote
 *   already chose the darkest quarter is a line cell, and installing a trim over it is how a gold
 *   emblem's black border thins away cell by cell. The dark pass keeps the mirror-image power —
 *   overruling a bright winner — deliberately, because a *pale body* carrying an ink slice is
 *   exactly the straddle the rescue exists for, and the cost when the bright winner was really a
 *   trim is a line drawn a cell thick, not a line broken.
 *
 * The two directions cannot both fire — their skew conditions are negations of each other — so dark
 * takes no precedence rule; it simply has the skew that a dark line over a lighter body produces.
 * **Only fully opaque pixels take part.** A keyed cell's winner stays keyed; a translucent bucket —
 * a soft edge a source PNG brought with it — is never a candidate and never shifts the median,
 * because the luma of a nearly invisible pixel's channels says nothing about how it reads; and
 * transparency is never mistaken for the darkest colour in the cell, which its zero channels would
 * otherwise make it.
 */
export function lineAwareWinner(counts: ReadonlyMap<number, number>, winner: number): number | null {
  if (alphaOfPacked(winner) !== FULLY_OPAQUE) return null;

  let opaqueTotal = 0;
  let lowest = 256;
  let highest = -1;
  for (const [key, count] of counts) {
    if (alphaOfPacked(key) !== FULLY_OPAQUE) continue;
    opaqueTotal += count;
    const luma = lumaOf(key);
    if (luma < lowest) lowest = luma;
    if (luma > highest) highest = luma;
  }
  if (highest - lowest < LINE_LUMA_RANGE) return null;

  const median = medianLuma(counts, opaqueTotal);
  const winnerLuma = lumaOf(winner);
  const skew = median - lowest - (highest - median);

  if (skew >= LINE_LUMA_GAP) {
    // The mass sits high, so a qualifying minority at the bottom of the span is a dark line —
    // provided it is *ink*-dark, not merely darker: see {@link LINE_INK_CEILING}.
    let kept: number | null = null;
    let keptLuma = 256;
    for (const [key, count] of counts) {
      if (alphaOfPacked(key) !== FULLY_OPAQUE || count * LINE_DARK_SHARE < opaqueTotal) continue;
      const luma = lumaOf(key);
      // Strictly nearer, so the first-counted colour keeps the cell on a luma tie — the same
      // scan-order determinism the vote itself rests on.
      if (luma < LINE_INK_CEILING && winnerLuma - luma >= LINE_LUMA_GAP && luma < keptLuma) {
        kept = key;
        keptLuma = luma;
      }
    }
    return kept;
  }

  if (-skew >= LINE_LUMA_GAP && winnerLuma >= LINE_INK_CEILING) {
    let kept: number | null = null;
    let keptLuma = -1;
    for (const [key, count] of counts) {
      if (alphaOfPacked(key) !== FULLY_OPAQUE || count * LINE_BRIGHT_SHARE < opaqueTotal) continue;
      const luma = lumaOf(key);
      if (luma >= LINE_TRIM_FLOOR && luma - winnerLuma >= LINE_LUMA_GAP && luma > keptLuma) {
        kept = key;
        keptLuma = luma;
      }
    }
    return kept;
  }

  return null;
}

/**
 * How light a packed colour reads, 0–255: the integer Rec. 601 weighting
 * `(54 R + 183 G + 19 B) >> 8`, in whole numbers so equal inputs are equal everywhere.
 */
export function lumaOf(packed: number): number {
  const r = (packed >>> 24) & 0xff;
  const g = (packed >>> 16) & 0xff;
  const b = (packed >>> 8) & 0xff;
  return (54 * r + 183 * g + 19 * b) >> 8;
}

/** The packed colour's own alpha channel — the low byte of the packing `imageData.ts` defines. */
function alphaOfPacked(packed: number): number {
  return packed & 0xff;
}

/**
 * The luma the cell's opaque pixel mass sits at — the weighted median, interpolated at an exact
 * half-split.
 *
 * The interpolation is the even-mix case, not a refinement. A cell split exactly in half between
 * two tones — a dithered texture, or a boundary the mesh landed astride — has no thin minority in
 * it, but a median read as “the bucket the halfway point lands in” sits on the darker half and
 * makes the whole span look like bright skew. Landing exactly *between* the halves reads the split
 * as balanced, which is what it is; any genuine line leaves the halfway point strictly inside the
 * body's own bucket.
 */
function medianLuma(counts: ReadonlyMap<number, number>, opaqueTotal: number): number {
  const buckets: { luma: number; count: number }[] = [];
  for (const [key, count] of counts) {
    if (alphaOfPacked(key) !== FULLY_OPAQUE) continue;
    buckets.push({ luma: lumaOf(key), count });
  }
  buckets.sort((a, b) => a.luma - b.luma);
  let cumulative = 0;
  for (const [index, bucket] of buckets.entries()) {
    cumulative += bucket.count;
    if (2 * cumulative === opaqueTotal) {
      const next = buckets[index + 1];
      return next === undefined ? bucket.luma : (bucket.luma + next.luma) / 2;
    }
    if (2 * cumulative > opaqueTotal) return bucket.luma;
  }
  return buckets[buckets.length - 1]?.luma ?? 0;
}
