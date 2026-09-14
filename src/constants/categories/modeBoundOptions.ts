import type { DirectionalMode } from '../../types/output.ts';
import type { SubjectCategory, SubjectFieldKey } from '../../types/subject.ts';

/**
 * The pooled values that the sheets of **only some** of their category's sheet modes agree with, each
 * mapped to the modes whose sheets do.
 *
 * **The defect this exists to answer** (issue #280). Section 1 carries every value verbatim on every
 * sheet, and two sheets of one category can deliver the subject in ways that exclude each other:
 * BACKGROUND's parallax set loops and its layer library repeats nothing, so `Short Repeat, One Screen
 * Wide` is true of one and false of the other. That pool opened on it, so the subject a category
 * switch installs told the layer library how long its band repeats, on a sheet that draws no band.
 *
 * **It governs what the app ships, never what a reader types, and nothing in the app reads it.** The
 * compiler has nothing to do with the answer: `useSubjectStore` keeps the subject when the sheet mode
 * changes, so section 1 carries whatever the reader holds. What a reader may not meet is a built-in
 * that contradicts its own sheet — the default subject a category switch installs, or a shipped
 * preset — because nobody chose that pairing. `modeBoundOptions.test.ts` holds the defaults and
 * `presets/presets.test.ts` the presets. It sits beside the pools rather than on `FieldOption`, as
 * `exclusionElements.ts` does, so that a record only the tests read is not downloaded by every visitor.
 *
 * **What may be declared.** A value is bound when it names a repeat, a stretch or a way of being shown
 * that the sheets of some modes draw and another mode's sheets do not — `Short Repeat, One Screen Wide`
 * on BACKGROUND, whose layer library repeats nothing. A list is never empty and never every mode the
 * category offers, so a single-mode category declares nothing. **An assembly base is not declared
 * here**: a base chooses the plans its category draws from, so a base only some modes draw is declared
 * with those modes' plans in `sheetPlans/assemblyBases.ts`, where the studio enforces it rather than
 * the tests alone (issue #283). The same file answers the value no sheet of its category agrees with
 * (issue #281), by declaring the sheets that do draw it, so a value missing from this table is one
 * tied to no mode rather than one every sheet agrees with.
 *
 * **A pool whose every named value is one sheet's needs a value meaning *there is none* before this
 * table can be filled in** (issue #293). Binding all of them satisfies the first guard below and fails
 * the second, which requires a category to open every pool on a value all its sheets agree with — and
 * that value is the pool's own `FieldOption.absentOption`, with the plan dropping the entry through
 * `ComponentEntry.attribute`. TERRAIN's *Focal Feature* is the case: `No Focal Feature` leads the pool
 * and binds nothing, and the eleven pieces only the feature library draws bind to its mode below.
 */
export const MODE_BOUND_OPTIONS: Readonly<
  Partial<
    Record<
      SubjectCategory,
      Partial<Record<SubjectFieldKey, Readonly<Record<string, readonly DirectionalMode[]>>>>
    >
  >
> = {
  // The layer library is `SINGLE_DIRECTION_POSE_LIBRARY` and the parallax set `TILESET_MODULAR`. The
  // parallax depth tiers are not bound: the layer library separates its distance too, because a camera
  // that pans even slightly needs the far mass to move less than the near one.
  BACKGROUND: {
    species: { 'Full Static Scene Panel': ['SINGLE_DIRECTION_POSE_LIBRARY'] },
    gender: { 'Static Non-Scrolling Panel': ['SINGLE_DIRECTION_POSE_LIBRARY'] },
    role: { 'Endless Runner Loop': ['TILESET_MODULAR'] },
    build: {
      'Short Repeat, One Screen Wide': ['TILESET_MODULAR'],
      'Standard Repeat, Two Screens Wide': ['TILESET_MODULAR'],
      'Long Repeat, Four Screens Wide': ['TILESET_MODULAR'],
      'Full-Screen Single Panel': ['SINGLE_DIRECTION_POSE_LIBRARY'],
    },
    exclusions: { 'No visible seam where the band repeats': ['TILESET_MODULAR'] },
  },
  // The feature library is `SINGLE_DIRECTION_POSE_LIBRARY` and the blend set `TILESET_MODULAR`
  // (issue #292). Both bound `silhouette` values are height edges rather than material boundaries: a
  // flat field has no lip to step and no face to undercut, and the feature library's exposed face is
  // where both are drawn.
  //
  // **`face_head` is the pool that needed a mechanism before this table could answer it** (issue #293).
  // Every named value of it is a piece only the feature library draws — `Focal feature ×1` is an entry
  // of that plan and of no other — while the blend set draws tiles and forbids a mark a player could
  // recognise twice across a laid field. So all eleven bind to the library's mode, which the first
  // guard above allows and the second one would have refused: a pool with no unbound value has none for
  // `defaultSubjectFor` to open on. What unblocked it is `No Focal Feature`, the pool's `absentOption`,
  // which is true of both sheets and therefore binds nothing — the feature library drops the entry for
  // a reader who picks it, through `ComponentEntry.attribute` and `utils/sheetPlanAbsence.ts`. That is
  // the value the pool opens on, so TERRAIN's default subject agrees with both of its sheets.
  TERRAIN: {
    silhouette: {
      'Stepped Terrace Lip': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Overhanging Undercut Cliff': ['SINGLE_DIRECTION_POSE_LIBRARY'],
    },
    face_head: {
      'Hero Boulder Outcrop': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Still Water Surface': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Glowing Vent Or Fissure': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Ancient Standing Stone': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Gnarled Exposed Root Mass': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Crystal Formation': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Bubbling Spring Head': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Cracked Impact Crater': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Fallen Weathered Log': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Shallow Ford & Stepping Stones': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Charred Stump Field': ['SINGLE_DIRECTION_POSE_LIBRARY'],
    },
  },
};

/** The modes whose sheets agree with this pooled value, or `null` where the value is tied to no mode. */
export function modesAgreeingWith(
  category: SubjectCategory,
  key: SubjectFieldKey,
  value: string,
): readonly DirectionalMode[] | null {
  return MODE_BOUND_OPTIONS[category]?.[key]?.[value] ?? null;
}
