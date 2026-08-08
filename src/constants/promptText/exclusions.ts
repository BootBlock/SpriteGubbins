import type { SubjectCategory } from '../../types/subject.ts';

/**
 * What section 8 bans, per category.
 *
 * This used to be one static line naming "backgrounds, environments, ground planes, floor tiles,
 * terrain, sky, props and scenery" for every sheet — including a building tileset, whose entire
 * inventory *is* floor tiles. That prompt required floor tiles in section 4 and prohibited them in
 * section 8, and a generator resolving the contradiction either way produced a sheet the other half
 * of the prompt called a failure.
 *
 * So the environment ban is stated by the categories for which an environment really is scenery, and
 * BUILDING and TERRAIN ban the things that are foreign to *them* instead. Same mechanism as the
 * inventory: the category owns its own rules rather than inheriting another's.
 */
export const CATEGORY_EXCLUSION_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery, architectural modules, and any prop or equipment section 1 does not name.',
  CREATURE:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery, architectural modules, riders, handlers and any harness section 1 does not name.',
  OBJECT:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery, and any character, creature or hand interacting with the object.',
  ITEM: 'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery, and any character, creature or hand holding the item.',
  // No environment ban: this category's components *are* the environment. What is foreign to a
  // building sheet is the inhabitants and their belongings, so those are what it excludes.
  BUILDING:
    'Characters, creatures, vehicles, loose props and clutter; sky, distant landscape and any backdrop behind the structure; and cast shadow onto the ground.',
  // The road surface is named alongside the ground plane because it is the one a vehicle attracts:
  // asked for a tank, a generator that has resisted every other backdrop will still lay a strip of
  // tarmac under the tracks. The motion and exhaust ban is this category's own: both are drawn
  // *outside* the vehicle's silhouette, so either one turns an extractable component into one that
  // bleeds past its cell.
  VEHICLE:
    'Backgrounds, environments, ground planes, road or runway surfaces, terrain, sky, scenery; any driver, pilot, crew or passenger; and any exhaust plume, dust trail, wake, motion blur, speed line or weapon effect.',
  // The *source* is this category's own hazard, and it is the one every other category never has:
  // asked for a muzzle flash, a generator draws the gun behind it; asked for an impact spark, it
  // draws the thing being hit. Neither is scenery, so the environment ban would not have caught it.
  // Note what is deliberately absent here — no ban on glow, emission, sparks or "effects", which
  // VEHICLE's line carries in as many words and which would forbid this sheet's entire subject.
  //
  // **Section 8's own static line had to give way for the same reason**, and that edit is part of
  // this category rather than incidental to it: it read "…glow bleeding beyond a component's
  // silhouette, particle effects", which was true of six categories and became false the moment a
  // seventh could ask for a spark shower in section 4 and be told in section 8 that particle effects
  // were absent from the image entirely. It is now qualified — "any particle effect the inventory in
  // section 4 does not name" — which is the same repair VEHICLE's audit line took, and which leaves
  // the ban exactly as strong for the six whose inventories name none.
  EFFECT:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery; any character, creature, hand, weapon, muzzle, projectile or object the effect plays against or issues from; any damage number, health bar, cursor or other interface element; and any motion blur, speed line or lens flare drawn across a frame.',
  // No environment ban either, and for a sharper version of BUILDING's reason: the ground plane the
  // other five categories forbid is this one's entire deliverable. What a terrain sheet attracts
  // instead is a *composed landscape* — asked for terrain, a generator draws a view of it, and a view
  // cannot be cut into tiles. The landmark clause is scoped to tiles meant to repeat, because the
  // feature library's focal outcrop is deliberately distinctive and is placed once.
  TERRAIN:
    'Characters, creatures, vehicles, buildings and their fittings; sky, horizon and distant landscape; any composed landscape, vista or diorama drawn in place of the component grid; and, on any tile meant to repeat, a landmark distinctive enough to be recognised twice across a laid field.',
};

/**
 * The category guard section 4 carries — a plain statement of what the inventory may contain.
 *
 * Defence in depth, and deliberately cheap: the plan tables already make a contaminated inventory
 * unrepresentable, so this is not what prevents the bug. It is what makes a future one *visible* —
 * if an inventory ever again described another category's components, this sentence sits directly
 * above it saying so, and a reasoning target can act on the contradiction rather than dutifully
 * drawing walls for a character.
 */
export const CATEGORY_GUARD_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER:
    'Every entry below is character anatomy. An entry describing a floor tile, wall, terrain piece, building module or other environment component does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  CREATURE:
    'Every entry below is creature anatomy. An entry describing a floor tile, wall, terrain piece, building module or other environment component does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  OBJECT:
    'Every entry below is a part of this one object. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  ITEM: 'Every entry below is a part of this one item. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  BUILDING:
    'Every entry below is a structural or tile component. An entry describing a head, limb, hand or other anatomy does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  VEHICLE:
    'Every entry below is a part of this one vehicle. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  // The one guard that has to name the exception, because this is the one category whose additional
  // elements are *not* the same kind of thing as its components. A character's extra horn is still
  // anatomy and a vehicle's extra pod is still a part, so "every entry below is anatomy" stays true
  // above the appended block in both. An effect's shockwave ring and scorch decal are not frames —
  // section 4's own additional-anatomy block lists and counts them right below this sentence, so an
  // unqualified "every entry below is a frame" would call the sheet's last components an error in
  // the specification, which is exactly what the sentence tells the reader to act on.
  EFFECT:
    'Every entry below is one frame of this one effect’s sequence — a moment in time, not a piece of a machine — apart from the additional elements the subject itself named, which are listed and counted separately at the end. An entry describing anatomy, a housing, a hatch, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow.',
  TERRAIN:
    'Every entry below is a ground tile or a landform piece. An entry describing anatomy, a wall, a roof, a building module or a vehicle part does not belong to this sheet and is an error in this specification, not an instruction to follow.',
};

/**
 * The category check section 9's self-audit adds.
 *
 * The audit was entirely generic — count, background, text, order, camera — so it verified that a
 * sheet was *well-formed* without ever asking whether it was the right subject. A character sheet
 * that came back as sixteen wall tiles passed every one of those checks.
 */
export const CATEGORY_AUDIT_TEXT: Readonly<Record<SubjectCategory, string>> = {
  CHARACTER:
    'Every component is character anatomy — no floor tiles, walls, terrain, building modules or scenery anywhere on the sheet.',
  CREATURE:
    'Every component is creature anatomy — no floor tiles, walls, terrain, building modules or scenery anywhere on the sheet.',
  OBJECT: 'Every component is a part of this one object — no anatomy, tiles, terrain or scenery.',
  ITEM: 'Every component is a part of this one item — no anatomy, tiles, terrain or scenery.',
  BUILDING:
    'Every component is a structural or tile piece — no characters, creatures, anatomy or loose props.',
  // Every noun here carries its own qualifier, and that is load-bearing rather than wordy: the part
  // library asks for an "exhaust or vent" as a component, so an audit reading "no exhaust" would
  // fail the sheet on an entry section 4 required. Section 8 above states the same ban and gets it
  // right; this line dropped the qualifiers and reintroduced the §4-requires/§9-forbids
  // contradiction these per-category records exist to remove.
  VEHICLE:
    'Every component is a part of this one vehicle — no anatomy, tiles, terrain, scenery or crew, and no exhaust plume, dust trail, wake or motion effect drawn as though it were a component.',
  // Qualified the way VEHICLE's is, and for the same reason: this sheet's components *are* sparks,
  // smoke and glow, so an unqualified "no effects" would fail every sheet on the entries section 4
  // required. What is checked instead is that nothing the effect plays against got drawn with it,
  // and that consecutive frames actually differ — the failure this category can have and no other.
  // Carries the same exception as the guard above, and for the sharper reason: this line is a *check
  // the reader performs*, so an audit reading "every component is a frame" fails the sheet on the
  // scorch decal section 4 required — five of the eight shipped EFFECT presets name one. The
  // qualifiers throughout are load-bearing exactly as VEHICLE's are.
  EFFECT:
    'Every component is a frame of this one effect, or one of the additional elements the subject named — no anatomy, machine parts, tiles, terrain or scenery, and no character, hand, weapon or object for the effect to play against. No two frames are the same drawing at a different brightness, scale, rotation or mirroring.',
  // The second half is this category's own, and it is the check no generic audit can stand in for: a
  // terrain sheet can pass every count, background and ordering test and still be unusable, because
  // seamlessness only shows up when the tiles are laid together. It is stated as an agreement about
  // *edges* rather than as "every tile butts against its own copy", which would be this record's
  // VEHICLE mistake again — a transition tile carries a boundary, so it cannot meet its own copy
  // without a seam, and an audit demanding that fails the sheet on the fourteen tiles section 4
  // requires.
  TERRAIN:
    'Every component is a ground tile or a landform piece — no characters, creatures, anatomy, buildings or vehicles, and nothing drawn as a landscape view rather than as a separate piece. Every tile edge carrying a given material is drawn to the same profile wherever it appears, so any two tiles meeting on that material show no seam, and no tile carries a mark that would be recognised twice across a field.',
};
