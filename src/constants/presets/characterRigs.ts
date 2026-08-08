import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Humanoids that exist for their *camera and rig*, not their costume.
 *
 * These are the presets to reach for when the question is "what does the sheet have to be", rather
 * than "who is on it": an isometric bone rig, a side-on platformer run, and the two production passes
 * — clay and silhouette — that answer whether a design works before any colour is committed to it.
 * The subjects are complete so each one still compiles and generates, but the interesting half is
 * below the subject in every case.
 */
export const CHARACTER_RIG_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'iso-cutout-rig',
    name: 'Isometric Cut-Out Rig',
    category: 'CHARACTER',
    subject: {
      species: 'Android',
      gender: 'Synthetic Construct',
      age: 'Ageless Synthetic',
      role: 'Cyber Monk',
      setting: 'Solar-Punk Utopia',
      build: 'Heavy Exosuit Frame',
      silhouette: 'Asymmetrical Pauldrons',
      face_head: 'Monocular Cyber Eye',
      anatomy: 'STANDARD HUMANOID',
      clothing: 'Reinforced Exo-Pads',
      worn_details: 'Energy Battery Backpack',
      primary_colours: 'Pearl White & Chrome',
      accent_colours: 'Plasma Cyan',
      materials: 'Reinforced Composites & Alloy',
      exclusions: 'No cape, no facial features',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      projection: 'TRUE_ISOMETRIC',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      // A run list, not one sheet: four sheets of fifteen pieces, generated one per cardinal facing
      // with the same identity lock. Isometric games turn on the diamond's four axes, so four is the
      // set rather than eight.
      directions: 'FOUR_CARDINAL',
      primaryDirection: 'south',
      // Squared caps and a full-cap overlap, because a plated machine hides its joints behind a plate
      // edge rather than behind a rounded bulge — and a full cap is what keeps that plate from opening
      // a gap as the bone rotates.
      jointCapStyle: 'SQUARED',
      overlapMargin: 'FULL_CAP',
      sockets: 'head, chest, hand_left, hand_right',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '64 × 96 px assembled',
      aspectRatio: 'SQUARE_1_1',
      emitManifest: true,
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'five-view-turnaround-rig',
    name: 'Five-View Turnaround Rig',
    category: 'CHARACTER',
    subject: {
      species: 'Duellist',
      gender: 'Feminine',
      age: 'Adult (30s)',
      role: 'Blade Dancer',
      setting: 'High Fantasy',
      build: 'Lean & Wiry',
      silhouette: 'Trailing Coat Tails',
      face_head: 'Braided Topknot & Half-Mask',
      anatomy: 'STANDARD HUMANOID',
      clothing: 'Layered Duelling Coat',
      worn_details: 'Buckled Sword Harness',
      primary_colours: 'Deep Indigo & Bone White',
      accent_colours: 'Antique Brass',
      materials: 'Waxed Canvas & Tooled Leather',
      exclusions: 'No cape, no floor terrain',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      projection: 'THREE_QUARTER_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.THREE_QUARTER_TOPDOWN,
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      // Five runs reaching all eight facings, which is the arithmetic `FIVE_CLASSIC` exists for. The
      // three turned views each flip at runtime into a distinct second facing, and `front` and `back`
      // are their own mirror — so they buy nothing from the flip and have to be drawn. Against
      // `EIGHT_COMPASS` that is three fewer generations for the same coverage, and three fewer
      // chances for a sheet to come back as a different character.
      directions: 'FIVE_CLASSIC',
      primaryDirection: 'front',
      jointCapStyle: 'ROUNDED',
      overlapMargin: 'HALF_CAP',
      sockets: 'head, back, hand_left, hand_right',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '56 × 88 px assembled',
      aspectRatio: 'WIDE_16_9',
      emitManifest: true,
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'platformer-side-runner',
    name: 'Side-On Platformer Runner',
    category: 'CHARACTER',
    subject: {
      species: 'Mutant Scavenger',
      gender: 'Masculine',
      age: 'Young Adult (20s)',
      role: 'Rogue Assassin',
      setting: 'Post-Apocalyptic',
      build: 'Athletic & Slender',
      silhouette: 'Dynamic Sharp Edges',
      face_head: 'Cyborg Jawplate & Goggles',
      anatomy: 'STANDARD HUMANOID',
      clothing: 'Industrial Hazard Suit',
      worn_details: 'Ammunition Belts',
      primary_colours: 'Sand Beige & Rust',
      accent_colours: 'Toxic Acid Green',
      materials: 'Weathered Carbon Fibre',
      exclusions: 'No floor terrain, no text labels',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      // The platformer contract: a flat side elevation with no perspective, one facing, and the sheet
      // laid out wide because a run cycle reads along a row.
      projection: 'ORTHOGRAPHIC_SIDE',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_SIDE,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '32 × 48 px per frame cell',
      paletteLimit: 'STRICT_32_COLOR',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'clay-volume-study',
    name: 'Clay Volume Study',
    category: 'CHARACTER',
    subject: {
      species: 'Orc Warrior',
      gender: 'Masculine Brute',
      age: 'Mature / Veteran (40s)',
      role: 'Shield Guardian',
      setting: 'Dark Fantasy',
      build: 'Towering Colossus',
      silhouette: 'Broad-Shouldered Fortress',
      face_head: 'Full Enclosed Helmet',
      anatomy: 'STANDARD HUMANOID',
      clothing: 'Spiked Bone Armor',
      worn_details: 'Shoulder Pauldrons & Cloak',
      primary_colours: 'Deep Obsidian & Gold',
      accent_colours: 'Molten Copper',
      materials: 'Etched Obsidian Plate',
      exclusions: 'No glowing trails',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      // An untextured pass whose only question is whether the volumes read. Colour is what hides a
      // broken form, so the palette goes away, the detail goes down, and a hard key light goes on —
      // the three settings that leave nothing but shape to look at.
      renderStyle: 'CLAY_RENDER',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'MINIMAL',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      // Tapered caps: an organic mass narrows into its joint, and a rounded cap on a shoulder that
      // size reads as a ball bearing.
      jointCapStyle: 'TAPERED',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'silhouette-read-pass',
    name: 'Silhouette Readability Pass',
    category: 'CHARACTER',
    subject: {
      species: 'Void Stalker',
      gender: 'Agender',
      age: 'Freshly Awakened',
      role: 'Sniper Ranger',
      setting: 'Eldritch Cosmic Horror',
      build: 'Skeletal Slender',
      silhouette: 'Horned Spiked Silhouette',
      face_head: 'Skeletal Skull Face',
      anatomy: 'STANDARD HUMANOID',
      clothing: 'Nano-Weave Bodysuit',
      worn_details: 'Fibre-Optic Cabling',
      primary_colours: 'Solid black fill only',
      accent_colours: 'None — one flat value throughout',
      materials: 'No material read: shape only',
      exclusions: 'No glowing trails',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      // The question every sprite has to answer and most sheets never ask: at target size, with no
      // interior detail at all, is the shape still recognisable? Every facing the core draws, because
      // a silhouette that only works from the front fails the moment the character turns.
      renderStyle: 'SILHOUETTE_ONLY',
      surfaceDetail: 'MINIMAL',
      paletteLimit: 'STRICT_32_COLOR',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      resolutionProfile: 'MID_RESOLUTION',
      backgroundKey: 'PURE_WHITE',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'QWEN_IMAGE',
    },
  },
];
