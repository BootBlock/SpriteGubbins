import { channelLevels } from './channelLevels.ts';

/**
 * The rung each channel value 0–255 lands on at a channel depth: a table of 256, indexed by value.
 *
 * Resolved per channel *value* rather than per colour, because 256 entries answer for every colour
 * there is and the table does not depend on any image. `snapToChannelDepth` redraws a sheet with it,
 * and `blendSnap` keeps an anti-aliased blend to the same space with it — one table, so the two
 * cannot disagree about which rung a value belongs to.
 */
export function channelRungs(bitsPerChannel: number): readonly number[] {
  const levels = channelLevels(bitsPerChannel);
  return Array.from({ length: 256 }, (_, value) => nearestLevel(value, levels));
}

/** The rung nearest a channel value, the lower one taking a tie. */
function nearestLevel(value: number, levels: readonly number[]): number {
  let chosen = value;
  let shortest = Infinity;
  for (const level of levels) {
    const distance = Math.abs(value - level);
    if (distance < shortest) {
      shortest = distance;
      chosen = level;
    }
  }
  return chosen;
}
