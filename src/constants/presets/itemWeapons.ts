import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Weapons — the loot category the app had no preset for at all until these.
 *
 * An item is the smallest thing this app draws, and that is what makes the settings matter: an icon
 * seen at 32 px is its silhouette and nothing else. So all four state a per-cell pixel size outright —
 * an inventory grid has a cell size and no resolution profile can express one, because every profile is
 * written in terms of a figure's height — and all four exclude the hand, the stand and the glow trail,
 * each of which extends past the item's own bounds and breaks the alignment the cell exists to keep.
 */
export const ITEM_WEAPON_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'legendary-greatsword',
    name: 'Legendary Greatsword',
    description:
      'An inventory icon at 64 × 64 px cells, turned through the directional core with top-left lighting. It excludes the holding hand, which reaches past the item’s own bounds and breaks the cell.',
    category: 'ITEM',
    subject: {
      species: 'Melee Weapon (Sword/Axe)',
      gender: 'Legendary / Artifact',
      age: 'Pristine Forge Condition',
      role: 'Primary Offensive Weapon',
      setting: 'High Fantasy Magic',
      build: 'Heavy Two-Handed',
      silhouette: 'Symmetrical Elegant Blade',
      face_head: 'Leather Wrapped Hilt & Gem Pommel',
      anatomy: 'Single Weapon Item',
      clothing: 'Matched Scabbard / Sheath',
      worn_details: 'Etched Luminous Runes',
      primary_colours: 'Damascus Steel & Obsidian',
      accent_colours: 'Ethereal Arcane Purple #8B5CF6',
      materials: 'Mithril & Dragon Scale',
      exclusions: 'No holding hand or character',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      rigMode: 'NONE',
      spriteTargetSize: '64 × 64 px per icon cell',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'rendered-plasma-rifle',
    name: 'Rendered Plasma Rifle',
    description:
      'A rendered 3D gun in flat side elevation on transparency, in a wide cell rather than a square one — a rifle drawn side-on leaves most of a square cell empty.',
    category: 'ITEM',
    subject: {
      species: 'Ranged Weapon (Rifle/Bow)',
      gender: 'Crafted Masterwork',
      age: 'Freshly Synthesized',
      role: 'Primary Offensive Weapon',
      setting: 'Sci-Fi Energy Weapon',
      build: 'Medium Dual-Wield',
      silhouette: 'Intricate Geometric Core',
      face_head: 'Ergonomic Synthetic Grip',
      anatomy: 'Weapon With Detachable Mag',
      clothing: 'Magnetic Back Sling',
      worn_details: 'Serial Numbers & Barcode',
      primary_colours: 'Titanium Grey & Black',
      accent_colours: 'Plasma Blue Glow #22D3EE',
      materials: 'Plasma Conduit & Polymer',
      exclusions: 'No pedestal or stand',
      additional_anatomy: 'Attachable Scope ×1, Laser Sight ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'RENDERED_3D',
      // A gun is drawn side-on because that is the view its silhouette lives in — and a flat side
      // elevation is also the one that lets a scope and a sight be swapped without redrawing anything.
      projection: 'ORTHOGRAPHIC_SIDE',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_SIDE,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'TEXTURED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      backgroundKey: 'TRANSPARENT',
      rigMode: 'NONE',
      // Wider than it is tall, unlike the rest: a rifle drawn side-on in a square cell is a rifle with
      // most of the cell above and below it empty.
      spriteTargetSize: '128 × 64 px per icon cell',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'cursed-prototype-waraxe',
    name: 'Cursed Prototype Waraxe',
    description:
      'An inked, hatched weapon on white at one facing, held to 32 colours. The item counterpart to the woodcut humanoid, and the same argument for a single pose.',
    category: 'ITEM',
    subject: {
      species: 'Melee Weapon (Sword/Axe)',
      gender: 'Cursed Prototype',
      age: 'Corroded / Ruined',
      role: 'Primary Offensive Weapon',
      setting: 'Eldritch Void',
      build: 'Over-Sized Colossal',
      silhouette: 'Double-Headed Axe Blade',
      face_head: 'Dragon-Head Crossguard',
      anatomy: 'Single Weapon Item',
      clothing: 'NONE',
      worn_details: 'Blood Groove & Notch Marks',
      primary_colours: 'Matte Black & Cyan #06B6D4',
      accent_colours: 'Void Black',
      materials: 'Obsidian Glass & Brass',
      exclusions: 'No magic smoke trails',
      additional_anatomy: 'Bayonet Blade Tip ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'HAND_DRAWN_INK',
      surfaceDetail: 'TEXTURED',
      resolutionProfile: 'MID_RESOLUTION',
      paletteLimit: 'STRICT_32_COLOR',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      backgroundKey: 'PURE_WHITE',
      rigMode: 'NONE',
      spriteTargetSize: '64 × 64 px per icon cell',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'SEEDREAM',
    },
  },
  {
    id: 'retro-hunters-bow',
    name: '16-Bit Hunter’s Bow',
    description:
      'A 16-bit icon at 32 × 32 px cells with no interior detail and a hard black outline, turned through the directional core. What a weapon looks like at the smallest scale here.',
    category: 'ITEM',
    subject: {
      species: 'Ranged Weapon (Rifle/Bow)',
      gender: 'Standard Issue / Common',
      age: 'Battle-Scarred Veteran',
      role: 'Primary Offensive Weapon',
      setting: 'High Fantasy Magic',
      build: 'Slender Delicate',
      silhouette: 'Recurved limb profile',
      face_head: 'Wrapped grip & string nock',
      anatomy: 'Single Weapon Item',
      clothing: 'Leather Holster Belt',
      worn_details: 'Filigree Gold Inlay',
      primary_colours: 'Polished Silver & Gold #F59E0B',
      accent_colours: 'Toxic Poison Green #84CC16',
      materials: 'Yew wood & waxed sinew',
      exclusions: 'No floor shadow',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'RETRO_PIXEL_ART',
      resolutionProfile: 'RETRO_16_BIT',
      paletteLimit: 'STRICT_32_COLOR',
      surfaceDetail: 'MINIMAL',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      rigMode: 'NONE',
      spriteTargetSize: '32 × 32 px per icon cell',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
];
