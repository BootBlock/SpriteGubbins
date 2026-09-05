/**
 * How the localStorage fallback fits the prompt history into a quota it cannot query.
 *
 * `HISTORY_LIMIT` is a count, and a count is the wrong unit here: a compiled prompt runs to a
 * couple of thousand words, so 200 of them is several times what a browser will store. Measured in
 * Edge against the app's own opening preset — 4,553 words, 29,420 characters a row — the store
 * refused the 179th entry, and because the only trim was `slice(0, HISTORY_LIMIT)` nothing ever
 * shrank: every copy from then on lost the *new* prompt and kept all 178 old ones.
 *
 * The two functions below are the answer, and they are separate because they defend against
 * different things. {@link trimHistoryToBudget} keeps the history from spending the whole quota,
 * which is what would leave the settings and the session with nowhere to go. {@link evictionLengths}
 * handles the quota actually being smaller than the budget assumes — another origin's worth of keys,
 * a browser that offers less, a user near the edge — by retrying the write with fewer entries until
 * one is accepted.
 *
 * The two are pure and take their numbers as arguments, so the tests drive them without a browser.
 * {@link writeHistoryRows} is the third and is not pure — it is the write those two decide the
 * shape of, and it lives here rather than in the backend because the retry loop is the second half
 * of the same defence.
 */
import { STORAGE_KEYS } from './schema.ts';
import { storageRefusal, type WebStorageLike } from './webStorage.ts';

/**
 * How much of the store the prompt history may occupy, in UTF-16 code units — the unit
 * `String.length` reports, and the unit browsers charge `setItem` in.
 *
 * Derived from a measurement rather than picked: growing a probe key until `setItem` threw put the
 * raw ceiling at about 5,200,000 in Edge, which is the usual ~5 MB. 4,000,000 of that leaves about
 * 1,200,000 for everything else this backend stores — the settings, the studio session, the custom
 * presets and the quantiser's — none of which the history may crowd out, because losing the oldest
 * prompt is recoverable and losing the ability to save a setting is not.
 *
 * It belongs to this backend alone. `HISTORY_LIMIT` is shared with the SQLite backend, where a
 * count is the right unit and 200 is fine.
 */
export const HISTORY_STORAGE_BUDGET = 4_000_000;

/**
 * The longest newest-first prefix of `rows` whose serialised form fits `budget`.
 *
 * Serialised cost is counted per row — the row's own JSON, plus the comma separating it from the
 * one before, plus the enclosing brackets — so this is the length `JSON.stringify` will produce for
 * the prefix it returns, not an estimate of it.
 *
 * Returns an empty array when even the newest row is over budget. That is deliberately not clamped
 * to one row: the caller must reject rather than write, because a write of `[]` would answer a
 * prompt too large to store by deleting the history the reader already had.
 */
export function trimHistoryToBudget(
  rows: readonly Record<string, unknown>[],
  budget: number = HISTORY_STORAGE_BUDGET,
): Record<string, unknown>[] {
  const kept: Record<string, unknown>[] = [];
  // The two brackets of the enclosing array, which are there whatever the array holds.
  let used = 2;

  for (const row of rows) {
    const cost = JSON.stringify(row).length + (kept.length === 0 ? 0 : 1);
    if (used + cost > budget) break;
    used += cost;
    kept.push(row);
  }

  return kept;
}

/**
 * The prefix lengths to attempt, longest first, when storage refuses the write.
 *
 * The step doubles — `n`, `n-1`, `n-3`, `n-7`, … — and the sequence always ends at 1. Both halves
 * of that matter. Dropping one entry at a time is what the common case wants: a store at its
 * ceiling usually needs to shed one or two rows to make room for the new prompt, and shedding a
 * fixed fraction instead would cost the reader half their history for one large one. Doubling is
 * what bounds the tail: an entry larger than the whole quota would otherwise be tried against every
 * length from 200 down to 1, each attempt serialising a multi-megabyte array on the main thread.
 * Ten attempts cover a full history, and the last of them is the new prompt on its own.
 *
 * Every length is at least 1, so nothing here can ask the caller to write an empty history.
 */
export function evictionLengths(count: number): number[] {
  if (count < 1) return [];

  const lengths: number[] = [];
  let dropped = 0;
  let step = 1;

  while (count - dropped >= 1) {
    lengths.push(count - dropped);
    dropped += step;
    step *= 2;
  }

  // The doubling overshoots, so the shortest attempt is rarely 1 on its own account. Trying the new
  // prompt alone is the last thing worth doing before giving up on storing it.
  if (lengths[lengths.length - 1] !== 1) lengths.push(1);

  return lengths;
}

/**
 * Store the history in `storage`, keeping as much of it as the browser will actually take.
 *
 * `rows` is newest-first, so every prefix of it is the newest *n* prompts and evicting is a matter
 * of shortening it. The budget decides the first attempt; a refusal past that is storage telling us
 * the budget was optimistic here, and the answer is to try again with fewer entries rather than to
 * lose the prompt the reader just asked for.
 *
 * Nothing is written until an attempt succeeds, so a history too large to store at any length
 * leaves what was already there untouched and rejects — the reader keeps the prompts they had.
 *
 * Rejects rather than throwing synchronously, because the backend's interface promises a `Promise`
 * and a caller attaching `.catch()` to one is entitled to have it run.
 */
export function writeHistoryRows(
  storage: WebStorageLike,
  rows: readonly Record<string, unknown>[],
): Promise<void> {
  const affordable = trimHistoryToBudget(rows);
  if (affordable.length === 0) {
    return Promise.reject(
      new Error(
        `A single prompt exceeds the ${HISTORY_STORAGE_BUDGET}-character budget the history may occupy.`,
      ),
    );
  }

  let refusal: unknown;
  for (const length of evictionLengths(affordable.length)) {
    try {
      storage.setItem(STORAGE_KEYS.promptHistory, JSON.stringify(affordable.slice(0, length)));
      return Promise.resolve();
    } catch (error) {
      refusal = error;
    }
  }

  return Promise.reject(storageRefusal(STORAGE_KEYS.promptHistory, refusal));
}
