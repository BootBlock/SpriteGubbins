/**
 * Everything the output controls need: the options each one offers, the guidance beside it, and the
 * configuration the studio opens on.
 *
 * Split one file per concern because the parameter set roughly tripled in v2 — render style,
 * projection, direction set, background key and the rig settings joined the original seven.
 *
 * The component counts are **not** here. They live with the inventory that lists them, in
 * `constants/promptText/inventory.ts`, so a count and its own breakdown cannot drift apart.
 */
export type { OutputChoice } from './choices.ts';
export {
  ASPECT_RATIO_CHOICES,
  BACKGROUND_KEY_CHOICES,
  JOINT_CAP_STYLE_CHOICES,
  LIGHTING_MODEL_CHOICES,
  OUTLINE_STYLE_CHOICES,
  OVERLAP_MARGIN_CHOICES,
  PALETTE_LIMIT_CHOICES,
  PROJECTION_CHOICES,
  RENDER_STYLE_CHOICES,
  RESOLUTION_PROFILE_CHOICES,
  RIG_MODE_CHOICES,
  SURFACE_DETAIL_CHOICES,
} from './choices.ts';
export { directionalModeChoices } from './directionalModeChoices.ts';
export { directionSetChoices } from './directionSetChoices.ts';
export { sheetChoices } from './sheetChoices.ts';
export { OUTPUT_TOOLTIPS } from './tooltips.ts';
export { DEFAULT_IMAGE_CONFIG, DEFAULT_OUTPUT_CONFIG } from './defaults.ts';
