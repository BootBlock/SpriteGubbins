import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Beasts and machines — the creatures whose bodies are recognisable animals underneath.
 *
 * Between them these four exercise the three sheets a creature can be asked for: the pose library,
 * the directional core, and the bone rig. What separates them is not how many components each holds
 * but how each *prices* the subject's own extra appendages, and the two answers are far apart. A
 * multi-view sheet redraws every named piece at every facing it covers, so a wing costs one drawing
 * per view; a run sheet draws each piece once, whatever the run list. That makes the pose library
 * the mode with almost nothing left over — 37 of the 43 components one generation reliably delivers,
 * before a single appendage is declared — while the core opens at three pieces per facing and has
 * headroom to sell. Each preset below states its own arithmetic rather than inheriting a claim.
 */
export const CREATURE_BEAST_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'creature-drone',
    name: 'Cybernetic Attack Drone',
    description:
      'A four-winged machine turned through the directional core, where every appendage is redrawn at each facing — four wings across five views is twenty of the sheet’s thirty-five components, more than the trunk they hang on.',
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
      // The core rather than the pose library, and the wings are what pays for it rather than what
      // rules it out. The core's trunk is three pieces per facing and a multi-view sheet redraws the
      // subject's own anatomy at every one of them, so five facings is 15 + 4×5 = 35 of the 43 a
      // single generation reliably delivers: a fifth appendage would still fit, at 40, and a sixth
      // would not, at 45. The pose library is the tighter of the two, not the looser — 37 before the
      // wings and 41 after — which is the arithmetic this preset had backwards until the counts were
      // recomputed from the plans instead of recalled.
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      // Pinned rather than inherited, because the arithmetic above counts these facings and a number
      // resting on the studio's default is one edit away from being false.
      directions: 'FIVE_CLASSIC',
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
      'A quadruped on the directional core with nothing to declare beyond the head, body and hindquarters its plan already lists — the plain trunk that the articulation sheet’s limbs hang on.',
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
      // The sentinel rather than a blank, and it describes the subject rather than a budget: a wolf
      // has nothing beyond the head, body, hindquarters and four limbs the creature plans already
      // enumerate, so there is nothing to declare. Nothing about the core forced the field empty —
      // it opens at three pieces per facing, and the drone in this file spends that headroom on four
      // wings. This one has nothing to spend it on.
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
      'A winged, tailed drake as a cut-out rig run eight ways. A rig draws each piece once in rest orientation, so its wings and tail cost three components rather than three at every facing.',
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
      // Priced once rather than once per facing, which is what a rig sheet buys: its pieces are drawn
      // in rest orientation and rotated about their pivots, so two wings and a tail are three
      // components on a fifteen-piece sheet. The same three on the eight-compass core this preset
      // runs would be twelve added to each of its two chunks, redrawn at all four of that chunk's
      // facings.
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
