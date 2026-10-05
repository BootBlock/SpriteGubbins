import { chunkEntries } from './chunkEntries.ts';

/**
 * Inventory lines cut into the fewest runs of at most `capacity` components, as even as the lines allow,
 * in order and never splitting a line (audit finding T5).
 *
 * **As few runs as `chunkEntries` cuts, and no fuller than they must be.** Filling each run to the brim
 * left whatever was over for a last run of one or two, and a generator handed two icons on a sheet built
 * for sixteen drew them twice the size of the rest. So the largest run is made as small as the run count
 * allows, and then the smallest as large: eighteen icons are two sheets of nine, and a two-state pair
 * that will not divide evenly leaves the runs one apart rather than ten.
 *
 * A line worth more than `capacity` on its own cannot be balanced against anything, so a list holding one
 * is cut as `chunkEntries` cuts it, which gives that line a run to itself.
 */
export function balancedChunks<Line extends { readonly count: number }>(
  entries: readonly Line[],
  capacity: number,
): readonly (readonly Line[])[] {
  const greedy = chunkEntries(entries, capacity);
  const runs = greedy.length;
  if (runs <= 1 || entries.some((entry) => entry.count > capacity)) return greedy;

  const total = entries.reduce((sum, entry) => sum + entry.count, 0);
  let largest = Math.max(Math.ceil(total / runs), ...entries.map((entry) => entry.count));
  while (chunkEntries(entries, largest).length > runs) largest += 1;
  for (let smallest = Math.floor(total / runs); smallest >= 1; smallest -= 1) {
    const cut = cutWithin(entries, runs, smallest, largest);
    if (cut !== null) return cut;
  }
  return greedy;
}

/**
 * The lines cut into exactly `runs` runs each holding between `smallest` and `largest` components, or
 * `null` where no such cut exists — a reachability walk over the line boundaries, one step per run.
 */
function cutWithin<Line extends { readonly count: number }>(
  entries: readonly Line[],
  runs: number,
  smallest: number,
  largest: number,
): readonly (readonly Line[])[] | null {
  // `from[r][end]` is where run `r` began, for a cut whose first `r + 1` runs end at line `end`. The latest
  // start wins, so where a cut can lean either way the earlier sheets are the fuller ones.
  const from: Map<number, number>[] = [];
  let reached = new Set([0]);
  for (let run = 0; run < runs; run += 1) {
    const step = new Map<number, number>();
    for (const start of [...reached].sort((a, b) => a - b)) {
      let filled = 0;
      for (let end = start; end < entries.length; end += 1) {
        filled += entries[end]?.count ?? 0;
        if (filled > largest) break;
        if (filled >= smallest) step.set(end + 1, start);
      }
    }
    from.push(step);
    reached = new Set(step.keys());
  }
  if (!reached.has(entries.length)) return null;

  const cut: (readonly Line[])[] = [];
  let end = entries.length;
  for (let run = runs - 1; run >= 0; run -= 1) {
    const start = from[run]?.get(end) ?? 0;
    cut.unshift(entries.slice(start, end));
    end = start;
  }
  return cut;
}
