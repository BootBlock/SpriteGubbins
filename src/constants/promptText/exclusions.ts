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
 * BUILDING bans the things that are foreign to *it* instead. Same mechanism as the inventory: the
 * category owns its own rules rather than inheriting another's.
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
  // The lettering ban is this category's own, and it is the one exclusion here that repeats section 0
  // deliberately. Every real-world member of this category is labelled, so a generator asked for a
  // button has to be told twice that the words go on at runtime — an atlas with "CONFIRM" baked into
  // a sprite can only ever be used for that one string, in that one language.
  INTERFACE:
    'Backgrounds, environments, ground planes, floor tiles, terrain, sky, scenery; any character, creature or hand reaching for the interface; any gameplay art, portrait or map inside a frame; and any lettering, numeral, caption or legend on a component.',
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
  // The second sentence is this category's alone, and it is load-bearing rather than reassurance:
  // this is the one subject whose components *are* frames and borders, and section 0 forbids drawing
  // one around the image or around a component. Those are two different things, and saying so where
  // the inventory is about to list a panel frame is what stops a generator resolving the apparent
  // conflict by delivering a panel with no edge.
  INTERFACE:
    'Every entry below is a piece of this one interface. An entry describing anatomy, a floor tile, a wall or a terrain piece does not belong to this sheet and is an error in this specification, not an instruction to follow. The frames, borders and panel edges it does list are components — the subject of the sheet, not the annotation section 0 forbids.',
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
  // "No floor or terrain tiles" rather than "no tiles", for the same reason VEHICLE's line qualifies
  // every noun in it: a nine-slice sheet's components *are* tiles, so an audit reading "no tiles"
  // would fail a sheet on the entries section 4 required.
  INTERFACE:
    'Every component is a piece of this one interface — no anatomy, floor or terrain tiles, scenery, or gameplay art inside a frame — and no component carries lettering, a numeral or a caption.',
};

/**
 * Whether a frame or a border can be a *component* of this category's sheet rather than annotation
 * drawn around one.
 *
 * Read in exactly one place, and it exists because that place cannot say what section 0 says.
 * Midjourney's `--no` takes bare concepts, so the wrapper cannot express "no border **around the
 * image or around a component**" — the term is either in the negative prompt and suppressing the
 * subject, or out of it. For six of the seven categories a border is only ever the decorative
 * surround a generator adds to a reference sheet, and excluding it does real work; for INTERFACE it
 * is the panel edge the sheet exists to draw, and `--no border` would return a kit of frames with no
 * frames in it.
 *
 * A record rather than a check on the category at the call site, for the reason every per-category
 * fact in this file is one: an eighth category is a compile error here until somebody answers for
 * it, where a `category === 'INTERFACE'` would silently answer for it wrongly.
 */
export const FRAME_IS_A_COMPONENT: Readonly<Record<SubjectCategory, boolean>> = {
  CHARACTER: false,
  CREATURE: false,
  OBJECT: false,
  ITEM: false,
  BUILDING: false,
  VEHICLE: false,
  INTERFACE: true,
};
