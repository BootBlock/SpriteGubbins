import type {
  AspectRatio,
  LightingModel,
  OutlineStyle,
  PaletteLimit,
  ResolutionProfile,
  SurfaceDetail,
} from '../../types/output.ts';
import type { BackgroundKey, RenderStyle } from '../../types/rendering.ts';
import type { JointCapStyle, OverlapMargin } from '../../types/rigging.ts';

/**
 * The options each output control offers.
 *
 * The identifiers are the domain's, declared in `src/types/`; these pair them with the wording the
 * selector shows. The label keeps the identifier visible on purpose — it is the term the prompt is
 * written against, so a user comparing two generations can see which setting changed.
 *
 * **A label is at most 50 characters**, identifier and parenthetical together. A native `<select>`
 * truncates its selected option rather than wrapping it, and what a truncation takes is the *tail* —
 * here the parenthetical, which is the half a first-time user is choosing by. The identifier cannot
 * move, so the parenthetical is what gives: keep it to the fact the identifier does not already
 * state, and leave the rest to `tooltips.ts`, which has no width to run out of.
 * `tests/select-option-labels.test.ts` enforces the budget and derives the number.
 *
 * **Every list here is offered whole, to every category.** The five that are not — the sheet mode,
 * the sheet of the series, the direction set, the rig mode and the projection — are built per
 * category in their own files, because each is a question a category can answer differently: see
 * `directionalModeChoices.ts`, `sheetChoices.ts`, `directionSetChoices.ts`, `rigModeChoices.ts` and
 * `projectionChoices.ts`.
 */
export interface OutputChoice<T extends string | number> {
  readonly value: T;
  readonly label: string;
}

export const RENDER_STYLE_CHOICES: readonly OutputChoice<RenderStyle>[] = [
  { value: 'PIXEL_ART', label: 'PIXEL_ART (modern high-resolution pixel art)' },
  { value: 'RETRO_PIXEL_ART', label: 'RETRO_PIXEL_ART (8/16-bit, chunky, small palette)' },
  { value: 'PAINTED_2D', label: 'PAINTED_2D (soft blended forms, brush economy)' },
  { value: 'CEL_SHADED', label: 'CEL_SHADED (flat fills, stepped shadows, ink line)' },
  { value: 'VECTOR_FLAT', label: 'VECTOR_FLAT (flat geometry, no gradients)' },
  { value: 'HAND_DRAWN_INK', label: 'HAND_DRAWN_INK (inked lines, visible line weight)' },
  { value: 'RENDERED_3D', label: 'RENDERED_3D (material shading, soft form shadow)' },
  { value: 'LOW_POLY_3D', label: 'LOW_POLY_3D (faceted, flat per-face shading)' },
  { value: 'CLAY_RENDER', label: 'CLAY_RENDER (untextured form study — check volume)' },
  { value: 'SILHOUETTE_ONLY', label: 'SILHOUETTE_ONLY (readability pass — does it read?)' },
];

export const BACKGROUND_KEY_CHOICES: readonly OutputChoice<BackgroundKey>[] = [
  { value: 'MAGENTA_FF00FF', label: 'MAGENTA_FF00FF (#FF00FF — keyable, recommended)' },
  { value: 'PURE_WHITE', label: 'PURE_WHITE (#FFFFFF — bleeds into light edges)' },
  { value: 'PURE_BLACK', label: 'PURE_BLACK (#000000)' },
  { value: 'TRANSPARENT', label: 'TRANSPARENT (alpha, where the target supports it)' },
];

// The rig modes are **not** here, and the absence is deliberate: which of them a category can be
// asked for depends on whether that category articulates at all, so their labels live with the
// function that scopes them, in `rigModeChoices.ts`. The two below are unconditional because a
// cut-out rig is the only thing that renders either, whatever the subject is.
export const JOINT_CAP_STYLE_CHOICES: readonly OutputChoice<JointCapStyle>[] = [
  { value: 'ROUNDED', label: 'ROUNDED' },
  { value: 'SQUARED', label: 'SQUARED' },
  { value: 'TAPERED', label: 'TAPERED' },
];

export const OVERLAP_MARGIN_CHOICES: readonly OutputChoice<OverlapMargin>[] = [
  { value: 'HALF_CAP', label: 'HALF_CAP (half a cap radius — recommended)' },
  { value: 'FULL_CAP', label: 'FULL_CAP (a full cap radius)' },
  { value: 'NONE', label: 'NONE (pieces butt exactly — gaps on rotation)' },
];

export const SURFACE_DETAIL_CHOICES: readonly OutputChoice<SurfaceDetail>[] = [
  { value: 'MINIMAL', label: 'MINIMAL (base colours and essential joints only)' },
  { value: 'CLEAN_PRODUCTION', label: 'CLEAN_PRODUCTION (major panels, folds — standard)' },
  { value: 'DETAILED_PRODUCTION', label: 'DETAILED_PRODUCTION (seams and material divisions)' },
  { value: 'TEXTURED', label: 'TEXTURED (controlled surface texturing)' },
];

export const RESOLUTION_PROFILE_CHOICES: readonly OutputChoice<ResolutionProfile>[] = [
  { value: 'HIGH_RESOLUTION', label: 'HIGH_RESOLUTION (25–35% of sheet height)' },
  { value: 'MID_RESOLUTION', label: 'MID_RESOLUTION (18–25% of sheet height)' },
  { value: 'RETRO_16_BIT', label: 'RETRO_16_BIT (64–96 px per figure)' },
  { value: 'CUSTOM', label: 'CUSTOM (work to the target component size)' },
];

export const PALETTE_LIMIT_CHOICES: readonly OutputChoice<PaletteLimit>[] = [
  { value: 'RESTRAINED_64_COLOR', label: 'RESTRAINED_64_COLOR (32–64 colours — recommended)' },
  { value: 'STRICT_32_COLOR', label: 'STRICT_32_COLOR (16–32 colours)' },
  { value: 'EXPANDED_ALBEDO', label: 'EXPANDED_ALBEDO (controlled value bands)' },
  { value: 'UNRESTRICTED', label: 'UNRESTRICTED (no colour budget — painted, 3D)' },
];

export const OUTLINE_STYLE_CHOICES: readonly OutputChoice<OutlineStyle>[] = [
  { value: 'DARK_LOCAL_CONTOUR', label: 'DARK_LOCAL_CONTOUR (1px darker fill — standard)' },
  { value: 'PURE_BLACK_OUTLINE', label: 'PURE_BLACK_OUTLINE (crisp 1px black)' },
  { value: 'OUTLINE_LESS_ALBEDO', label: 'OUTLINE_LESS_ALBEDO (value and hue contrast only)' },
];

export const LIGHTING_MODEL_CHOICES: readonly OutputChoice<LightingModel>[] = [
  { value: 'FLAT_NEUTRAL_ALBEDO', label: 'FLAT_NEUTRAL_ALBEDO (engine-lit — standard)' },
  { value: 'ISOMETRIC_TOP_LEFT', label: 'ISOMETRIC_TOP_LEFT (fixed 45° key, hard shadows)' },
  { value: 'UNLIT_EMISSIVE_BAKED', label: 'UNLIT_EMISSIVE_BAKED (flat unlit diffuse)' },
];

export const ASPECT_RATIO_CHOICES: readonly OutputChoice<AspectRatio>[] = [
  { value: 'WIDE_16_9', label: 'WIDE_16_9 (recommended)' },
  { value: 'SQUARE_1_1', label: 'SQUARE_1_1' },
  { value: 'TALL_9_16', label: 'TALL_9_16' },
  { value: 'ULTRAWIDE_21_9', label: 'ULTRAWIDE_21_9' },
];
