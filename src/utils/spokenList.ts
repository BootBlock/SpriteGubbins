/**
 * `A`, `A and B`, `A, B and C` — items as a sentence lists them, with no serial comma.
 *
 * One copy, because the prompt lists things in four places — a sheet's positions, a trunk's pieces,
 * the colours near a background key — and each had written the same two lines of its own.
 */
export function spokenList(items: readonly string[]): string {
  const last = items.at(-1) ?? '';
  return items.length < 2 ? last : `${items.slice(0, -1).join(', ')} and ${last}`;
}
