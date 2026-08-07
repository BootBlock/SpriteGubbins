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
    'Angled overhead. Both the top and the front of forms are visible; the vertical screen axis carries both height and depth',
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
 * Which limbs sit in front of the torso, per facing.
 *
 * Keyed by direction rather than by mode because it is a property of *facing*: south-facing puts
 * both arms in front, north-facing puts both behind, and the diagonals split. Without it, the near
 * arm renders behind the torso the moment the character turns.
 */
export const DEPTH_ORDER_TEXT: Readonly<Record<Direction, string>> = {
  front: 'Facing the camera: both arms render in front of the torso, both legs in front of the pelvis.',
  'front-three-quarter':
    'Angled towards the camera: the near arm renders in front of the torso, the far arm behind it.',
  'right side':
    'In profile: the near arm and leg render in front of the torso and pelvis, the far pair behind them.',
  'back-three-quarter':
    'Angled away from the camera: the near arm renders in front of the torso, the far arm behind it, and the back of the head faces the viewer.',
  south: 'Facing the camera: both arms render in front of the torso, both legs in front of the pelvis.',
  'south-west':
    'Angled towards the camera: the near (right) arm renders in front of the torso, the far arm behind it.',
  'south-east':
    'Angled towards the camera: the near (left) arm renders in front of the torso, the far arm behind it.',
  west: 'In profile: the near arm and leg render in front of the torso and pelvis, the far pair behind them.',
  east: 'In profile: the near arm and leg render in front of the torso and pelvis, the far pair behind them.',
  north:
    'Facing away from the camera: both arms render behind the torso, and the back of the head faces the viewer.',
  'north-west':
    'Angled away from the camera: the near (left) arm renders in front of the torso, the far arm behind it.',
  'north-east':
    'Angled away from the camera: the near (right) arm renders in front of the torso, the far arm behind it.',
};
