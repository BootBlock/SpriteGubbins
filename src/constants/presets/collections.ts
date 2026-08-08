import type { PresetArchetype } from '../../types/preset.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import { CATEGORY_OPTIONS } from '../categories/index.ts';

/**
 * How the Presets tab divides the library into the list it puts down its left-hand side.
 *
 * The divisions are the app's own five subject categories plus one for the user's own presets, and
 * that is deliberate rather than convenient: a preset's category already decides which field labels
 * and option pools apply to it, so it is the one axis along which two presets in the same group are
 * genuinely comparable. Inventing a second taxonomy — "sci-fi", "technical", "showcase" — would give
 * the same library two contradictory shapes and leave every new preset needing a judgement call.
 *
 * The labels come from `CATEGORY_OPTIONS` for the same reason. They are what the studio's own category
 * selector says, so the collection a user picks here is named the same as the category they land in
 * over there; a shorter wording invented for the sidebar would be a second vocabulary for one concept.
 */

/** The collection every user-saved preset belongs to, whatever category it was saved under. */
export const CUSTOM_COLLECTION_ID = 'custom';

export type PresetCollectionId = (typeof SUBJECT_CATEGORIES)[number] | typeof CUSTOM_COLLECTION_ID;

/**
 * Every collection, in the order the list shows them.
 *
 * The categories come first in their own canonical order, and the user's presets last — a growing,
 * initially-empty group belongs at the end of a list, not in the middle of one.
 */
export const PRESET_COLLECTION_IDS: readonly PresetCollectionId[] = [
  ...SUBJECT_CATEGORIES,
  CUSTOM_COLLECTION_ID,
];

/**
 * The collection the tab opens on.
 *
 * Bound to a name rather than read as `PRESET_COLLECTION_IDS[0]` for the same reason `DEFAULT_PRESET`
 * is: under `noUncheckedIndexedAccess` an index read is `PresetCollectionId | undefined`, and the view
 * would need a fallback for a case that cannot happen.
 */
export const DEFAULT_PRESET_COLLECTION: PresetCollectionId = 'CHARACTER';

/** What the list calls a collection. */
export function presetCollectionLabel(id: PresetCollectionId): string {
  return id === CUSTOM_COLLECTION_ID ? 'Your presets' : CATEGORY_OPTIONS[id].label;
}

/**
 * Which collection a preset belongs to.
 *
 * A custom preset goes to `custom` regardless of its category, because "mine" is the thing a user is
 * looking for when they go looking — a saved knight filed under Humanoid Character among a dozen
 * built-in humanoids is a preset they have to hunt for in a list they did not write.
 */
export function presetCollectionOf(preset: PresetArchetype): PresetCollectionId {
  return preset.isCustom === true ? CUSTOM_COLLECTION_ID : preset.category;
}
