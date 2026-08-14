import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Beasts and machines — the creatures whose bodies are recognisable animals underneath.
 *
 * Between them these four exercise the three sheets a creature can be asked for: the pose library,
 * the three-facing set, and the bone rig. Which one a creature can take is not a free choice — the
 * directional set already sits at the practical component ceiling, so a winged or tailed subject has
 * to give up a facing to pay for its extra anatomy. Each preset below makes that trade explicitly.
 */
export const CREATURE_BEAST_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'creature-drone',
    name: 'Cybernetic Attack Drone',
    description:
      'A four-winged machine on the single-facing pose library rather than the directional core: the wings are counted into the sheet, and the core has no headroom left to pay for them.',
    category: 'CREATURE',
    subject: {
      species: 'Mechanical Automaton',
      gender: 'Drone / Minion',
      age: 'Prime Ferocity',
      role: 'Flying Harasser',
      setting: 'Deep Space Derelict',
      build: 'Low-Slung Quadruped',
      silhouette: 'Segmented Shell Plates',
      face_head: 'Single Glowing Monocular Sensor',
      anatomy: 'Quadruped Beast',
      clothing: 'Mounted Energy Cannons',
      worn_details: 'Bioluminescent Veins',
      primary_colours: 'Obsidian Black & Deep Purple',
      accent_colours: 'Plasma Cyan #22D3EE',
      materials: 'Rusting Scrap & Wiring',
      exclusions: 'No human clothing, no weapons',
      additional_anatomy: 'Insectoid Wing ×4',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // The single-direction inventory rather than the three-facing one, because the wings above are
      // counted into the sheet: 43 + 4 is past the ~40 components a single generation reliably
      // delivers, while 37 + 4 is not. A winged creature is the case additional anatomy exists for,
      // so the mode gives way rather than the wings.
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      surfaceDetail: 'CLEAN_PRODUCTION',
      resolutionProfile: 'HIGH_RESOLUTION',
      paletteLimit: 'RESTRAINED_64_COLOR',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'dire-wolf-alpha',
    name: 'Dire Wolf Alpha',
    description:
      'A quadruped on the directional core with no extra anatomy at all, which is what lets it take the full core — a winged or tailed creature has to give a facing back to pay for the appendages.',
    category: 'CREATURE',
    subject: {
      species: 'Beast / Quadruped',
      gender: 'Apex Alpha',
      age: 'Prime Ferocity',
      role: 'Apex Predator',
      setting: 'Glacial Ice Trench',
      build: 'Low-Slung Quadruped',
      silhouette: 'Jagged Dorsal Spines',
      face_head: 'Fanged Maw',
      anatomy: 'Quadruped Beast',
      clothing: 'NONE',
      worn_details: 'Battle Scars & Missing Scales',
      primary_colours: 'Albino White & Pale Pink',
      accent_colours: 'Stasis Blue #3B82F6',
      materials: 'Leathery Hide',
      exclusions: 'No human clothing, no weapons',
      // Empty on purpose: the three-facing set is already at the ceiling, so this is the preset that
      // shows what a creature can have when it spends nothing on extra appendages.
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'topdown-swarm-beetle',
    name: 'Top-Down Swarm Beetle',
    description:
      'An armoured insectoid seen straight down, as four sheets one per cardinal facing. The twin-stick and roguelike camera, where the top of a carapace is the whole design.',
    category: 'CREATURE',
    subject: {
      species: 'Chitinous Insectoid',
      gender: 'Drone / Minion',
      age: 'Freshly Spawned',
      role: 'Frontline Tank Swarmer',
      setting: 'Alien Hive Core',
      build: 'Multi-Legged Walker',
      silhouette: 'Segmented Shell Plates',
      face_head: 'Compound Insect Eyes',
      anatomy: 'Hexapod Insect',
      clothing: 'NONE',
      worn_details: 'Glow Spore Clusters',
      primary_colours: 'Toxic Hive Yellow #EAB308 & Brown',
      accent_colours: 'Acidic Lime Green #84CC16',
      materials: 'Hard Chitin Shell & Wet Membranes',
      exclusions: 'No rider, no floor shadows',
      additional_anatomy: 'Chitinous Blade Arm ×2',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // Straight down, which is the twin-stick and roguelike camera — and the one projection where
      // the top of a carapace is the whole design.
      projection: 'PURE_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.PURE_TOPDOWN,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      // Four sheets, one per cardinal facing: a top-down swarm turns on the compass rather than
      // presenting a front, a side and a back.
      directions: 'FOUR_CARDINAL',
      primaryDirection: 'south',
      resolutionProfile: 'MID_RESOLUTION',
      surfaceDetail: 'DETAILED_PRODUCTION',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'magma-drake-rig',
    name: 'Magma Drake Elder',
    description:
      'A winged, tailed drake as a cut-out rig run eight ways. A rig sheet is a handful of pieces rather than a whole directional series, which is what makes the extra anatomy affordable.',
    category: 'CREATURE',
    subject: {
      species: 'Draconic Drake',
      gender: 'Elder Ancient',
      age: 'Enraged Overclocked',
      role: 'Area Denier',
      setting: 'Volcanic Caverns',
      build: 'Massive Winged Fiend',
      silhouette: 'Webbed Wing Membrane',
      face_head: 'Multi-Horned Skull',
      anatomy: 'Bipedal Beast',
      clothing: 'NONE',
      worn_details: 'Molten Core Cracks',
      primary_colours: 'Crimson Red & Charcoal',
      accent_colours: 'Magma Orange Glow #F97316',
      materials: 'Molten Rock & Obsidian',
      exclusions: 'No saddles, no mechanical parts',
      // Affordable here precisely because a rig sheet is fifteen pieces rather than a directional
      // series' thirty-four: wings and a tail cost three components and the sheet is still less than
      // half the ceiling.
      additional_anatomy: 'Webbed Wing ×2, Spike Tail Club ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'south-west',
      jointCapStyle: 'TAPERED',
      overlapMargin: 'FULL_CAP',
      // Empty: an enemy does not wear the player's gear, so there is nothing to keep a slot clear for.
      sockets: '',
      paletteLimit: 'EXPANDED_ALBEDO',
      surfaceDetail: 'TEXTURED',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      spriteTargetSize: '96 × 96 px assembled',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'GENERIC',
    },
  },
];
