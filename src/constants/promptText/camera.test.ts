import { describe, expect, it } from 'vitest';
import { DIRECTION_SETS } from '../../types/rendering.ts';
import type { DirectionSet } from '../../types/rendering.ts';
import { DEFAULT_CAMERA_ELEVATIONS, DIRECTION_LISTS } from './camera.ts';
import { OBJECT_YAW } from './rotation.ts';

/**
 * How many facings each direction set actually delivers, once the engine is allowed to flip a sprite.
 *
 * This exists because nothing in the app made that number visible, and the gap cost a real
 * generation. `THREE_CLASSIC` is the default set, it draws object yaws 45°, 90° and 135°, and its
 * tooltip described it as reading "fully turnable" — so a sheet was generated, delivered exactly what
 * was asked for, and had **no view of the character facing the camera**. The set cannot produce one:
 * see the table below.
 *
 * The arithmetic turns on one fact that is easy to miss. **0° and 180° are their own mirror** — a
 * front view flipped horizontally is still a front view — so they buy nothing from the flip, while
 * 45°, 90° and 135° each buy a distinct second facing. That is what makes 45/90/135 the *most
 * efficient* three-view set at six facings, and simultaneously the reason those six can never include
 * the two the player looks at most.
 *
 * A set edited in the belief that it covers more than it does is silent: the prompt asks for exactly
 * what the list says, the model complies, and the missing facing only surfaces when someone tries to
 * assemble the rig. Pinning the reachable set is what turns that into a failing test.
 */
function reachableYaws(set: DirectionSet): number[] {
  const drawn = DIRECTION_LISTS[set].map((direction) => OBJECT_YAW[direction]);
  // The flip is the game engine's, not the sheet's — section 5 of the template forbids the *generator*
  // producing one facing by mirroring another, precisely so the drawn views stay genuinely distinct.
  const mirrored = drawn.map((yaw) => (360 - yaw) % 360);
  return [...new Set([...drawn, ...mirrored])].sort((left, right) => left - right);
}

/** Every set, and every facing it can put on screen. Read this table before changing a list. */
const COVERAGE: readonly (readonly [DirectionSet, readonly number[]])[] = [
  ['SINGLE_FRONT', [0]],
  // Six facings from three drawings, and the two it misses are 0° and 180°.
  ['THREE_CLASSIC', [45, 90, 135, 225, 270, 315]],
  // The two drawings THREE_CLASSIC cannot buy with a flip, bought outright: 0° and 180° are their own
  // mirror, so each costs a view and each adds exactly one facing. Five drawings, all eight facings.
  ['FIVE_CLASSIC', [0, 45, 90, 135, 180, 225, 270, 315]],
  ['FOUR_CARDINAL', [0, 90, 180, 270]],
  ['EIGHT_COMPASS', [0, 45, 90, 135, 180, 225, 270, 315]],
];

/**
 * The screen geometry an orthographic camera at `elevation` above the horizon produces, viewed along
 * a 45° azimuth — the corner-on view every axonometric projection in this app is drawn from.
 *
 * Written out rather than asserted against remembered figures, because the two projections that
 * carry an elevation were *both* wrong before this existed and wrong in the same way: each held a
 * number belonging to the other, and one of the two — 26.57° on `DIMETRIC_2_1` — was not an
 * elevation at all but the angle a 2:1 tile edge makes on screen. A literal cannot tell you which of
 * those it is. A derivation can.
 *
 * Taking the screen's right vector as `(−sin 45°, cos 45°, 0)` and its up vector as
 * `(sin 45° sin θ, sin 45° sin θ, cos θ)`, a unit ground axis lands at
 * `(−cos 45°, cos 45° sin θ)` and the vertical at `(0, cos θ)`. Everything below reads off that.
 */
function screenGeometry(elevation: number): {
  /** How far a ground axis travels down the screen for each unit it travels across. */
  readonly groundSlope: number;
  /** The angle that axis makes with the horizontal, on screen, in degrees. */
  readonly groundAngle: number;
  /** How much wider than tall a square of ground is drawn. */
  readonly tileRatio: number;
  /** The drawn length of a unit ground axis, against which the vertical is compared. */
  readonly groundForeshortening: number;
  /** The drawn length of a unit vertical axis. */
  readonly verticalForeshortening: number;
} {
  const theta = (elevation * Math.PI) / 180;
  const groundSlope = Math.sin(theta);
  const horizontal = Math.cos(Math.PI / 4);

  return {
    groundSlope,
    groundAngle: (Math.atan(groundSlope) * 180) / Math.PI,
    tileRatio: 1 / groundSlope,
    groundForeshortening: Math.hypot(horizontal, horizontal * groundSlope),
    verticalForeshortening: Math.cos(theta),
  };
}

describe('axonometric camera elevations', () => {
  it('stands TRUE_ISOMETRIC where all three axes are foreshortened equally', () => {
    // What "isometric" means, and the only thing it means: one measure along every axis. Any other
    // elevation is some flavour of dimetric wearing the name.
    const { groundForeshortening, verticalForeshortening } = screenGeometry(
      DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
    );

    expect(groundForeshortening).toBeCloseTo(verticalForeshortening, 3);
  });

  it('draws a square of ground at √3:1 under TRUE_ISOMETRIC, its edges at 30° on screen', () => {
    // The consequence a reader can actually check against a generated sheet — and the figure that
    // shows this is *not* the 2:1 grid the option's description used to claim: 1.73 is not 2.
    const { tileRatio, groundAngle } = screenGeometry(DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC);

    expect(tileRatio).toBeCloseTo(Math.sqrt(3), 2);
    expect(groundAngle).toBeCloseTo(30, 1);
  });

  it('stands DIMETRIC_2_1 where a square of ground is drawn exactly twice as wide as it is tall', () => {
    // The pixel-art convention the option is named for, stated as the thing that has to come out
    // right: a 64 × 32 tile tessellates under this camera and under no other.
    const { tileRatio, groundAngle } = screenGeometry(DEFAULT_CAMERA_ELEVATIONS.DIMETRIC_2_1);

    expect(tileRatio).toBeCloseTo(2, 3);
    // 26.57° is this — a screen angle — and it spent a long time sitting in the elevation field
    // instead, which is the confusion this whole block exists to make impossible to repeat.
    expect(groundAngle).toBeCloseTo(26.57, 1);
  });

  it('leaves DIMETRIC_2_1 genuinely dimetric rather than a second spelling of the isometric', () => {
    // Both halves of the name: the two ground axes match each other (guaranteed by the 45° azimuth,
    // so not restated) and the vertical does not match them. If this ever passed by accident the two
    // options would be one camera described twice, which is what the original defect looked like.
    const { groundForeshortening, verticalForeshortening } = screenGeometry(
      DEFAULT_CAMERA_ELEVATIONS.DIMETRIC_2_1,
    );

    expect(groundForeshortening).not.toBeCloseTo(verticalForeshortening, 2);
    expect(DEFAULT_CAMERA_ELEVATIONS.DIMETRIC_2_1).not.toBe(DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC);
  });
});

describe('direction-set coverage', () => {
  it.each(COVERAGE)('%s reaches exactly the facings it claims', (set, expected) => {
    expect(reachableYaws(set)).toStrictEqual([...expected]);
  });

  it('has a row for every set, so the next one added cannot be left out of the table', () => {
    // The table above is hand-written, which is the only way to state what a set is *expected* to
    // reach — but a hand-written table over an open union silently stops covering it. Adding
    // `FIVE_CLASSIC` without this check would have left the set whose whole purpose is its coverage
    // as the one set whose coverage nothing asserted.
    expect(COVERAGE.map(([set]) => set).sort()).toStrictEqual([...DIRECTION_SETS].sort());
  });

  it('offers at least one set that can face the camera and one that can turn its back', () => {
    // The property the app has to keep whatever the sets become: a user who needs a character to look
    // at the player must have somewhere to go. THREE_CLASSIC alone would leave them nowhere, which is
    // why FIVE_CLASSIC and the two compass sets exist.
    const sets = COVERAGE.map(([set]) => set);

    expect(sets.filter((set) => reachableYaws(set).includes(0))).not.toHaveLength(0);
    expect(sets.filter((set) => reachableYaws(set).includes(180))).not.toHaveLength(0);
  });

  it('offers a set that reaches all eight facings without any engine mirroring at all', () => {
    // The property the app has to keep now that the chosen set steers every sheet: a character whose
    // gear makes it asymmetric cannot be mirrored, so its eight facings have to be *drawable* — a
    // set whose own list carries all eight yaws, not one that reaches them through a flip.
    const drawnOutright = DIRECTION_SETS.filter(
      (set) => new Set(DIRECTION_LISTS[set].map((direction) => OBJECT_YAW[direction])).size === 8,
    );
    expect(drawnOutright).toContain('EIGHT_COMPASS');
  });

  it('draws every facing it lists exactly once, so no set pays twice for one view', () => {
    // A list drawing one facing twice would inflate the component count the sheet plan is written
    // against while adding no coverage — and that count is the one arithmetic the whole template
    // rests on.
    //
    // Deduped on the **yaw**, not on the direction's name, because the two are not the same check:
    // `OBJECT_YAW` maps two names onto each of four angles (`front` and `south` are both 0°,
    // `right side` and `west` are both 90°), so a list that mixed the classic and compass
    // vocabularies would hold distinct names and still draw the same view twice.
    for (const [set] of COVERAGE) {
      const yaws = DIRECTION_LISTS[set].map((direction) => OBJECT_YAW[direction]);
      expect(new Set(yaws).size).toBe(yaws.length);
    }
  });
});
