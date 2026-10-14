import type { LookFamily } from '../../types/iconCatalogue.ts';

/**
 * Which look family each of ICON's *World & Era* options draws its icons from.
 *
 * **Keyed by the pool's own values**, and `iconCatalogue.test.ts` holds the two to each other in both
 * directions: an option with no family would draw every icon from the hand-typed fallback, and a key
 * the pool does not offer is a family nothing reaches. A value the reader types that is not here takes
 * that fallback — the role, drawn as the stated world would make it — which is honest where a guess at a
 * family would not be.
 *
 * The worlds inside a family differ in mood rather than in what an object is: a grim-dark potion and a
 * storybook potion are both a stoppered bottle, and section 1's *World & Era* line already carries the
 * mood. `Post-Apocalyptic Salvage` is filed under `MODERN` because its objects are today's, worn and
 * patched; `Deep Ocean Voyage` under `AGE_OF_STEAM` because its objects are brass, rivets and canvas.
 */
export const LOOK_FAMILY_OF_WORLD: Readonly<Record<string, LookFamily>> = {
  'High Fantasy': 'FANTASY',
  'Grim Dark Fantasy': 'FANTASY',
  'Medieval Historical': 'FANTASY',
  'Mythic Antiquity': 'FANTASY',
  'Feudal East Asia': 'FANTASY',
  'Mesoamerican Jungle': 'FANTASY',
  'Cosy Storybook': 'FANTASY',
  'Age Of Sail': 'AGE_OF_STEAM',
  'Victorian Gaslamp': 'AGE_OF_STEAM',
  'Wild West Frontier': 'AGE_OF_STEAM',
  'Deep Ocean Voyage': 'AGE_OF_STEAM',
  'Modern Day': 'MODERN',
  'Post-Apocalyptic Salvage': 'MODERN',
  'Near-Future Cyberpunk': 'CYBERPUNK',
  'Far-Future Space Opera': 'SPACE_OPERA',
};

/**
 * The look family a world draws from, matched trimmed and case-folded as `plansFor` matches an
 * assembly base, or `null` for a world the table does not name.
 */
export function lookFamilyOfWorld(world: string): LookFamily | null {
  return FAMILY_BY_FOLDED_WORLD.get(world.trim().toLowerCase()) ?? null;
}

/** The table keyed by each world case-folded, so a lookup folds only the world it is asked about. */
const FAMILY_BY_FOLDED_WORLD: ReadonlyMap<string, LookFamily> = new Map(
  Object.entries(LOOK_FAMILY_OF_WORLD).map(([world, family]) => [world.toLowerCase(), family]),
);
