import type { AspectRatio } from '../../types/output.ts';
import type { BackgroundKey } from '../../types/rendering.ts';

/**
 * The sheet itself: what the components sit on, what shape the canvas is, and what the set has to
 * be able to do once it is cut apart.
 */

/**
 * Reads mid-sentence — "Background is uniform … , filling all space between components" — so these
 * are lower-case noun phrases rather than identifiers.
 */
export const BACKGROUND_KEY_TEXT: Readonly<Record<BackgroundKey, string>> = {
  MAGENTA_FF00FF: 'flat magenta #FF00FF',
  PURE_WHITE: 'flat pure white #FFFFFF',
  PURE_BLACK: 'flat pure black #000000',
  TRANSPARENT: 'fully transparent alpha',
};

/** Reads as "… in a wide 16:9 format", so each carries its own article. */
export const ASPECT_TEXT: Readonly<Record<AspectRatio, string>> = {
  WIDE_16_9: 'a wide 16:9',
  SQUARE_1_1: 'a square 1:1',
  TALL_9_16: 'a tall 9:16',
  ULTRAWIDE_21_9: 'an ultrawide 21:9',
};
