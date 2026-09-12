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
 * `presets/presets.test.ts` the presets. It sits beside the pools rather than on `FieldOption` for the
 * reason `exclusionElements.ts` does: a record only the tests read is not downloaded by every visitor.
 *
 * **What may be declared.** A value is bound when it names a piece, a repeat or a stretch that the
 * sheets of some modes draw and another mode's sheets do not — `Tower With Detachable Roof` on
 * BUILDING, whose tile set draws no roof. A list is never empty and never every mode the category
 * offers, so a single-mode category declares nothing. **A value that no sheet of its category agrees
 * with is a different defect** (issue #281) and is not declared here, so a value missing from this
 * table is one tied to no mode rather than one every sheet agrees with.
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
    anatomy: {
      'Single Non-Repeating Panel': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Horizontally Seamless Band': ['TILESET_MODULAR'],
      'Seamless Band With Loose Overlays': ['TILESET_MODULAR'],
      'Seamless Band With Parallax Sub-Layers': ['TILESET_MODULAR'],
      // The layer library's mid mass and edge occluders, each drawn once for the left and the right.
      'Panel Split Into Left And Right Halves': ['SINGLE_DIRECTION_POSE_LIBRARY'],
    },
    exclusions: { 'No visible seam where the band repeats': ['TILESET_MODULAR'] },
  },
  // Both name a piece the module library and the directional views draw and the tile set, a floor field
  // with walls around it, does not.
  BUILDING: {
    anatomy: {
      'Tower With Detachable Roof': ['SINGLE_DIRECTION_POSE_LIBRARY', 'CORE_DIRECTIONAL_VARIANTS'],
      'Wall Section With Gate': ['SINGLE_DIRECTION_POSE_LIBRARY', 'CORE_DIRECTIONAL_VARIANTS'],
    },
  },
  // The state library draws each widget whole in its states, and the nine-slice set cuts every piece to
  // stretch or repeat.
  INTERFACE: {
    anatomy: {
      'Single Fixed-Size Piece': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Three-Slice Horizontal Stretch': ['TILESET_MODULAR'],
      'Three-Slice Vertical Stretch': ['TILESET_MODULAR'],
      'Nine-Slice Stretching Frame': ['TILESET_MODULAR'],
      'Nine-Slice With Tiling Fill': ['TILESET_MODULAR'],
      // The state library's title bar and panel frame; the nine-slice set draws no header.
      'Stacked Header, Body & Footer': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Nine-Slice With Fixed Corner Ornament': ['TILESET_MODULAR'],
      // The nine-slice set's divider rail between its two end caps.
      'Repeating Track With Two Caps': ['TILESET_MODULAR'],
      // The state library's icon plate, drawn empty, filled and highlighted.
      'Base Plate With Overlay States': ['SINGLE_DIRECTION_POSE_LIBRARY'],
    },
  },
  // The part library draws a detachable part and a working end in two states; the directional views draw
  // one working end per facing and nothing that detaches.
  ITEM: {
    anatomy: {
      'Weapon With Detachable Mag': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Instrument Body & Detachable Bow': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Tool With Swappable Heads': ['SINGLE_DIRECTION_POSE_LIBRARY'],
    },
  },
  // Every named discipline belongs to one of the two sheets: the blend set joins two materials across a
  // flat field, and the feature library raises one level and stands features on it.
  TERRAIN: {
    anatomy: {
      'Corner-Matched Blob Set': ['TILESET_MODULAR'],
      'Edge-Matched Wang Set': ['TILESET_MODULAR'],
      'Framed Platform Set': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Uniform Self-Tiling Field': ['TILESET_MODULAR'],
      'Terraced Elevation Set': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Freestanding Feature Pieces': ['SINGLE_DIRECTION_POSE_LIBRARY'],
      'Dual-Grid Offset Set': ['TILESET_MODULAR'],
      'Height-Layered Cliff Set': ['SINGLE_DIRECTION_POSE_LIBRARY'],
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
