import type { JointCapStyle, OverlapMargin } from '../../types/rigging.ts';

/**
 * Rig geometry, in the prose the prompt carries.
 *
 * Both read mid-sentence, so both are lower-case phrases rather than identifiers: "carries a
 * consistent **rounded** cap" and "extends **half a cap radius** past its pivot centre".
 */

export const JOINT_CAP_TEXT: Readonly<Record<JointCapStyle, string>> = {
  ROUNDED: 'rounded',
  SQUARED: 'squared',
  TAPERED: 'tapered',
};

export const OVERLAP_MARGIN_TEXT: Readonly<Record<OverlapMargin, string>> = {
  NONE: 'no distance',
  HALF_CAP: 'half a cap radius',
  FULL_CAP: 'a full cap radius',
};
