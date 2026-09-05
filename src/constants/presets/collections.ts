import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import { CATEGORY_OPTIONS } from '../categories/index.ts';

/**
 * How the Presets tab divides the library into the list it puts down its left-hand side.
 *
 * The divisions are the app's own subject categories, and that is deliberate rather than
 * convenient: a preset's category already decides which field labels and option pools apply to it,
 * so it is the one axis along which two presets are genuinely comparable. Inventing a second
 * taxonomy — "sci-fi", "technical", "showcase" — would give the same library two contradictory
 * shapes and leave every new preset needing a judgement call.
 *
 * **There is no collection for the reader's own presets, and there used to be.** Everything a
 * reader saves is now filed under a project and shown on the Projects view, which is a taxonomy
 * they wrote rather than one the app imposed — so this library is the built-in archetypes alone,
 * and every collection here is a category. So a preset's collection is now simply its category, read
 * where it is needed rather than through a function standing for a field read.
 *
 * The labels come from `CATEGORY_OPTIONS` for the same reason. They are what the studio's own
 * category selector says, so the collection a user picks here is named the same as the category
 * they land in over there; a shorter wording invented for the sidebar would be a second vocabulary
 * for one concept.
 */

export type PresetCollectionId = (typeof SUBJECT_CATEGORIES)[number];

/** Every collection, in the categories' own canonical order. */
export const PRESET_COLLECTION_IDS: readonly PresetCollectionId[] = SUBJECT_CATEGORIES;

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
  return CATEGORY_OPTIONS[id].label;
}
