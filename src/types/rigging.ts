/**
 * Cut-out rig parameters.
 *
 * A cut-out rig parents sprite pieces to bones and rotates them at runtime — Godot's
 * `Skeleton2D`/`Bone2D`, Spine, DragonBones, Unity 2D IK. That imposes requirements a pose library
 * does not have, and each union here corresponds to one way a sheet otherwise fails to rig.
 */

/**
 * What the components are for.
 *
 * `POSE_LIBRARY` is v1's only behaviour: rigid segments assembled into poses by hand. `CUTOUT_RIG`
 * adds the rest-orientation, pivot-registration and depth-order rules a bone rig needs. `NONE` is
 * for sheets that are not articulated at all, such as a tileset.
 */
export const RIG_MODES = ['NONE', 'POSE_LIBRARY', 'CUTOUT_RIG'] as const;
export type RigMode = (typeof RIG_MODES)[number];

/**
 * The shape of the cap at a piece's joint end — and therefore where its pivot is, since the pivot is
 * the centre of that cap. Two halves of a joint whose caps differ rotate about different points and
 * visibly slide apart.
 */
export const JOINT_CAP_STYLES = ['ROUNDED', 'SQUARED', 'TAPERED'] as const;
export type JointCapStyle = (typeof JOINT_CAP_STYLES)[number];

/**
 * How far a piece extends past its pivot centre.
 *
 * Segments that butt together exactly show a gap the instant the joint rotates, so some overlap is
 * almost always wanted; `NONE` exists for rigs that mask the joint another way.
 */
export const OVERLAP_MARGINS = ['NONE', 'HALF_CAP', 'FULL_CAP'] as const;
export type OverlapMargin = (typeof OVERLAP_MARGINS)[number];
