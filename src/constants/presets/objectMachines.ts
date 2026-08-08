import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Powered props — the interactive machines a player walks up to and uses.
 *
 * An object decomposes by housing, mount and what moves, not by limb, which is why these can afford
 * far more additional anatomy than a humanoid can: the largest object plan is thirty components on
 * one sheet, against a humanoid whose forty-nine no longer fit on one at all, so a deployable dish or
 * a second vent is cheap here.
 */
export const OBJECT_MACHINE_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'prop-terminal',
    name: 'Sci-Fi Control Console',
    category: 'OBJECT',
    subject: {
      species: 'Interactive Terminal',
      gender: 'Fully Functional',
      age: 'Futuristic Sci-Fi',
      role: 'Objective Device',
      setting: 'Command Bridge',
      build: 'Compact Tabletop Device',
      silhouette: 'Chamfered Rectangular Box',
      face_head: 'Holographic Display Screen',
      anatomy: 'SINGLE RIGID OBJECT',
      clothing: 'Floor Bolted Frame',
      worn_details: 'Warning Stencils & LEDs',
      primary_colours: 'Matte White & Dark Slate',
      accent_colours: 'Alert Orange LEDs #F97316',
      materials: 'Carbon Composite & Glass',
      exclusions: 'No living character, no shadows',
      additional_anatomy: 'Deployable Sensor Dish ×1',
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      surfaceDetail: 'CLEAN_PRODUCTION',
      resolutionProfile: 'MID_RESOLUTION',
      paletteLimit: 'RESTRAINED_64_COLOR',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'defence-turret-rig',
    name: 'Modular Defence Turret',
    category: 'OBJECT',
    subject: {
      species: 'Defense Turret',
      gender: 'Overclocked / Active',
      age: 'Futuristic Sci-Fi',
      role: 'Hazard Obstacle',
      setting: 'Space Station Engine Room',
      build: 'Cylindrical Conduit',
      silhouette: 'Asymmetric Mechanical',
      face_head: 'Keypad & Biometric Scanner',
      anatomy: 'MULTI-SEGMENT TURRET',
      clothing: 'Floor Bolted Frame',
      worn_details: 'Hazard Stripes & Decals',
      primary_colours: 'Industrial Yellow #EAB308 & Charcoal',
      accent_colours: 'Crimson Warning Strip #EF4444',
      materials: 'Painted Sheet Metal & Acrylic',
      exclusions: 'No living character, no shadows',
      additional_anatomy: 'Deployable Turret Barrel ×1, Articulated Arm Clamp ×1',
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      // A prop can be rigged too, and a turret is the clearest case: the base never moves, the yoke
      // yaws, the barrel pitches. Seven pieces plus two deployables — a quarter of what a humanoid
      // rig costs.
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'FOUR_CARDINAL',
      primaryDirection: 'south',
      // Squared caps and no overlap: the joints are hidden behind armour collars that are themselves
      // components, so overlapping the segments would double the plate thickness at every joint.
      jointCapStyle: 'SQUARED',
      overlapMargin: 'NONE',
      surfaceDetail: 'DETAILED_PRODUCTION',
      spriteTargetSize: '48 × 64 px assembled',
      aspectRatio: 'SQUARE_1_1',
      emitManifest: true,
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'vending-machine-front',
    name: 'Front-Elevation Vending Machine',
    category: 'OBJECT',
    subject: {
      species: 'Vending Machine',
      gender: 'Corrupted Glitching',
      age: 'Retro 80s Industrial',
      role: 'Resource Converter',
      setting: 'Cyber City Alley',
      build: 'Heavy Heavy Pillar',
      silhouette: 'Chamfered Rectangular Box',
      face_head: 'Glowing Monitor Array',
      anatomy: 'SINGLE RIGID OBJECT',
      clothing: 'Freestanding Base',
      worn_details: 'Graffiti & Scratches',
      primary_colours: 'Gunmetal Grey & Orange',
      accent_colours: 'Hot Pink Glitch #F43F5E',
      materials: 'Painted Sheet Metal & Acrylic',
      exclusions: 'No cables on floor',
      additional_anatomy: 'Coolant Vent Flap ×2',
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      // Dead flat on. A machine the player faces has one interesting side, and a front elevation is
      // the projection that draws it without any of the depth cues that would fight a 2D scene's own.
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      resolutionProfile: 'MID_RESOLUTION',
      paletteLimit: 'STRICT_32_COLOR',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      rigMode: 'NONE',
      aspectRatio: 'TALL_9_16',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'portal-gate-shrine',
    name: 'Ancient Portal Gate',
    category: 'OBJECT',
    subject: {
      species: 'Portal Gate',
      gender: 'Ancient Sealed',
      age: 'Ancient Magitech',
      role: 'Objective Device',
      setting: 'Temple Vault',
      build: 'Pyramidal Structure',
      silhouette: 'Ornate Gothic Arches',
      face_head: 'Runic Crystal Core',
      anatomy: 'ROTATING SPHERICAL CORE',
      clothing: 'Reinforced Steel Cage',
      worn_details: 'Runic Engravings',
      primary_colours: 'Gilded Gold #F59E0B & Marble',
      accent_colours: 'Arcane Purple Gem #8B5CF6',
      materials: 'Carved Granite & Crystal',
      exclusions: 'No pedestal or ground grid',
      additional_anatomy: 'Holographic Emitter Wing ×2',
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      renderStyle: 'RENDERED_3D',
      projection: 'TRUE_ISOMETRIC',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'TEXTURED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      backgroundKey: 'TRANSPARENT',
      rigMode: 'NONE',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GEMINI_FLASH_IMAGE',
    },
  },
];
