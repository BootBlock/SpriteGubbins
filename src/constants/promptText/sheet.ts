import type { AspectRatio, DirectionalMode } from '../../types/output.ts';
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

/**
 * What the component set must assemble into.
 *
 * v1 hardcoded the six-pose list for every mode, which is wrong twice over: a cut-out rig commits to
 * no pose at all — the rig supplies motion — and a tileset assembles into a floor, not a crouch.
 */
export const ASSEMBLY_POSES: Readonly<Record<DirectionalMode, string>> = {
  SINGLE_DIRECTION_POSE_LIBRARY:
    'a neutral standing pose; a relaxed stance; a forward reach; a walking stride with opposing limbs; a running stride with elbow and knee flexion; and both a shallow and a deep crouch.',
  CORE_DIRECTIONAL_VARIANTS:
    'a neutral standing pose; a relaxed stance; a forward reach; a walking stride with opposing limbs; a running stride with elbow and knee flexion; and both a shallow and a deep crouch — in each of the directions listed above.',
  CUTOUT_RIG_SINGLE_DIRECTION:
    'any pose the rig produces by rotating the pieces about their pivots. The artwork commits to none of them, which is why every piece is drawn unposed.',
  TILESET_MODULAR:
    'a continuous floor field, a straight wall run, and both outer and inner corners, with no visible join where tiles meet.',
};
