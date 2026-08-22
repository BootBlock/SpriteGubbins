import { PROJECTIONS } from '../types/rendering.ts';
import type { Projection } from '../types/rendering.ts';
import type { SubjectCategory } from '../types/subject.ts';

/**
 * Which camera each category's subject can honestly be drawn under.
 *
 * **The fourth of the claims a category can refuse, and the last one nothing narrowed.** The sheet
 * mode goes through `resolveMode`, the rig through `resolveRigMode` and the direction set through
 * `resolveDirectionSet` — each of them added because a setting that survived a category change
 * untouched put a statement into the prompt the subject could not honour. The projection was the
 * one left, so switching the studio to INTERFACE from a default session compiled `Projection: Angled
 * overhead. Both the top and the camera-facing vertical surfaces of forms are visible` and `Camera
 * elevation: 35° above the horizon` above an inventory of button states, a panel frame and a cursor.
 * A widget is screen-space art with no top surface and no depth axis, so that is one prompt
 * disagreeing with itself — the failure the prompt rules exist to prevent, and a worse one than the
 * direction set's, which was merely degenerate.
 *
 * **The camera elevation inherits this without a table of its own.** It is resolved against the
 * *projection* by `resolveCameraElevation`, never against the category, so a projection narrowed
 * here carries the elevation with it: an INTERFACE degrading to `ORTHOGRAPHIC_FRONT` degrades 35°
 * to 0° in the same step, and section 3's two adjacent lines stay one statement about one camera.
 *
 * **Which categories this binds is the whole decision, and it is one.**
 *
 * - **INTERFACE has exactly one camera, and it is `ORTHOGRAPHIC_FRONT`.** `sheetPlans/interface.ts`
 *   settles the premise in its own words — a button "has no facings to turn to", and the sheet a
 *   directional mode would produce is "five drawings of the same flat rectangle". A widget is
 *   composited onto the screen rather than photographed in a world: it has no top for `PURE_TOPDOWN`
 *   to show, no ground plane for the two axonometric cameras to lay out, and no thickness for
 *   `OBLIQUE_45` to project at 45°. `ORTHOGRAPHIC_SIDE` is the same flat camera turned to an edge
 *   that is not drawn. All four shipped INTERFACE presets already pin `ORTHOGRAPHIC_FRONT`, which is
 *   the agreement this table makes unbreakable rather than customary.
 * - **TERRAIN keeps every projection, and binding it would delete a shipped deliverable.** It is the
 *   category that looks bound and is not: `LANDMARK_TEXT.TERRAIN` does say "a tile has no front — it
 *   is laid flat and read from above", and stops there only in the *tile's* clause. Its second
 *   clause is the rest of the category — "a landform piece's front is the exposed face the camera
 *   sees, the rock wall, the cut bank or the outward side of an outcrop" — and the
 *   `side-on-volcanic-cliff` preset is that sheet, drawn at `ORTHOGRAPHIC_SIDE` because "a
 *   platformer's ground is a cliff seen from the side, and an exposed face is exactly what a flat
 *   field has nowhere to put". "Is read from above" is a property of some terrain and not of the
 *   category, and a table cannot tell them apart — which is the argument `CATEGORY_DIRECTION_SETS`
 *   makes about EFFECT, arriving at the opposite answer for the opposite reason. The facings and the
 *   camera are separate questions, and TERRAIN answers them differently: it is bound in that table
 *   and unbound in this one.
 * - **EFFECT keeps every projection**, for the reason that file already gives about it. Its four
 *   shipped presets stand at four different cameras — a flat front burst, an overhead pool, a
 *   side-on slash and a dimetric ground rune — because an effect is drawn to match the world it
 *   plays over, and the world is what the projection is about.
 *
 * **The eight unbound categories take `PROJECTIONS` entire** rather than restating it, so a
 * projection added to the union reaches every subject that can be drawn under it in one edit — and
 * the one that is bound stays bound.
 *
 * **The first entry of each list is load-bearing**: it is what {@link resolveProjection} degrades a
 * stored projection the category cannot honour to, the same way `CATEGORY_DIRECTION_SETS` answers
 * for a set. `THREE_QUARTER_TOPDOWN` leads the union because it is the studio's own opening camera,
 * and for the eight categories taking the union the fallback never fires at all.
 */
export const CATEGORY_PROJECTIONS: Readonly<Record<SubjectCategory, readonly [Projection, ...Projection[]]>> =
  {
    CHARACTER: PROJECTIONS,
    CREATURE: PROJECTIONS,
    OBJECT: PROJECTIONS,
    ITEM: PROJECTIONS,
    BUILDING: PROJECTIONS,
    VEHICLE: PROJECTIONS,
    EFFECT: PROJECTIONS,
    INTERFACE: ['ORTHOGRAPHIC_FRONT'],
    TERRAIN: PROJECTIONS,
  };

/** Whether this category's subject can be drawn under the camera this projection names. */
export function supportsProjection(category: SubjectCategory, projection: Projection): boolean {
  return CATEGORY_PROJECTIONS[category].includes(projection);
}

/**
 * The projection actually used for this category — the one asked for where the subject can be drawn
 * under it, the category's own fallback otherwise.
 *
 * The studio prevents the mismatch, and this is not defence in depth for its own sake — it is the
 * argument `resolveMode` and `resolveDirectionSet` both make: a preset written before this table
 * existed, a history row from an older build, an art style reference applied under a category that
 * cannot honour its camera, or a hand-edited export can all arrive carrying a projection that was
 * legal when it was saved. Substituting degrades such a record to a camera the subject can be drawn
 * under, where the alternative is the self-contradicting prompt this table exists to remove.
 *
 * Every reader of `projection` goes through here — the compiler, the collapsed studio digest, the
 * split drawer's depth-order note and the control itself — so a stale value degrades to one answer
 * rather than to four. The camera elevation is then resolved against *this* answer rather than the
 * stored projection, because the two are one statement and resolving them against different cameras
 * is the disagreement `elevation.ts` was written to end.
 */
export function resolveProjection(category: SubjectCategory, projection: Projection): Projection {
  const offered = CATEGORY_PROJECTIONS[category];
  const [fallback] = offered;
  return offered.includes(projection) ? projection : fallback;
}
