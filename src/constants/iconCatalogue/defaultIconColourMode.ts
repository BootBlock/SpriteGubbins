import type { IconColourMode } from '../../types/iconRoster.ts';

/**
 * How a new icon set is coloured: ICON's starter roster takes it, a stored roster without a colour mode
 * falls back to it, and so does a subject reaching the series with no roster at all, so the three can
 * never name different defaults.
 *
 * **Full colour**, because most sets are drawn once for every player. A multiplayer HUD that tints its
 * markers by team is one press away in the studio.
 */
export const DEFAULT_ICON_COLOUR_MODE: IconColourMode = 'FULL_COLOUR';
