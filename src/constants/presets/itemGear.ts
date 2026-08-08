import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Everything in the loot list that is not a weapon: cards, consumables, armour and focuses.
 *
 * These are the presets that answer "how do I get an inventory icon out of this app". All four state a
 * per-cell pixel size, because an inventory grid has a cell size and no resolution profile can express
 * one — and the two that leave the app's default three-quarter angle say so through the projection
 * rather than by describing the view in prose.
 */
export const ITEM_GEAR_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'vector-keycard-set',
    name: 'Vector Flat Keycard Set',
    category: 'ITEM',
    subject: {
      species: 'Keycard / Quest Item',
      gender: 'Standard Issue / Common',
      age: 'Freshly Synthesized',
      role: 'Quest Essential Key',
      setting: 'Cyberpunk Plasma Tech',
      build: 'Pocket-Sized Device',
      silhouette: 'Intricate Geometric Core',
      face_head: 'Grip notch & contact edge',
      anatomy: 'SINGLE RIGID ITEM',
      clothing: 'NONE',
      worn_details: 'Circuit Traces',
      primary_colours: 'Matte Black & Cyan #06B6D4',
      accent_colours: 'Plasma Blue Glow #22D3EE',
      materials: 'Carbon Fibre & Titanium',
      exclusions: 'No text or stats box',
      additional_anatomy: 'Secondary Energy Cell ×1',
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      // Flat geometry, no gradients, one value per shape — so there is nothing for an outline or a
      // light to do, and the palette can be tiny without the art looking starved.
      renderStyle: 'VECTOR_FLAT',
      paletteLimit: 'STRICT_32_COLOR',
      surfaceDetail: 'MINIMAL',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '48 × 48 px per icon cell',
      backgroundKey: 'TRANSPARENT',
      rigMode: 'NONE',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'painted-potion-rack',
    name: 'Painted Potion Rack',
    category: 'ITEM',
    subject: {
      species: 'Consumable Potion/Cell',
      gender: 'Epic Enchanted',
      age: 'Ancient Sunken Relic',
      role: 'Resource / Mana Refill',
      setting: 'High Fantasy Magic',
      build: 'Compact One-Handed',
      silhouette: 'Bulbous flask profile',
      face_head: 'Waxed cork & wire cage',
      anatomy: 'POTION BOTTLE & CORK',
      clothing: 'Velvet Lined Display Case',
      worn_details: 'Etched Luminous Runes',
      primary_colours: 'Deep Ruby Glass #EF4444',
      accent_colours: 'Crimson Fire #EF4444',
      materials: 'Enchanted Crystal & Platinum',
      exclusions: 'No pedestal or stand',
      additional_anatomy: 'Elemental Effect Aura ×1',
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      renderStyle: 'PAINTED_2D',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'DETAILED_PRODUCTION',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      // White, because a painted glass flask is a light-coloured object with a dark rim: on magenta
      // the rim keys cleanly and the *fill* picks up a magenta cast through the transparency.
      backgroundKey: 'PURE_WHITE',
      rigMode: 'NONE',
      spriteTargetSize: '64 × 64 px per icon cell',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'MIDJOURNEY',
    },
  },
  {
    id: 'emblazoned-tower-shield',
    name: 'Emblazoned Tower Shield',
    category: 'ITEM',
    subject: {
      species: 'Armor Piece (Helmet/Shield)',
      gender: 'Mythic God-Tier',
      age: 'Battle-Scarred Veteran',
      role: 'Defensive Barrier Shield',
      setting: 'Gothic Vampire',
      build: 'Heavy Two-Handed',
      silhouette: 'Ornate Crested Shield',
      face_head: 'Centre boss & hand strap',
      anatomy: 'SHIELD WITH EMBLEM',
      clothing: 'Magnetic Back Sling',
      worn_details: 'Filigree Gold Inlay',
      primary_colours: 'Polished Silver & Gold #F59E0B',
      accent_colours: 'Golden Sunburst #F59E0B',
      materials: 'Valyrian Steel',
      exclusions: 'No holding hand or character',
      // Four separate hanging pieces, which an item sheet can afford: twelve components plus four is
      // nowhere near the ceiling, and each tassel has to move independently of the shield face.
      additional_anatomy: 'Tassel ×2, Charm Ribbon ×2',
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      renderStyle: 'CEL_SHADED',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      rigMode: 'NONE',
      spriteTargetSize: '96 × 96 px per icon cell',
      aspectRatio: 'WIDE_16_9',
      emitManifest: true,
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'arcane-focus-orb',
    name: 'Arcane Focus Orb',
    category: 'ITEM',
    subject: {
      species: 'Magical Artefact / Orb',
      gender: 'Relic of Lost Era',
      age: 'Overcharged Energy',
      role: 'Buff Emitter Stat Boost',
      setting: 'Steampunk Clockwork',
      build: 'Pocket-Sized Device',
      silhouette: 'Intricate Geometric Core',
      face_head: 'Floating Crystal Core',
      anatomy: 'ORB WITH FLOATING RINGS',
      clothing: 'Runic Power Harness',
      worn_details: 'Energy Conduits',
      primary_colours: 'Emerald Crystal #10B981 & Platinum',
      accent_colours: 'Solar Gold',
      materials: 'Enchanted Crystal & Platinum',
      exclusions: 'No magic smoke trails',
      additional_anatomy: 'Elemental Effect Aura ×1',
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      // Straight down, and one sheet per cardinal facing: a floating ring set has no front, so what
      // changes between facings is which ring is nearest — which is a depth-order question, and the
      // reason the four runs are worth generating rather than mirroring.
      projection: 'PURE_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.PURE_TOPDOWN,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'FOUR_CARDINAL',
      primaryDirection: 'north',
      paletteLimit: 'EXPANDED_ALBEDO',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      resolutionProfile: 'MID_RESOLUTION',
      spriteTargetSize: '64 × 64 px per icon cell',
      backgroundKey: 'PURE_BLACK',
      rigMode: 'NONE',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'SEEDREAM',
    },
  },
];
