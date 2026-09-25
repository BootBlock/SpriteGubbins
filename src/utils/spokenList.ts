/**
 * `A`, `A and B`, `A, B and C` — a list as a sentence says it, with no serial comma.
 *
 * One copy, because three modules wrote it out: the hardware section names the palette entries it
 * withholds, a vehicle's part library names the positions its moving parts are drawn in, and a
 * character's sheets name the trunk pieces and limbs they draw.
 */
export function spokenList(items: readonly string[]): string {
  const last = items.at(-1) ?? '';
  return items.length < 2 ? last : `${items.slice(0, -1).join(', ')} and ${last}`;
}
