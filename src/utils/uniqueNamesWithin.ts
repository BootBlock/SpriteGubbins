import { nameKey } from './nameKey.ts';

/** A name that already ends in a number in brackets, so a repeat of "Hero (2)" becomes "Hero (3)". */
const NUMBERED = /^(.*\S)\s+\(\d+\)$/;

/**
 * The entries with every name unique inside its scope, renaming a later repeat "Hero (2)".
 *
 * **A name is unique inside one project** (see `findByNameIn`), because a save and a rename pick
 * their target by name: two records with one name leave both acting on whichever the list shows
 * first. A library pack can break that rule where no control can — a hand-edited file, two exports
 * joined together, or two presets from different missing projects re-filed under Default — so the
 * import puts it back here (issue #459).
 *
 * **Renamed, not dropped or refused.** The import replaces the reader's library, so a dropped entry
 * is gone once they confirm, and a refused pack is one they would have to repair by hand. A suffix
 * loses nothing and shows them which saves met.
 *
 * **First wins, as it does for ids**, and every name the file already uses is reserved before any
 * repeat is renamed, so a repeat of "Hero" beside a "Hero (2)" in the file becomes "Hero (3)"
 * rather than taking the name of an entry further down. Names compare by {@link nameKey}, and a
 * blank name clashes with nothing. `maxLength` shortens the name, never the suffix, so a renamed
 * entry still fits a field with a limit.
 */
export function uniqueNamesWithin<T extends { readonly name: string }>(
  entries: readonly T[],
  scopeOf: (entry: T) => string,
  maxLength = Number.POSITIVE_INFINITY,
): T[] {
  const taken = new Map<string, Set<string>>();
  const seen = new Map<string, Set<string>>();
  const namesIn = (names: Map<string, Set<string>>, scope: string): Set<string> => {
    const held = names.get(scope) ?? new Set<string>();
    names.set(scope, held);
    return held;
  };

  for (const entry of entries) namesIn(taken, scopeOf(entry)).add(nameKey(entry.name));

  return entries.map((entry) => {
    const key = nameKey(entry.name);
    const scopeSeen = namesIn(seen, scopeOf(entry));
    if (key === '' || !scopeSeen.has(key)) {
      scopeSeen.add(key);
      return entry;
    }

    const scopeTaken = namesIn(taken, scopeOf(entry));
    const name = nextFreeName(entry.name, scopeTaken, maxLength);
    scopeTaken.add(nameKey(name));
    scopeSeen.add(nameKey(name));
    return { ...entry, name };
  });
}

/** The first "Name (n)", from 2, whose key nothing in `taken` holds. */
function nextFreeName(name: string, taken: ReadonlySet<string>, maxLength: number): string {
  const trimmed = name.trim();
  const base = NUMBERED.exec(trimmed)?.[1] ?? trimmed;
  for (let number = 2; ; number += 1) {
    const suffix = ` (${number})`;
    const candidate = `${base.slice(0, Math.max(0, maxLength - suffix.length)).trimEnd()}${suffix}`;
    if (!taken.has(nameKey(candidate))) return candidate;
  }
}
