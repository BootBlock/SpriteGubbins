import type { SubjectCategory } from '../../types/subject.ts';

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
  // The one category with no directional mode, so this never reaches a compiled prompt today — every
  // TERRAIN pairing covers a single facing, and section 3's landmark block sits behind
  // `[IF:MULTI_DIRECTION]`. Written for the sheet it *would* describe rather than left as a
  // placeholder, and written honestly: a tile has no front at all, and saying it does would be the
  // loose wording this record exists to replace.
  TERRAIN:
    'a tile has no front — it is laid flat and read from above, and its sides are named by the compass edge they sit on rather than by any facing; a landform piece’s front is the exposed face the camera sees, the rock wall, the cut bank or the outward side of an outcrop, and its rear is the buried side the ground behind it hides.',
  // Behind `[IF:MULTI_DIRECTION]` and therefore never emitted, as INTERFACE's and TERRAIN's are:
  // all three of these categories are bound to `SINGLE_FRONT`. The entries are written honestly
  // rather than left as filler, because the record is exhaustive and the next reader of it has no
  // way to tell a placeholder from an answer.
  PORTRAIT:
    'the front is the face — the brow, the eyes, the nose and the mouth; the rear is the back of the head and the fall of the hair. The turn stated in section [SEC:SUBJECT] is the sitter’s own pose within a fixed frame and never a rotation of the camera.',
  ICON: 'an icon has no front and no rear — it is a mark drawn flat into its cell, and the angle the depicted object is shown at is fixed by the projection in section [SEC:CAMERA] for every member of the set at once.',
  BACKGROUND:
    'the front is the face of the band that meets the camera; a band has no rear — it is a plane standing at a distance, and what is behind it is the next band back rather than its own far side.',
};
