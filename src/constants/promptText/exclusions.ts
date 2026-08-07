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
};
