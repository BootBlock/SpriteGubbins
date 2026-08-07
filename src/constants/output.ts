import type {
  AspectRatio,
  DirectionalMode,
  LightingModel,
  OutlineStyle,
  OutputConfig,
  PaletteLimit,
  ResolutionProfile,
  SurfaceDetail,
} from '../types/output.ts';

/**
 * Labels and guidance for the technical output controls.
 *
 * The identifiers themselves (`CORE_DIRECTIONAL_VARIANTS`) go verbatim into the compiled prompt
 * and live in `types/output.ts`; the human-readable labels live here so no component has to
 * carry a hard-coded string list. One entry per union member, in selector order.
 */
export interface OutputChoice<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * How many isolated components each directional mode requires.
 *
 * This is the number the compiler states as a done-condition and the atlas calculator lays out,
 * so it is defined once here rather than repeated in both.
 */
export const COMPONENT_COUNTS: Readonly<Record<DirectionalMode, number>> = {
  SINGLE_DIRECTION_POSE_LIBRARY: 37,
  CORE_DIRECTIONAL_VARIANTS: 43,
  FULL_DIRECTIONAL_POSE_LIBRARY: 111,
};

export const DIRECTIONAL_MODE_CHOICES: readonly OutputChoice<DirectionalMode>[] = [
  { value: 'SINGLE_DIRECTION_POSE_LIBRARY', label: 'SINGLE_DIRECTION_POSE_LIBRARY (37 components)' },
  { value: 'CORE_DIRECTIONAL_VARIANTS', label: 'CORE_DIRECTIONAL_VARIANTS (43 components - Recommended)' },
  { value: 'FULL_DIRECTIONAL_POSE_LIBRARY', label: 'FULL_DIRECTIONAL_POSE_LIBRARY (111 components)' },
];

export const SURFACE_DETAIL_CHOICES: readonly OutputChoice<SurfaceDetail>[] = [
  { value: 'MINIMAL', label: 'MINIMAL (Base colors & essential joints only)' },
  { value: 'CLEAN_PRODUCTION', label: 'CLEAN_PRODUCTION (Major panels & folds - Standard)' },
  { value: 'DETAILED_PRODUCTION', label: 'DETAILED_PRODUCTION (Detailed seams & material divisions)' },
  { value: 'TEXTURED', label: 'TEXTURED (Controlled pixel texturing)' },
];

export const RESOLUTION_PROFILE_CHOICES: readonly OutputChoice<ResolutionProfile>[] = [
  { value: 'HIGH_RESOLUTION_PIXEL_ART', label: 'HIGH_RESOLUTION_PIXEL_ART (25-35% height)' },
  { value: 'MID_RESOLUTION_PIXEL_ART', label: 'MID_RESOLUTION_PIXEL_ART (18-25% height)' },
  { value: '16_BIT_RETRO_PIXEL_ART', label: '16_BIT_RETRO_PIXEL_ART (64-96px sprite scale)' },
  { value: 'CUSTOM_PIXEL_ART', label: 'CUSTOM_PIXEL_ART (Define limits)' },
];

export const PALETTE_LIMIT_CHOICES: readonly OutputChoice<PaletteLimit>[] = [
  { value: 'STRICT_32_COLOR', label: 'STRICT_32_COLOR (16-32 color retro target)' },
  { value: 'RESTRAINED_64_COLOR', label: 'RESTRAINED_64_COLOR (32-64 color target - Recommended)' },
  { value: 'EXPANDED_ALBEDO', label: 'EXPANDED_ALBEDO (Controlled value bands)' },
];

export const OUTLINE_STYLE_CHOICES: readonly OutputChoice<OutlineStyle>[] = [
  { value: 'DARK_LOCAL_CONTOUR', label: 'DARK_LOCAL_CONTOUR (Local dark color 1px - Standard)' },
  { value: 'PURE_BLACK_OUTLINE', label: 'PURE_BLACK_OUTLINE (Crisp 1px black outline)' },
  { value: 'OUTLINE_LESS_ALBEDO', label: 'OUTLINE_LESS_ALBEDO (Soft edge contrast without outlines)' },
];

export const LIGHTING_MODEL_CHOICES: readonly OutputChoice<LightingModel>[] = [
  { value: 'FLAT_NEUTRAL_ALBEDO', label: 'FLAT_NEUTRAL_ALBEDO (Albedo style lighting - Standard)' },
  { value: 'ISOMETRIC_TOP_LEFT', label: 'ISOMETRIC_TOP_LEFT (Fixed 45° key light + hard shadows)' },
  { value: 'UNLIT_EMISSIVE_BAKED', label: 'UNLIT_EMISSIVE_BAKED (Flat unlit diffuse textures)' },
];

export const ASPECT_RATIO_CHOICES: readonly OutputChoice<AspectRatio>[] = [
  { value: 'WIDE_16_9', label: 'WIDE_16_9 (16:9 Aspect Ratio - Recommended)' },
  { value: 'SQUARE_1_1', label: 'SQUARE_1_1 (1:1 Aspect Ratio Canvas)' },
  { value: 'TALL_9_16', label: 'TALL_9_16 (9:16 Vertical Sheet Layout)' },
  { value: 'ULTRAWIDE_21_9', label: 'ULTRAWIDE_21_9 (21:9 Panorama Sheet Layout)' },
];

/** Guidance shown against each control, keyed to the control it explains. */
export const OUTPUT_TOOLTIPS = {
  directionalMode:
    'Controls total component isolation count: SINGLE (37 parts), CORE 3-WAY (43 parts), or FULL 3-WAY (111 parts).',
  surfaceDetail:
    'Controls internal seam and fold complexity while strictly respecting global palette limits.',
  resolutionProfile: 'Target height percentage and pixel density constraints for the delivered sprite sheet.',
  paletteLimit:
    'Restricts total global color count across the sprite sheet for classic 16-bit or clean modern pixel art styles.',
  outlineStyle:
    'Sets pixel boundary style: dark local color, pure crisp black, or outline-less soft contrast edges.',
  lightingModel:
    'Controls key lighting angle and shadow intensity. Flat neutral albedo is standard for game engine lighting.',
  aspectRatio: 'Defines output aspect ratio parameter passed to the AI generator to prevent image cropping.',
  targetModel:
    'Tailors prompt wrapping and formatting for specific AI image generators. Sol enforces reasoning contracts, Midjourney adds flags, SD/Flux adds negative prompts.',
  category:
    'Select the category of the subject (Humanoid, Monster, Prop, Item, or Building). Updates available default option pools.',
} as const;

/**
 * The configuration the studio opens on. Matches the first built-in preset, which is what the
 * source application booted with.
 */
export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
  surfaceDetail: 'CLEAN_PRODUCTION',
  resolutionProfile: 'HIGH_RESOLUTION_PIXEL_ART',
  paletteLimit: 'RESTRAINED_64_COLOR',
  outlineStyle: 'DARK_LOCAL_CONTOUR',
  lightingModel: 'FLAT_NEUTRAL_ALBEDO',
  aspectRatio: 'WIDE_16_9',
  targetModel: 'CHATGPT_5_6_SOL',
};
