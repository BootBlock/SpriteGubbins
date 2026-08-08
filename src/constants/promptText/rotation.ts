import type { Direction } from '../../types/rendering.ts';
import type { SubjectCategory } from '../../types/subject.ts';

/**
 * What a *direction* means geometrically: how far the component turns, and what that turn puts in
 * front of the camera.
 *
 * The defect this exists to fix: section 3 used to say only "one camera, unchanged … elevation,
 * azimuth … identical across all of them", which a generator reads as *every component faces the
 * same way* — so a front-three-quarter, a right-side and a back-three-quarter head all came back at
 * the same three-quarter angle with only their details changed. Camera azimuth and object yaw are
 * two different quantities, and the prompt now names them separately: the camera is fixed, the
 * component turns beneath it.
 */

/**
 * Object yaw per facing, in degrees, measured from the component **facing the camera** at `0°`.
 *
 * A magnitude, not a signed angle. Which way the component turns is fixed by the facing's own name
 * and stated in {@link FACING_TEXT}, and the two direction sets genuinely turn opposite ways: at
 * `90°` the compass sets present the subject's *left* side (`west` faces screen-left) while the
 * classic set presents its *right* (`right side` means the right side faces the camera). Only one
 * set ever reaches a single sheet — `sheetDirections` resolves to one list — so the two senses never
 * appear together, and a signed axis would only have bought `315°, 270°, 225°` in place of the
 * classic sets' plain `45°, 90°, 135°`.
 *
 * The three-quarter facings are `45°` and `135°`, not `0°` and `180°`: `front-three-quarter` is a
 * *turned* pose — that is why `DEPTH_ORDER_TEXT` distinguishes a near side from a far one for it
 * and does not for `front`, where both sides are equally near.
 */
export const OBJECT_YAW: Readonly<Record<Direction, number>> = {
  front: 0,
  'front-three-quarter': 45,
  'right side': 90,
  'back-three-quarter': 135,
  back: 180,
  south: 0,
  'south-west': 45,
  west: 90,
  'north-west': 135,
  north: 180,
  'north-east': 225,
  east: 270,
  'south-east': 315,
};

/**
 * What each yaw presents to the camera, and what it hides.
 *
 * The occlusion half is the load-bearing half. A direction *name* can be satisfied by a flattering
 * three-quarter view with a few details moved; "front-facing features are mostly turned away" cannot.
 * Reads after "**Back-three-quarter — object yaw 135°.**", so each begins mid-thought.
 */
export const FACING_TEXT: Readonly<Record<Direction, string>> = {
  front:
    'Squarely towards the camera: the front is fully presented, both sides are edge-on, and no part of the rear is visible.',
  'front-three-quarter':
    'Turned so the front is angled towards the camera with the subject’s **right** side leading: front and right side both read, the left side is largely hidden, and the rear is not visible.',
  'right side':
    'Turned until the subject’s **right** side squarely faces the camera — it therefore faces screen-right. The front reads only as a profile edge, and the left side is completely hidden.',
  'back-three-quarter':
    'Turned until the rear is angled towards the camera, the **right** side still leading: rear surfaces dominate, and front-facing features are mostly turned away and heavily foreshortened.',
  back: 'Turned squarely away from the camera: the rear is fully presented, both sides are edge-on, and no front-facing feature is visible at all.',
  south:
    'Squarely towards the camera: the front is fully presented, both sides are edge-on, and no part of the rear is visible.',
  'south-west':
    'Turned so the front is angled towards the camera with the subject’s **left** side leading: front and left side both read, the right side is largely hidden, and the rear is not visible.',
  west: 'Turned until the subject’s **left** side squarely faces the camera — it therefore faces screen-left. The front reads only as a profile edge, and the right side is completely hidden.',
  'north-west':
    'Turned until the rear is angled towards the camera, the **left** side still leading: rear surfaces dominate, and front-facing features are mostly turned away and heavily foreshortened.',
  north:
    'Turned squarely away from the camera: the rear is fully presented, and no front-facing feature is visible at all.',
  'north-east':
    'Turned until the rear is angled towards the camera, the **right** side still leading: rear surfaces dominate, and front-facing features are mostly turned away and heavily foreshortened.',
  east: 'Turned until the subject’s **right** side squarely faces the camera — it therefore faces screen-right. The front reads only as a profile edge, and the left side is completely hidden.',
  'south-east':
    'Turned so the front is angled towards the camera with the subject’s **right** side leading: front and right side both read, the left side is largely hidden, and the rear is not visible.',
};

/**
 * Which end of a component is its front, per category.
 *
 * A generator cannot check that a component rotated unless it knows which part of it points forward,
 * and "front" is not the same landmark for a creature, a doorway and a pistol. Keyed by category
 * rather than written once generically, because the generic version — "its forward-facing surface" —
 * is precisely the loose wording that let three views face the same way.
 */
export const LANDMARK_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER:
    'a head’s front is the face and its rear the back of the skull and the neck socket; a torso’s front is the chest and its rear the spine and shoulder blades; a pelvis’s front is the abdomen and its rear the seat and the small of the back; a foot’s front is the toes.',
  CREATURE:
    'a head’s front is the jaws, beak, muzzle or mandibles and its rear the back of the skull and the neck socket; a torso’s front is the chest and forward shoulder girdle and its rear the dorsal ridge and the rear body join; a pelvis’s front is the join to the torso and its rear the hind or tail end.',
  OBJECT:
    'the front is the face the object presents in use or on display; the rear is what sits behind it — the back panel, the mounting side, the surface never meant to be seen.',
  ITEM: 'the front is the working or presenting end — the blade, the muzzle, the face of the dial, the opening; the rear is the butt, the grip end, or the closed back.',
  BUILDING:
    'the front is the entrance façade — the door, the main frontage, the side a visitor approaches; the rear is the back wall and its service side.',
  // The one category whose landmark the template's own wording already describes: a vehicle's front
  // axis *is* the end that leads when it moves forward. Said in its own vocabulary anyway, because
  // "the end that would lead" is a hypothetical for a chest and a fact for a hull, and a mount that
  // traverses independently of the hull is the piece most likely to be drawn facing the camera in
  // every view.
  VEHICLE:
    'a hull’s front is the nose, prow or bow — the end that leads in travel and the end the driving position looks out of — and its rear is the engine deck, tail or transom; a turret or working mount’s front is its muzzle, boom or working end, which turns independently of the hull beneath it; a drive unit’s front is its leading edge in the direction of travel.',
  // **This one reaches no prompt today, and saying so is the point.** The block it sits in is gated
  // on `MULTI_DIRECTION`, which is set only where one sheet carries more than one facing — and EFFECT
  // offers `SINGLE_DIRECTION_POSE_LIBRARY` alone, whose coverage is always a single facing. The
  // `Record` is exhaustive, so the entry is required either way; what it must not be is a lie told to
  // satisfy the compiler. It is written as the honest answer for the day a multi-facing effect mode
  // exists, and it is deliberately about the *direction of travel* rather than about occluded
  // surfaces, because an effect has none of those to hide.
  EFFECT:
    'an effect’s front is the direction it travels, issues or is aimed — the leading edge of a cone, the tip of a trail, the side of a burst nearest whatever it struck — and its rear is the source it came from: the muzzle, the hand, the point of impact. A radial effect that is the same in every direction has no front axis at all, and states its orientation through what trails behind it rather than through the burst itself.',
  // **Currently unreachable, and written properly anyway.** This whole block sits behind
  // `[IF:MULTI_DIRECTION]`, and INTERFACE supports only single-facing sheet modes — so no
  // configuration a user can reach emits this line. The record is exhaustive over the category
  // union, so the entry has to exist; the choice is between a correct sentence and a placeholder,
  // and a placeholder is what would ship the day a directional mode is added here.
  INTERFACE:
    'a widget’s front is the face it presents to the player — the lit surface, the side the glyph sits on, the side a pointer meets — and its rear is the back plate, the mounting side an interface never shows; a cursor’s front is its point.',
};
