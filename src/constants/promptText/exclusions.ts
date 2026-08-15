import type { SubjectCategory } from '../../types/subject.ts';

/**
 * What the exclusions section bans, per category.
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
  // The lettering ban is this category's own, and it is the one exclusion here that repeats section 0
  // deliberately. Every real-world member of this category is labelled, so a generator asked for a
  // button has to be told twice that the words go on at runtime — an atlas with "CONFIRM" baked into
  // a sprite can only ever be used for that one string, in that one language.
  INTERFACE:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery; any character, creature or hand reaching for the interface; any gameplay art, portrait or map inside a frame; and any lettering, numeral, caption or legend on a component.',
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
  // The second sentence is this category's alone, and it is load-bearing rather than reassurance:
  // this is the one subject whose components *are* frames and borders, and section 0 forbids drawing
  // one around the image or around a component. Those are two different things, and saying so where
  // the inventory is about to list a panel frame is what stops a generator resolving the apparent
  // conflict by delivering a panel with no edge.
  INTERFACE:
    'Every entry below is a piece of this one interface. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow. The frames, borders and panel edges it does list are components — the subject of the sheet, not the annotation section 0 forbids.',
  TERRAIN:
    'Every entry below is a ground tile or a landform piece. An entry describing anatomy, a wall, a roof, a building module or a vehicle part does not belong to this sheet and is an error in this specification, not an instruction to follow.',
};

/**
 * The category check the self-audit adds.
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
  // fail the sheet on an entry section 4 required. The exclusion above states the same ban and gets it
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
  // "No floor or terrain tiles" rather than "no tiles", for the same reason VEHICLE's line qualifies
  // every noun in it: a nine-slice sheet's components *are* tiles, so an audit reading "no tiles"
  // would fail a sheet on the entries section 4 required.
  INTERFACE:
    'Every component is a piece of this one interface — no anatomy, floor or terrain tiles, scenery, or gameplay art inside a frame — and no component carries lettering, a numeral or a caption.',
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

/**
 * Whether a frame or a border can be a *component* of this category's sheet rather than annotation
 * drawn around one.
 *
 * Read in exactly one place, and it exists because that place cannot say what section 0 says.
 * Midjourney's `--no` takes things to avoid — a multi-word entry is read as one of them, but never
 * as a *placement* — so the wrapper cannot express "no border **around the image or around a
 * component**", which is a relation to the rest of the sheet rather than a thing. The term is either
 * in the negative prompt and suppressing the subject, or out of it. For every category but one a
 * border is only ever the decorative surround a generator adds to a reference sheet, and excluding
 * it does real work; for INTERFACE it is the panel edge the sheet exists to draw, and `--no border`
 * would return a kit of frames with no frames in it.
 *
 * A record rather than a check on the category at the call site, for the reason every per-category
 * fact in this file is one: the next category is a compile error here until somebody answers for it,
 * where a `category === 'INTERFACE'` would silently answer for it wrongly.
 */
export const FRAME_IS_A_COMPONENT: Readonly<Record<SubjectCategory, boolean>> = {
  CHARACTER: false,
  CREATURE: false,
  OBJECT: false,
  ITEM: false,
  BUILDING: false,
  VEHICLE: false,
  // An effect is drawn as light and particles, never as an edge around something, so a border on one
  // of its frames is the decorative surround this term exists to suppress.
  EFFECT: false,
  INTERFACE: true,
  // A terrain tile has edges but no *border*: the boundary between two materials is painted across
  // the tile, never drawn round it, so a frame on one is the decorative surround this term suppresses.
  TERRAIN: false,
};

/**
 * Whether a *limb* is one of this category's components — read by the two negative blocks, which
 * weight `extra limbs, merged limbs` against a duplication failure only a limbed subject can have.
 *
 * The blocks carried the pair on every category, including the ones whose components are floor
 * tiles, panel frames and effect frames. A negative prompt is a fixed weight spent on whatever is in
 * it, so a term naming a failure the sheet cannot have is not free — the same argument the
 * per-category exclusion, guard and audit records were introduced to make, applied to the one
 * channel that had never been given a category.
 *
 * **This deliberately does not read `PERMITTED_KINDS`, and the reason is what the two questions
 * are.** That table answers which *kind of entry a plan may name*, and it gives `anatomy` to
 * CHARACTER and CREATURE alone — a walker's legs are a vehicle's `mechanism` there, correctly,
 * because the inventory it validates is a machine's. This record answers a different question: what
 * a *generator* will duplicate or fuse while drawing. VEHICLE offers `Walker / Mech` as a class and
 * `Articulated Walker Legs` as a drive base, and a sheet of near-side and far-side drive units is
 * exactly the geometry that comes back with a third leg. Deriving this from the kinds table would
 * have been one fact stated once, and wrong for that sheet.
 *
 * The uncertain cases are settled by which error costs more, because the two are not symmetrical: a
 * term the sheet cannot violate spends a little of a finite channel, while a missing one loses a
 * guard against a wrong sheet. So a category takes the pair wherever its own pools can describe a
 * limbed body. OBJECT's cannot — its subjects are terminals, chests, turrets and traps, and the one
 * articulated module it offers is a named deployable drawn in isolation rather than a body plan for
 * the model to complete.
 */
export const LIMBS_ARE_COMPONENTS: Readonly<Record<SubjectCategory, boolean>> = {
  CHARACTER: true,
  CREATURE: true,
  OBJECT: false,
  ITEM: false,
  BUILDING: false,
  VEHICLE: true,
  EFFECT: false,
  INTERFACE: false,
  TERRAIN: false,
};
