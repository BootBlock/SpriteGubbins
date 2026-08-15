import type { Direction, DirectionSet, Projection } from '../../types/rendering.ts';

/**
 * Where the camera stands, and which facings the sheet covers.
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
 * The elevation each projection implies, in degrees above the horizon — the three flat projections
 * have no meaningful elevation, so they take zero.
 *
 * Not a starting point the user then overrides freely: the projection above *is* a camera, so for
 * every projection but the angled-overhead one this figure is the only elevation that projection can
 * be drawn at, and `cameraElevationRange` in `elevation.ts` reads it back as both bounds.
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
