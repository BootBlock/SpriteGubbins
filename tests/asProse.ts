/**
 * `a, b, c and d` — how this repository's documents join a list in prose, with no serial comma.
 *
 * For a suite that derives a sentence from the code and checks a document still says it: the
 * README's tab inventory, and the section and yaw lists in the baseline-prompt document.
 */
export function asProse(items: readonly string[]): string {
  if (items.length < 2) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${String(items.at(-1))}`;
}
