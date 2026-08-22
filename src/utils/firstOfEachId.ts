/**
 * The first entry under each id, discarding any later one that repeats it.
 *
 * **Storage collapses a repeated id and the store does not, so without this the app reports a
 * collection it does not hold.** SQLite's `INSERT OR REPLACE` against a primary key keeps one row
 * per id, the localStorage fallback keeps every entry it is handed, and a store shows whatever the
 * parser returned — so a hand-edited or concatenated pack with two entries under one id was
 * announced as two, listed as two, stored as one on SQLite and as two indistinguishable rows on the
 * fallback, where deleting either removed both.
 *
 * Deduplicating in the parser rather than in a backend is what makes the two agree: each is handed a
 * collection the id is unique in, which is the shape both already assume. Shared by the two pack
 * formats because both collections are keyed that way and the answer is the same for each.
 *
 * **First wins, not last.** A pack is read top to bottom, so the first entry under an id is the one
 * a reader looking at the file would expect to survive.
 */
export function firstOfEachId<T extends { readonly id: string }>(entries: readonly T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}
