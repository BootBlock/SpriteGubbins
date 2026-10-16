import type { IconColourMode } from '../../types/iconRoster.ts';

/**
 * What each colour mode reads as on its pill in the studio's *Icons on this set* section, and in the
 * colour control's guidance card, which names each by this label rather than copying it.
 */
export const ICON_COLOUR_MODE_LABELS: Readonly<Record<IconColourMode, string>> = {
  FULL_COLOUR: 'Full colour',
  TINT_MASK: 'Tint mask',
};
