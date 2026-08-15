import type { Direction, DirectionSet, Projection } from '../../types/rendering.ts';

/**
 * The elevation each projection implies, in degrees above the horizon — the three flat projections
 * have no meaningful elevation, so they take zero.
 *
 * Not a starting point the user then overrides freely: the projection above *is* a camera, so for
 * every projection but the angled-overhead one this figure is the only elevation that projection can
 * be drawn at, and `cameraElevationRange` in `elevation.ts` reads it back as both bounds.
 *
 * **The two axonometric figures are derived, and the derivation is worth writing down because both
 * were previously wrong in the same way.** Under an orthographic camera at elevation θ and 45° of
 * azimuth, a ground axis projects to a screen line of slope `sin θ` — so the angle a tile edge makes
 * *on screen* and the angle the camera stands at are different numbers, and swapping them is the
 * mistake to watch for. A square of ground is therefore drawn `1 / sin θ` times wider than it is
 * tall, and the vertical is foreshortened to `cos θ` against each ground axis's
 * `√(½ + ½ sin²θ)`. Setting those two equal gives `sin θ = 1/√3`, so **true isometric stands at
 * arcsin(1/√3) = 35.26°** and lays a square of ground out at √3:1 ≈ 1.73:1, its edges at 30° on
 * screen. Asking instead for the 2:1 diamond the pixel-art convention is built on means
 * `1 / sin θ = 2`, so **the 2:1 dimetric camera stands at 30°** and its edges run at
 * arctan(½) = 26.57° on screen.
 *
 * Both stops previously held the other's screen angle or the other's elevation: `TRUE_ISOMETRIC` sat
 * at the 2:1 camera's 30° while describing the 2:1 diamond, and `DIMETRIC_2_1` sat at 26.57°, which
 * is that camera's *screen* angle rather than the elevation producing it — a legal elevation in the
 * app (`THREE_QUARTER_TOPDOWN` spans 1–89°), just not this projection's, which is what made it
 * survive so long. `camera.test.ts` recomputes both from the geometry above rather than trusting the
 * literals.
 */
export const DEFAULT_CAMERA_ELEVATIONS: Readonly<Record<Projection, number>> = {
  THREE_QUARTER_TOPDOWN: 35,
  PURE_TOPDOWN: 90,
  TRUE_ISOMETRIC: 35.26,
  DIMETRIC_2_1: 30,
  OBLIQUE_45: 0,
  ORTHOGRAPHIC_SIDE: 0,
  ORTHOGRAPHIC_FRONT: 0,
};

/** As many decimal places as the figure needs and no more: `30`, `26.57`, `1.73`, `2`. */
function trim(value: number): string {
  return String(Number(value.toFixed(2)));
}

/**
 * What an axonometric camera at `elevation` does to the ground, in the two measurements a reader can
 * check against a returned sheet: the angle a ground axis makes across the screen, and how much
 * wider than tall a square of ground comes out.
 *
 * **Composed from the elevation rather than written beside it**, because these are the same fact
 * stated twice and section 3 emits both statements adjacently — the projection's description on one
 * line, its elevation on the next. Hand-writing "26.57° on screen" next to an elevation of 30 is
 * precisely the arrangement that produced this whole defect: an option whose description named the
 * 2:1 diamond while its angle named something else, with nothing to notice they had come apart.
 * Now an elevation cannot be edited without the prose following it.
 */
function groundGeometry(elevation: number): string {
  const radians = (elevation * Math.PI) / 180;
  const groundAngle = (Math.atan(Math.sin(radians)) * 180) / Math.PI;
  const tileRatio = 1 / Math.sin(radians);

  return `each ground axis runs at ${trim(groundAngle)}° to the horizontal on screen, so a square of ground is drawn as a diamond ${trim(tileRatio)}× as wide as it is tall`;
}

/**
 * Where the camera stands, and which facings the sheet covers.
 *
 * v1 hardcoded all three, and hardcoded the camera *contradictorily* — "orthographic 3/4 top-down
 * dimetric/isometric" names three mutually exclusive projections in one sentence, which is why
 * consecutive generations disagreed about the angle.
 *
 * The two axonometric entries state their geometry rather than an adjective, and the difference is
 * load-bearing: "equal foreshortening on both ground axes" — what `TRUE_ISOMETRIC` used to say — is
 * true of *both* of them, so it distinguished nothing and was satisfiable by the camera it was not
 * describing. What separates them is whether the **vertical** is measured alike too.
 */
export const PROJECTION_TEXT: Readonly<Record<Projection, string>> = {
  THREE_QUARTER_TOPDOWN:
    'Angled overhead. Both the top and the camera-facing vertical surfaces of forms are visible; the vertical screen axis carries both height and depth',
  PURE_TOPDOWN: 'Directly overhead. Only the top of forms is visible',
  TRUE_ISOMETRIC: `True isometric. The two ground axes and the vertical are all foreshortened equally, and ${groundGeometry(DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC)}`,
  DIMETRIC_2_1: `Two-axis dimetric. The two ground axes are foreshortened equally and the vertical is not, and ${groundGeometry(DEFAULT_CAMERA_ELEVATIONS.DIMETRIC_2_1)}`,
  OBLIQUE_45: 'Front face undistorted, depth projected at 45°',
  ORTHOGRAPHIC_SIDE: 'Flat side elevation, no perspective. Platformer convention',
  ORTHOGRAPHIC_FRONT: 'Flat front elevation, no perspective',
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
