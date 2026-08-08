import type { ComponentEntry, ComponentKind } from '../../types/components.ts';
import { DIRECTION_LISTS } from '../promptText/camera.ts';
import { DIRECTIONAL_VARIANTS_SET } from '../promptText/inventory.ts';

/**
 * The two entry shapes every `CORE_DIRECTIONAL_VARIANTS` plan is built from, written against the
 * direction set the mode actually covers.
 *
 * Every category that has such a plan — six of the seven — describes the same thing in the same two
 * ways, a piece drawn once per facing,
 * either spelling the facings out or referring to them — and every one of them used to write the
 * count and the facing names by hand. That is three spellings of one fact: the set in
 * `DIRECTION_LISTS`, the names in the entry text, and the number in `count`. Widening the core from
 * three views to five had to change all three in fourteen entries across six files, and a missed one
 * is silent: the sheet asks for five views in section 3 and lists three in section 4, and the model
 * resolves the contradiction however it likes.
 *
 * Deriving them here leaves one spelling. A sixth view added to the set changes every plan's text
 * and every plan's count in the same edit, because there is only one edit to make.
 */

/** The facings a directional-variants sheet draws, in the order section 3 lists them. */
const FACINGS = DIRECTION_LISTS[DIRECTIONAL_VARIANTS_SET];

/** How many components one piece of geometry costs when it is drawn at every facing. */
const VIEWS_PER_PIECE = FACINGS.length;

/**
 * A piece drawn at each facing, with the facings named — `Heads: front, front-three-quarter, …`.
 *
 * Used for the pieces that carry the sheet's identity, where naming the views is what stops a
 * generator returning the same drawing several times over with the details moved.
 */
export function viewsOf(label: string, kind: ComponentKind): ComponentEntry {
  return { text: `${label}: ${FACINGS.join(', ')}`, count: VIEWS_PER_PIECE, kind };
}

/**
 * A piece drawn at each facing, referring to them rather than repeating them — `Handle, at each of
 * the yaws section 3 lists`.
 *
 * Used for the secondary pieces, where a second full list of facings on every bullet costs tokens in
 * the section a model is already reading as a list.
 */
export function atEachYaw(label: string, kind: ComponentKind): ComponentEntry {
  return { text: `${label}, at each of the yaws section 3 lists`, count: VIEWS_PER_PIECE, kind };
}
