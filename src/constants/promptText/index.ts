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
 * chosen set through the category and then to the sheet's own facings — a multi-view plan's tuple,
 * or a run's single facing — so the line has to describe what was actually asked for rather than
 * the raw stored value. {@link describeDirections} builds it.
 */
export { PRACTICAL_COMPONENT_CEILING } from './inventory.ts';
export { CATEGORY_ASSEMBLY } from './categoryAssembly.ts';
export {
  CATEGORY_AUDIT_TEXT,
  CATEGORY_EXCLUSION_TEXT,
  CATEGORY_GUARD_TEXT,
  FRAME_IS_A_COMPONENT,
  LETTERING_IS_A_COMPONENT,
  LIMBS_ARE_COMPONENTS,
} from './exclusions.ts';
export {
  minFeatureSize,
  RENDER_STYLE_TEXT,
  RESOLUTION_PROFILE_TEXT,
  resolutionProfileDescription,
  SURFACE_DETAIL_TEXT,
} from './renderStyle.ts';
export { RENDER_STYLE_SURFACE } from './renderStyleSurface.ts';
export { smallScaleDiscipline } from './smallScale.ts';
export { VALIDATION_PASS_TEXT, validationPassFor } from './validationPass.ts';
export { LIGHTING_TEXT, OUTLINE_TEXT, PALETTE_TEXT } from './palette.ts';
export { describeHardware, describePalette, perComponentLimit } from './hardware.ts';
export { describeStyleReference } from './styleReference.ts';
export { DEFAULT_CAMERA_ELEVATIONS, DIRECTION_LISTS, describeDirections, PROJECTION_TEXT } from './camera.ts';
export { depthOrder, depthOrderDescription, DEPTH_ORDER_TEXT, PLAN_DEPTH_ORDER_TEXT } from './depthOrder.ts';
export type { DepthOrder, DepthOrderFacing } from './depthOrder.ts';
export { cameraElevationRange, isPlanView, resolveCameraElevation } from './elevation.ts';
export { FACING_TEXT, facingText, OBJECT_YAW } from './rotation.ts';
export { leadingSide } from './chirality.ts';
export { LANDMARK_TEXT } from './landmarks.ts';
export { ASPECT_TEXT, BACKGROUND_KEY_TEXT } from './sheet.ts';
// `SCALE_UNIT_TEXT` is exported here although nothing imports it *through* this barrel — every
// consumer is a sibling in this directory and imports the leaf. What reaches it here is
// `tests/prompt-citations.test.ts`, which walks this namespace for every string the prompt
// interpolates; the thirteen units are prose the compiled prompt carries, so a section number
// hand-written into one has to fail that check like any other line.
export { SCALE_EXAMPLE_TEXT, SCALE_UNIT_TEXT } from './subject.ts';
export { JOINT_CAP_TEXT, OVERLAP_MARGIN_TEXT } from './rigging.ts';
