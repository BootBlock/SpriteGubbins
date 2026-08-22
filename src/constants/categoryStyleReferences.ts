import type { StyleReferenceId } from '../types/styleReference.ts';
import type { SubjectCategory } from '../types/subject.ts';
import { supportsProjection } from './categoryProjections.ts';
import { styleReferenceFor } from './styleReferences/library.ts';

/**
 * Which published looks a category's subject can actually be drawn to match.
 *
 * **Derived rather than tabulated**, and that is the whole design: a reference already names the
 * camera it was rendered under, so whether a category can match it is a question
 * `CATEGORY_PROJECTIONS` has already answered. A table here would be a second place to state the
 * same fact, free to disagree with the first the day a reference or a category is added.
 *
 * **The defect this closes is the projection's, arriving through the other door.** The Art Style
 * Reference control writes the projection and the camera elevation along with eight other settings,
 * and it is the one write path `setCategory` cannot see. So narrowing the Projection select alone
 * left this reachable in two clicks: pick INTERFACE, pick Diablo II, and section 2 carried “A floor
 * tile spans 160 × 80 pixels, so a tile edge runs two pixels sideways for every one it drops” —
 * which *is* the 30° dimetric camera — while section 3 carried `Flat front elevation, no
 * perspective`. The prompt asks for one camera as a measurement to work to directly and a different
 * one as the projection, which is the contradiction the whole projection narrowing exists to remove.
 *
 * **Resolving the projection at the point the patch is written would not have fixed it.** The
 * settings a reference writes are a template a reader may change afterwards, but its
 * `characteristics` are not: they reach the prompt verbatim, they state the ground geometry as a
 * measurement, and no resolver downstream can edit them. So the honest answer is that a reference
 * whose camera the subject cannot be drawn under is not a look that subject can be drawn to — and
 * the control does not offer it.
 *
 * **The projection is the only setting a reference writes that a category can refuse**, which is why
 * this is one condition rather than a list. A render style, a surface detail, an outline, a lighting
 * model, a resolution profile, a machine and a palette are all free of the subject — every category
 * can be drawn in any of them — and the fields a reference deliberately does *not* write are the
 * deliverable's, listed on `StyleReferenceSettings` itself.
 *
 * In practice this narrows exactly one category: INTERFACE keeps the four references rendered under
 * `ORTHOGRAPHIC_FRONT` and is not offered the six side-on or the two dimetric ones. Every other
 * category is offered the whole library.
 */
export function supportsStyleReference(category: SubjectCategory, id: StyleReferenceId): boolean {
  const reference = styleReferenceFor(id);
  // `NONE` belongs to every category, which is what lets {@link resolveStyleReference} fall back to
  // it without a per-category default: "not matching a published look" is a coherent answer for any
  // subject, where every other member is a claim about the camera the sheet was drawn under.
  return reference === null || supportsProjection(category, reference.settings.projection);
}

/**
 * The look actually used for this category — the one asked for where the subject can be drawn to it,
 * and `NONE` otherwise.
 *
 * The studio prevents the mismatch, and this exists for the reason `resolveProjection` does: a
 * preset written before this rule existed, a history row from an older build, or a hand-edited
 * export can each arrive carrying a pairing that was legal when it was saved. `parseImportedPreset`
 * validates the identifier against the flat `STYLE_REFERENCE_IDS` union with no category in scope,
 * so an imported pack can pair them freely.
 *
 * Dropping the reference asks for *less* than the configuration said, which is the safe direction to
 * degrade in: section 2's art-direction block disappears entirely rather than standing over a
 * measurement the sheet's own camera contradicts.
 */
export function resolveStyleReference(category: SubjectCategory, id: StyleReferenceId): StyleReferenceId {
  return supportsStyleReference(category, id) ? id : 'NONE';
}
