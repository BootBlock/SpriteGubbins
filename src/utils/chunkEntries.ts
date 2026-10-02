/**
 * Inventory lines cut into consecutive runs of at most `capacity` components, in order, never splitting
 * a line.
 *
 * **A line is a unit**, which is why this closes a run early rather than filling it: a two-state icon is
 * one line worth two components, and its two drawings are a pair the reader compares — half on one
 * sheet and half on the next would put the comparison across two generations. So a run closes the
 * moment the next line would overflow it, and that line opens the next run.
 *
 * Generic over anything that says how many components it is worth, so the test rosters cut the whole
 * catalogue into roster-sized lists by the same rule the series cuts a roster into sheets.
 *
 * A line worth more than `capacity` on its own gets a run to itself, which is an over-full sheet rather
 * than a lost line; nothing the catalogue declares is that large.
 */
export function chunkEntries<Line extends { readonly count: number }>(
  entries: readonly Line[],
  capacity: number,
): readonly (readonly Line[])[] {
  const runs: Line[][] = [];
  let current: Line[] = [];
  let filled = 0;
  for (const entry of entries) {
    if (current.length > 0 && filled + entry.count > capacity) {
      runs.push(current);
      current = [];
      filled = 0;
    }
    current.push(entry);
    filled += entry.count;
  }
  if (current.length > 0) runs.push(current);
  return runs;
}
