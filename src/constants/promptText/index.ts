/**
 * Every piece of prose the prompt template interpolates.
 *
 * Split one file per concern purely for size — together these are the wording of the generated
 * prompt, and the specification is emphatic that the descriptions are the contract rather than UI
 * copy, so none of it may be paraphrased.
 *
 * **The naming convention is load-bearing:** a `[DEFINE:FOO_DESCRIPTION]` token in the template is
 * filled from the map `FOO_TEXT` here. `promptCompiler.test.ts` walks the template's tokens against
 * these exports, so a token added without a map — or a map renamed out from under a token — fails
 * the build rather than reaching a model as literal template text.
 *
 * `DIRECTIONS_DESCRIPTION` is the one exception, and the test names it: the compiler narrows the
 * direction set according to the sheet's mode, so the line has to describe what was actually asked
 * for rather than what the user selected. {@link describeDirections} builds it.
 */
export { DIRECTION_COVERAGE, PRACTICAL_COMPONENT_CEILING } from './inventory.ts';
export { CATEGORY_AUDIT_TEXT, CATEGORY_EXCLUSION_TEXT, CATEGORY_GUARD_TEXT } from './exclusions.ts';
export {
  MIN_FEATURE_SIZE,
  RENDER_STYLE_TEXT,
  RESOLUTION_PROFILE_TEXT,
  SURFACE_DETAIL_TEXT,
} from './renderStyle.ts';
export { LIGHTING_TEXT, OUTLINE_TEXT, PALETTE_TEXT } from './palette.ts';
export { describeHardware, describePalette, perComponentLimit } from './hardware.ts';
export {
  DEFAULT_CAMERA_ELEVATIONS,
  DEPTH_ORDER_TEXT,
  DIRECTION_LISTS,
  describeDirections,
  PROJECTION_TEXT,
} from './camera.ts';
export { FACING_TEXT, LANDMARK_TEXT, OBJECT_YAW } from './rotation.ts';
export { ASPECT_TEXT, BACKGROUND_KEY_TEXT } from './sheet.ts';
export { SCALE_EXAMPLE_TEXT } from './subject.ts';
export { JOINT_CAP_TEXT, OVERLAP_MARGIN_TEXT } from './rigging.ts';
