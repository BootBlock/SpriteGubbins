import type { Direction, DirectionSet, Projection } from '../../types/rendering.ts';

/**
 * Where the camera stands, which facings the sheet covers, and what that means for depth order.
 *
 * v1 hardcoded all three, and hardcoded the camera *contradictorily* — "orthographic 3/4 top-down
 * dimetric/isometric" names three mutually exclusive projections in one sentence, which is why
 * consecutive generations disagreed about the angle.
 */
export const PROJECTION_TEXT: Readonly<Record<Projection, string>> = {
  THREE_QUARTER_TOPDOWN:
    'Angled overhead. Both the top and the camera-facing vertical surfaces of forms are visible; the vertical screen axis carries both height and depth',
  PURE_TOPDOWN: 'Directly overhead. Only the top of forms is visible',
  TRUE_ISOMETRIC: '2:1 diamond isometric, equal foreshortening on both ground axes',
  DIMETRIC_2_1: 'Two-axis dimetric with unequal foreshortening',
  OBLIQUE_45: 'Front face undistorted, depth projected at 45°',
  ORTHOGRAPHIC_SIDE: 'Flat side elevation, no perspective. Platformer convention',
  ORTHOGRAPHIC_FRONT: 'Flat front elevation, no perspective',
};

/**
 * The elevation each projection implies, in degrees above the horizon. A starting point the user
 * overrides — the three flat projections have no meaningful elevation, so they take zero.
 */
export const DEFAULT_CAMERA_ELEVATIONS: Readonly<Record<Projection, number>> = {
  THREE_QUARTER_TOPDOWN: 35,
  PURE_TOPDOWN: 90,
  TRUE_ISOMETRIC: 30,
  DIMETRIC_2_1: 26.57,
  OBLIQUE_45: 0,
  ORTHOGRAPHIC_SIDE: 0,
  ORTHOGRAPHIC_FRONT: 0,
};

/**
 * The facings each set resolves to, in the order the sheet covers them.
 *
 * Order matters twice over: the first entry is the primary assembly direction the prompt names, and
 * for a cut-out rig it is the only direction on the sheet.
 *
 * Typed as a non-empty tuple so the compiler can take `[0]` as a `Direction` rather than reaching
 * for a fallback that could never fire — a set with no directions would be a direction set that
 * asks for nothing.
 */
export const DIRECTION_LISTS: Readonly<Record<DirectionSet, readonly [Direction, ...Direction[]]>> = {
  SINGLE_FRONT: ['front'],
  THREE_CLASSIC: ['front-three-quarter', 'right side', 'back-three-quarter'],
  // Ascending by yaw, which puts `front` first — and first is load-bearing here rather than merely
  // tidy: the leading entry is the facing the sheet assembles towards and fixes its depth order from,
  // and a set that exists to reach the camera-facing view should assemble towards it.
  FIVE_CLASSIC: ['front', 'front-three-quarter', 'right side', 'back-three-quarter', 'back'],
  FOUR_CARDINAL: ['south', 'west', 'north', 'east'],
  EIGHT_COMPASS: ['south', 'south-west', 'west', 'north-west', 'north', 'north-east', 'east', 'south-east'],
};

/**
 * A list of facings as the prompt states them, e.g. `Front-three-quarter, right side,
 * back-three-quarter`.
 *
 * Derived rather than written out beside {@link DIRECTION_LISTS}, so the prose and the list the
 * compiler walks cannot disagree — and exported, because the compiler narrows the list for
 * single-direction modes and has to describe what it actually asked for.
 */
export function describeDirections(directions: readonly Direction[]): string {
  const joined = directions.join(', ');
  return joined.charAt(0).toUpperCase() + joined.slice(1);
}

/**
 * Which of the subject's sides sits in front of its body, per facing.
 *
 * Keyed by direction rather than by mode because it is a property of *facing*: south-facing puts the
 * front in front, north-facing puts it behind, and the diagonals split. Without it, the near-side
 * pieces render behind the body the moment the subject turns.
 *
 * **It says "pieces", not "arms".** These lines reach section 5 of every cut-out-rig sheet the app
 * composes, and only two categories have arms, a torso and a pelvis to order — a tank rig was told
 * which of its arms rendered in front of its torso. The geometry is the same for every one of them
 * and it is the whole content of the line: whatever the subject carries on the side facing the
 * camera draws over the body, and whatever it carries on the far side draws under it.
 *
 * **Which diagonal puts which side in front is not a choice.** Facing north your right hand points
 * east, so facing south-west it points north-west — away from a camera sitting south of the subject,
 * which makes the *left* side the near one. Derive it rather than picking whichever reads better: a
 * near side that disagrees with the side `rotation.ts` says the same facing presents is a
 * contradiction inside one prompt, and the generator resolves it however it likes.
 */
export const DEPTH_ORDER_TEXT: Readonly<Record<Direction, string>> = {
  front:
    'Facing the camera: every piece carried on the front or the sides of the body renders in front of it.',
  'front-three-quarter':
    'Angled towards the camera: pieces on the near (right) side render in front of the body, pieces on the far side behind it.',
  'right side':
    'In profile with the right side towards the camera: pieces on the right render in front of the body, pieces on the left behind it.',
  'back-three-quarter':
    'Angled away from the camera: pieces on the near (right) side render in front of the body, pieces on the far side behind it, and the rear of the body faces the viewer.',
  back: 'Facing away from the camera: every piece carried on the front or the sides of the body renders behind it, and its rear faces the viewer.',
  south:
    'Facing the camera: every piece carried on the front or the sides of the body renders in front of it.',
  'south-west':
    'Angled towards the camera: pieces on the near (left) side render in front of the body, pieces on the far side behind it.',
  'south-east':
    'Angled towards the camera: pieces on the near (right) side render in front of the body, pieces on the far side behind it.',
  west: 'In profile with the left side towards the camera: pieces on the left render in front of the body, pieces on the right behind it.',
  east: 'In profile with the right side towards the camera: pieces on the right render in front of the body, pieces on the left behind it.',
  north:
    'Facing away from the camera: every piece carried on the front or the sides of the body renders behind it, and its rear faces the viewer.',
  'north-west':
    'Angled away from the camera: pieces on the near (left) side render in front of the body, pieces on the far side behind it.',
  'north-east':
    'Angled away from the camera: pieces on the near (right) side render in front of the body, pieces on the far side behind it.',
};
