import { COMPONENT_COUNTS } from '../constants/output.ts';
import type {
  AspectRatio,
  DirectionalMode,
  LightingModel,
  OutlineStyle,
  PaletteLimit,
} from '../types/output.ts';

/**
 * The expanded prose the compiler splices into the prompt for each technical setting.
 *
 * These strings are the *contract* handed to the generator, not UI copy — the parenthetical
 * after each identifier is what tells the model what `RESTRAINED_64_COLOR` actually requires.
 * Editing one changes generated artwork, so treat them as domain data rather than wording.
 */

/** The component inventory each directional mode demands, as a Markdown breakdown. */
export const COMPONENT_BREAKDOWNS: Readonly<Record<DirectionalMode, string>> = {
  CORE_DIRECTIONAL_VARIANTS: `### Directional core — 9
- Heads: front-three-quarter, right-side, back-three-quarter.
- Torsos: front-three-quarter, right-side, back-three-quarter.
- Pelvises: front-three-quarter, right-side, back-three-quarter.

### Left arm — 8
- Upper arms: neutral lowered, forward-diagonal, raised.
- Lower arms: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible.
- Hands: relaxed empty, closed/grip-ready empty.

### Right arm — 8
- Same eight variants as the left arm, redrawn for the right side.

### Left leg — 9
- Upper legs: neutral vertical, forward, backward.
- Lower legs: extension-compatible, moderate-flexion-compatible, strong-flexion-compatible.
- Feet: flat planted, forward-step/heel-strike, rear-step/toe-off.

### Right leg — 9
- Same nine variants as the left leg, redrawn for the right side.`,

  SINGLE_DIRECTION_POSE_LIBRARY: `### Primary Direction Single Pose Set — 37
- 1 Primary Head, 1 Torso, 1 Pelvis.
- 8 Left Arm articulation variants (Upper arm x3, Lower arm x3, Hand x2).
- 8 Right Arm articulation variants.
- 9 Left Leg articulation variants (Upper leg x3, Lower leg x3, Foot x3).
- 9 Right Leg articulation variants.`,

  FULL_DIRECTIONAL_POSE_LIBRARY: `### Full 3-Direction Coverage Libraries — 111 Total
- Front 3/4 Complete Set (37 components).
- Right Side Complete Set (37 components).
- Back 3/4 Complete Set (37 components).`,
};

export const PALETTE_TEXT: Readonly<Record<PaletteLimit, string>> = {
  STRICT_32_COLOR: 'STRICT_32_COLOR (Enforce 16 to 32 global color palette target)',
  RESTRAINED_64_COLOR: 'RESTRAINED_64_COLOR (Target 32 to 64 controlled global palette target)',
  EXPANDED_ALBEDO: 'EXPANDED_ALBEDO (Controlled value bands with rich albedo variations)',
};

export const OUTLINE_TEXT: Readonly<Record<OutlineStyle, string>> = {
  PURE_BLACK_OUTLINE: 'PURE_BLACK_OUTLINE (Enforce crisp single 1px black outer contour boundary)',
  OUTLINE_LESS_ALBEDO: 'OUTLINE_LESS_ALBEDO (Soft edge contrast without hard dark outlines)',
  DARK_LOCAL_CONTOUR: 'DARK_LOCAL_CONTOUR (Single native pixel dark local color contour - Standard)',
};

export const LIGHTING_TEXT: Readonly<Record<LightingModel, string>> = {
  ISOMETRIC_TOP_LEFT: 'ISOMETRIC_TOP_LEFT (Fixed 45-degree top-left key lighting with hard shadow bands)',
  UNLIT_EMISSIVE_BAKED:
    'UNLIT_EMISSIVE_BAKED (Flat unlit diffuse textures with zero directional cast shadow)',
  FLAT_NEUTRAL_ALBEDO: 'FLAT_NEUTRAL_ALBEDO (Flat, neutral, albedo-style lighting with light top elevation)',
};

export const ASPECT_TEXT: Readonly<Record<AspectRatio, string>> = {
  WIDE_16_9: 'WIDE 16:9 SHEET',
  TALL_9_16: 'TALL 9:16 SHEET',
  ULTRAWIDE_21_9: 'ULTRAWIDE 21:9 SHEET',
  SQUARE_1_1: 'SQUARE 1:1 SHEET',
};

/**
 * The required component count as the prompt states it, e.g. `43 isolated components`.
 *
 * Extra anatomy (a tail, a wing pair) is drawn as additional isolated segments *beyond* the
 * base inventory, so it is noted as a rider rather than folded into the number — the base count
 * is a done-condition the generator is asked to verify, and a moving target would defeat it.
 */
export function componentCountText(mode: DirectionalMode, additionalAnatomy: string): string {
  const base = `${COMPONENT_COUNTS[mode]} isolated components`;
  if (!additionalAnatomy || additionalAnatomy === 'NONE') return base;
  return `${base} (plus additional isolated segments for: ${additionalAnatomy})`;
}
