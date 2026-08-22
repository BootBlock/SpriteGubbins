import { describe, expect, it } from 'vitest';
import { HISTORY_STORAGE_BUDGET, evictionLengths, trimHistoryToBudget } from './historyEviction.ts';

/** A row whose serialised length is close to `size`, so a budget can be stated in characters. */
function row(id: string, size: number): Record<string, unknown> {
  const overhead = JSON.stringify({ id, prompt_text: '' }).length;
  return { id, prompt_text: 'x'.repeat(Math.max(0, size - overhead)) };
}

describe('trimHistoryToBudget', () => {
  it('keeps every row when the whole collection fits', () => {
    const rows = [row('a', 100), row('b', 100), row('c', 100)];
    expect(trimHistoryToBudget(rows, 10_000)).toEqual(rows);
  });

  it('keeps the newest rows and drops the oldest, because the collection is newest-first', () => {
    const rows = [row('newest', 100), row('middle', 100), row('oldest', 100)];
    // Two rows plus the brackets and the comma between them, and nowhere near a third.
    const kept = trimHistoryToBudget(rows, 2 + 100 + 1 + 100);
    expect(kept.map((entry) => entry['id'])).toEqual(['newest', 'middle']);
  });

  it('returns a prefix whose serialised length is the one it counted', () => {
    // The point of counting per row rather than estimating: the caller writes exactly this string,
    // so a count that were merely close would put the real write back over the quota.
    const rows = [row('a', 300), row('b', 300), row('c', 300)];
    const budget = 700;
    const kept = trimHistoryToBudget(rows, budget);
    expect(JSON.stringify(kept).length).toBeLessThanOrEqual(budget);
    expect(JSON.stringify(rows.slice(0, kept.length + 1)).length).toBeGreaterThan(budget);
  });

  it('returns nothing when even the newest row is over budget', () => {
    // Not clamped to one row: the caller must reject rather than answer an unstorable prompt by
    // writing an empty array over the history the reader already had.
    expect(trimHistoryToBudget([row('huge', 500)], 200)).toEqual([]);
  });

  it('returns nothing for an empty collection', () => {
    expect(trimHistoryToBudget([], HISTORY_STORAGE_BUDGET)).toEqual([]);
  });

  it('defaults to the budget the fallback actually uses', () => {
    // The default is the whole point of the constant — a call site restating 4,000,000 would be the
    // magic value it exists to remove.
    const rows = [row('a', 100)];
    expect(trimHistoryToBudget(rows)).toEqual(trimHistoryToBudget(rows, HISTORY_STORAGE_BUDGET));
  });
});

describe('evictionLengths', () => {
  it('tries the whole collection first, then one fewer', () => {
    // The common case: a store at its ceiling needs to shed one or two rows, and a reader must not
    // pay half their history for that.
    expect(evictionLengths(10).slice(0, 3)).toEqual([10, 9, 7]);
  });

  it('always ends by trying the new prompt on its own', () => {
    for (const count of [1, 2, 5, 17, 178, 200]) {
      expect(evictionLengths(count).at(-1)).toBe(1);
    }
  });

  it('never asks for an empty write', () => {
    for (const count of [1, 2, 5, 17, 178, 200]) {
      expect(evictionLengths(count).every((length) => length >= 1)).toBe(true);
    }
  });

  it('descends strictly, so no length is attempted twice', () => {
    const lengths = evictionLengths(200);
    expect(lengths).toEqual([...lengths].sort((a, b) => b - a));
    expect(new Set(lengths).size).toBe(lengths.length);
  });

  it('bounds a full history to ten attempts, because each one serialises megabytes', () => {
    // The doubling is what buys this. Stepping down one at a time would try 200 lengths against a
    // prompt larger than the quota, each serialising the whole collection on the main thread.
    expect(evictionLengths(200).length).toBeLessThanOrEqual(10);
  });

  it('has nothing to try for an empty collection', () => {
    expect(evictionLengths(0)).toEqual([]);
    expect(evictionLengths(-1)).toEqual([]);
  });
});
