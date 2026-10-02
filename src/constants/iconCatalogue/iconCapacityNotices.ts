import { ICON_ROSTER_CAPACITY } from './iconSheetLimits.ts';

/**
 * What the picker says when a tick does not fit in `ICON_ROSTER_CAPACITY` components: under a row
 * that cannot be ticked, and in the notice after a group tick that could not take every icon.
 *
 * A refused tick is never silent. A checkbox that will not tick with no word of why reads as a broken
 * control, and a group ticked short reads as a group ticked whole.
 */
export const ICON_CAPACITY_NOTICES = {
  /** Under a row whose `needed` components do not fit in the `left` the set has room for. */
  row: (needed: number, left: number): string =>
    left === 0
      ? `Your set is full at ${String(ICON_ROSTER_CAPACITY)} components. Untick another icon to make room for this one.`
      : `This icon is drawn as ${String(needed)} components, and your set has room for ${String(left)} more of its ${String(ICON_ROSTER_CAPACITY)}. Untick another icon to make room for it.`,

  /** After a group tick that left `count` icons unticked for want of room. */
  refused: (count: number): string =>
    count === 1
      ? `Your set had no room for one of those icons, so it was left unticked: a set holds at most ${String(ICON_ROSTER_CAPACITY)} components.`
      : `Your set had no room for ${String(count)} of those icons, so they were left unticked: a set holds at most ${String(ICON_ROSTER_CAPACITY)} components.`,
} as const;
