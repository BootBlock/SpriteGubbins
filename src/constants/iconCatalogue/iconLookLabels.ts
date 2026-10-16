import type { IconLook } from '../../types/iconRoster.ts';

/**
 * What each look reads as on its pill in the studio's *Icons on this set* section, and in the look
 * control's guidance card, which names each by this label rather than copying it.
 */
export const ICON_LOOK_LABELS: Readonly<Record<IconLook, string>> = {
  FULL_BLEED_TILE: 'Full-bleed tile',
  ISOLATED_MARK: 'Isolated mark',
};
