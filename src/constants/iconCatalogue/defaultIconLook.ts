import type { IconLook } from '../../types/iconRoster.ts';

/**
 * The look a new icon set is drawn in: ICON's starter roster takes it, and a subject reaching the series
 * with no roster at all falls back to it, so the two can never name different defaults.
 *
 * **Full-bleed**, for the use case the catalogue was built for: a World of Warcraft–style action bar,
 * whose icons are painted squares the bar frames. The isolated mark is one press away in the studio.
 */
export const DEFAULT_ICON_LOOK: IconLook = 'FULL_BLEED_TILE';
