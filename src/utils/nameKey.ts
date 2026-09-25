/**
 * What two names are compared by: trimmed and case-insensitive, so "My Knight" and "my knight "
 * are one name.
 *
 * The library displays *names*, not identifiers, and two that differ only in case or a stray space
 * sit next to each other looking like a mistake. One function, because every question about whether
 * a name is taken — {@link findByName} for a save, a rename or a move, and
 * {@link uniqueNamesWithin} for an import — has to give the same answer, and two copies of the
 * comparison would eventually disagree. An empty key is a blank name, which clashes with nothing.
 */
export function nameKey(name: string): string {
  return name.trim().toLowerCase();
}
