import type { StyleReference, StyleReferenceId } from '../../types/styleReference.ts';
import { OVERHEAD_STYLE_REFERENCES } from './overhead.ts';
import { PROJECTED_STYLE_REFERENCES } from './projected.ts';
import { SIDE_ON_STYLE_REFERENCES } from './sideOn.ts';

/**
 * Every published look the studio offers, and the two ways the app reaches them.
 *
 * Assembled from one module per how the game is read — overhead, side-on, projected — exactly as the
 * hardware and palette libraries are assembled per family, and keyed by the whole `StyleReferenceId`
 * union so a new member is a compile error until it has a definition. `NONE` maps to `null`, which is
 * what "not matching a published look" means everywhere downstream.
 *
 * **The library is deliberately shorter than the list of games anyone would name**, and what decided
 * membership was whether the look could be *stated*. A reference ships only where the projection, the
 * facings, the colour discipline and at least one hard scale figure are documented, and where the look
 * is a property of the artwork rather than of what the engine does to it afterwards. That rules out
 * more than it admits: a game whose sprites are lit by normal maps at runtime, or composited as
 * rotating and additively-blended quads, or placed in a real-time-lit 3D scene, cannot be reproduced
 * by a still sheet however well known it is — and a preset promising otherwise would be selling a
 * result the format cannot deliver. Games whose defining numbers are simply unpublished are excluded
 * on the same principle, since the alternative is a plausible figure nobody can source.
 */
export const STYLE_REFERENCES: Readonly<Record<StyleReferenceId, StyleReference | null>> = {
  NONE: null,
  ...OVERHEAD_STYLE_REFERENCES,
  ...SIDE_ON_STYLE_REFERENCES,
  ...PROJECTED_STYLE_REFERENCES,
};

/** The look this sheet is drawn to match, or `null` for `NONE`. */
export function styleReferenceFor(id: StyleReferenceId): StyleReference | null {
  return STYLE_REFERENCES[id];
}
