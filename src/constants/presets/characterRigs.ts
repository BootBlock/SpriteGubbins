import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
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
    description:
      'A true-isometric cut-out rig with squared joint caps, four attachment sockets and four cardinal runs rather than one sheet. The best look at how a rig sheet differs from a directional one.',
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
      anatomy: 'Standard Humanoid',
      clothing: 'Reinforced Exo-Pads',
      worn_details: 'Energy Battery Backpack',
      primary_colours: 'Pearl White & Chrome',
      accent_colours: 'Plasma Cyan',
      materials: 'Reinforced Composites & Alloy',
      // The rig's own ban rather than `No cape, no facial features`, which removes the
      // `Monocular Cyber Eye` above — the one feature this android's head has. What a cut-out
      // sheet needs excluded is the assembled figure and anything already plugged into the four
      // sockets below.
      exclusions: 'No baked shadow of any kind, no assembled figure, no equipment in the sockets',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      projection: 'TRUE_ISOMETRIC',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      // A run list, not one sheet: four sheets of fifteen pieces, generated one per cardinal
      // facing. Isometric games turn on the diamond's four axes, so four is the set rather than
      // eight.
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
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'five-view-turnaround-rig',
    name: 'Five-View Turnaround Rig',
    description:
      'Five rig runs that reach all eight facings once the turned views are flipped in-engine — three fewer generations than the eight-compass set, for the same coverage.',
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
      anatomy: 'Standard Humanoid',
      clothing: 'Layered Duelling Coat',
      worn_details: 'Buckled Sword Harness',
      primary_colours: 'Deep Indigo & Bone White',
      accent_colours: 'Antique Brass',
      materials: 'Waxed Canvas & Tooled Leather',
      exclusions: 'No cape, no floor terrain',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
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
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'platformer-side-runner',
    name: 'Side-On Platformer Runner',
    description:
      'A flat side elevation at one facing, 32 colours and 32 × 48 px cells on an ultrawide canvas: the platformer contract, laid out so a run cycle reads along a row.',
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
      anatomy: 'Standard Humanoid',
      clothing: 'Industrial Hazard Suit',
      worn_details: 'Ammunition Belts',
      primary_colours: 'Sand Beige & Rust',
      accent_colours: 'Toxic Acid Green',
      materials: 'Weathered Carbon Fibre',
      exclusions: 'No floor terrain, no text labels',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
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
    description:
      'An untextured single-material pass under one hard key light, so nothing but the volumes is left to look at. Colour, texture and outline are all withheld — a design check to run before any colour is committed.',
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
      anatomy: 'Standard Humanoid',
      clothing: 'Spiked Bone Armor',
      worn_details: 'Shoulder Pauldrons & Cloak',
      // The three fields the pass supersedes, written to agree with it rather than against it. They
      // read `Deep Obsidian & Gold`, `Molten Copper` and `Etched Obsidian Plate` until the prompt
      // gained the clause that ranks a validation pass above the subject's colours — which is what a
      // user switching Render Style on a finished configuration now relies on, and what this preset
      // has no reason to lean on when it ships as a clay pass from the start.
      primary_colours: 'One clay grey throughout',
      accent_colours: 'None — a single material',
      materials: 'Untextured clay: volume only',
      exclusions: 'No glowing trails',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // An untextured pass whose only question is whether the volumes read. The style states the
      // surface itself — one material, no colour budget, no outline — so the three settings that
      // would have said so are withdrawn, and a hard key light is what is left to read the volumes
      // by. It is the one surface setting a clay pass keeps, and the reason it is set here.
      renderStyle: 'CLAY_RENDER',
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
    description:
      'One flat black fill on white, drawn at every facing of the core. It answers the question most sheets never ask: whether the shape is still recognisable at target size with no interior detail at all.',
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
      anatomy: 'Standard Humanoid',
      clothing: 'Nano-Weave Bodysuit',
      worn_details: 'Fibre-Optic Cabling',
      primary_colours: 'Solid black fill only',
      accent_colours: 'None — one flat value throughout',
      materials: 'No material read: shape only',
      exclusions: 'No glowing trails',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // The question every sprite has to answer and most sheets never ask: at target size, with no
      // interior detail at all, is the shape still recognisable? Every facing the core draws, because
      // a silhouette that only works from the front fails the moment the character turns.
      //
      // Nothing about the surface is set beside it, because there is no surface: the pass states one
      // flat fill, and surface detail, the colour budget, the outline and the lighting model are all
      // withdrawn behind it. This preset pinned four of them, and every one compiled into the prompt
      // as a line contradicting the style above it.
      renderStyle: 'SILHOUETTE_ONLY',
      resolutionProfile: 'MID_RESOLUTION',
      backgroundKey: 'PURE_WHITE',
      aspectRatio: 'WIDE_16_9',
      // Deliberately not Qwen, whose 4,500-token ceiling this sheet lands exactly on: every facing
      // of the core, each with its own inventory, compiles to ~18,000 characters, and read at the
      // app's ~4-characters-per-token estimate that is 4,500 against 4,500 — a margin narrower than
      // the estimate's own error, so it demonstrates nothing about fitting. GPT Image publishes its
      // ceiling in characters, which the app measures exactly rather than estimating, and the same
      // sheet spends a little over half of it. Qwen keeps the two presets that genuinely show off a
      // tight budget, at ~68% and ~71% of it.
      targetModel: 'GPT_IMAGE',
    },
  },
];
