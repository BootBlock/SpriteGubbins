import { describe, expect, it } from 'vitest';
import type { DirectionSet } from '../../types/rendering.ts';
import { DIRECTION_LISTS } from './camera.ts';
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
  ['FOUR_CARDINAL', [0, 90, 180, 270]],
  ['EIGHT_COMPASS', [0, 45, 90, 135, 180, 225, 270, 315]],
];

describe('direction-set coverage', () => {
  it.each(COVERAGE)('%s reaches exactly the facings it claims', (set, expected) => {
    expect(reachableYaws(set)).toStrictEqual([...expected]);
  });

  it('offers at least one set that can face the camera and one that can turn its back', () => {
    // The property the app has to keep whatever the sets become: a user who needs a character to look
    // at the player must have somewhere to go. THREE_CLASSIC alone would leave them nowhere, and the
    // tooltip is what points them at the compass sets instead.
    const sets = COVERAGE.map(([set]) => set);

    expect(sets.filter((set) => reachableYaws(set).includes(0))).not.toHaveLength(0);
    expect(sets.filter((set) => reachableYaws(set).includes(180))).not.toHaveLength(0);
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
