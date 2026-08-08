import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * The creatures with no animal underneath — oozes, growths, void things and clockwork.
 *
 * The body plans here are the ones a humanoid inventory cannot describe, which is the reason the
 * component plans are keyed on category at all. Two of them also leave the magenta default behind:
 * black for a sheet whose subject *emits* light, and transparent for a render that arrives carrying its
 * own alpha. The reasoning for each is at the field.
 */
export const CREATURE_HORROR_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'void-abomination',
    name: 'Void Abomination',
    category: 'CREATURE',
    subject: {
      species: 'Void Abomination',
      gender: 'Overlord Colossus',
      age: 'Corrupted Corpse',
      role: 'Support Aura Emitter',
      setting: 'Deep Space Derelict',
      build: 'Amorphous Blob Frame',
      silhouette: 'Tentacled Mass',
      face_head: 'Eyeless Sensing Slits',
      anatomy: 'OCTOPUS TENTACLED',
      clothing: 'Control Mind Spike',
      worn_details: 'Bioluminescent Veins',
      primary_colours: 'Obsidian Black & Deep Purple',
      accent_colours: 'Bio-Violet #8B5CF6',
      materials: 'Transparent Jelly Shell',
      exclusions: 'No wings, no extra eyes',
      additional_anatomy: 'Prehensile Tentacle ×2',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      // Black, because everything readable on this creature is emissive: on magenta the glow would be
      // keyed against a colour brighter than the subject, and the edges of a translucent shell are
      // exactly where that goes wrong.
      backgroundKey: 'PURE_BLACK',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      surfaceDetail: 'DETAILED_PRODUCTION',
      aspectRatio: 'TALL_9_16',
      targetModel: 'SEEDREAM',
    },
  },
  {
    id: 'fungal-spore-host',
    name: 'Fungal Spore Host',
    category: 'CREATURE',
    subject: {
      species: 'Fungal Spore Monster',
      gender: 'Mutated Specimen',
      age: 'Mutated Hyper-Growth',
      role: 'Ranged Spitter',
      setting: 'Fungal Swamplands',
      build: 'Huge Heavy Carapace',
      silhouette: 'Crystalline Outcrops',
      face_head: 'Acid Siphon Maw',
      anatomy: 'CENTIPEDE MULTI-SEGMENT',
      clothing: 'NONE',
      worn_details: 'Glow Spore Clusters',
      primary_colours: 'Bio-Green #10B981 & Slate',
      accent_colours: 'Electric Yellow #EAB308',
      materials: 'Leathery Hide',
      exclusions: 'No human clothing, no weapons',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      // Texture is the subject here — a fungal surface with clean panels reads as painted plastic —
      // and the expanded palette is what pays for the value bands that texture needs.
      surfaceDetail: 'TEXTURED',
      paletteLimit: 'EXPANDED_ALBEDO',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'clockwork-sentry-hound',
    name: 'Clockwork Sentry Hound',
    category: 'CREATURE',
    subject: {
      species: 'Mechanical Automaton',
      gender: 'Lesser Stalker',
      age: 'Ancient Weathered',
      role: 'Ambusher Pouncer',
      setting: 'Subterranean Ruins',
      build: 'Low-Slung Quadruped',
      silhouette: 'Humped Carapace',
      face_head: 'Single Glowing Monocular Sensor',
      anatomy: 'QUADRUPED BEAST',
      clothing: 'Cybernetic Leg Armor',
      worn_details: 'Chitin Cracks',
      primary_colours: 'Rusty Iron & Moss',
      accent_colours: 'Magma Orange Glow #F97316',
      materials: 'Rusting Scrap & Wiring',
      exclusions: 'No rider, no floor shadows',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // Faceted rather than drawn, and dimetric rather than true isometric — the two-axis projection
      // most 2.5D engines actually use, where the vertical axis is not foreshortened equally.
      renderStyle: 'LOW_POLY_3D',
      projection: 'DIMETRIC_2_1',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.DIMETRIC_2_1,
      paletteLimit: 'UNRESTRICTED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      // A 3D renderer hands back alpha of its own, so there is nothing to key out — a magenta field
      // would be a colour to remove rather than a background that helped.
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'ooze-hydra-brood',
    name: 'Ooze Hydra Brood',
    category: 'CREATURE',
    subject: {
      species: 'Hydra Multi-Head',
      gender: 'Queen / Hive Mother',
      age: 'Slumbering Dormant',
      role: 'Burrowing Surprise Attacker',
      setting: 'Toxic Sewers',
      build: 'Slender Serpent-like',
      silhouette: 'Spike-Covered Back',
      face_head: 'Triple Jaw Mandibles',
      anatomy: 'SERPENTINE TAILLESS',
      clothing: 'Reinforced Restraint Chains',
      worn_details: 'Acidic Drip Droplets',
      primary_colours: 'Deep Sea Cyan #06B6D4 & Navy',
      accent_colours: 'Infrared Pink #F43F5E',
      materials: 'Transparent Jelly Shell',
      exclusions: 'No background text',
      additional_anatomy: 'Scorpion Sting Tail ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'west',
      // No overlap at all, which is the one case that works: a body of translucent jelly has no hard
      // edge for a gap to appear at, so the joints can butt exactly and the seam is masked by the
      // material rather than by geometry.
      overlapMargin: 'NONE',
      resolutionProfile: 'MID_RESOLUTION',
      spriteTargetSize: '64 × 64 px assembled',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
];
