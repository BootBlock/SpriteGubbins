import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Icon sets — the four grids an icon family is actually asked for.
 *
 * **The camera is what these four vary, and it is the one place this category is looser than
 * INTERFACE.** An icon depicts something, and the angle it is depicted at is a genuine art-direction
 * choice: a flat front-on ability glyph, an oblique chest, a three-quarter potion bottle and an
 * isometric map pin are all shipped icon styles. `categoryProjections.ts` leaves the whole list open
 * for that reason, so the library is what demonstrates that the choice exists at all — four icon
 * sets under one camera would have taught a reader that icons have none.
 *
 * **The first two pin the two bans no other category needs**, and between them they say why. A
 * stack count, a cooldown and a keybind are drawn by the engine at runtime over the top of the
 * sprite, so an icon carrying one serves a single quantity in a single language. The slot plate
 * belongs to INTERFACE, whose own `Inventory Slot & Icon Plate` option is exactly that piece — an
 * icon sheet that draws its own plates delivers a set that cannot be dropped into the interface the
 * project already has. The other two pin what their own deliverable gets wrong instead: a badge at
 * 16 px is ruined by a shadow falling outside its cell, and a map marker attracts the ground it is
 * meant to be placed on.
 *
 * `SINGLE_FRONT` is the honest direction set for the reason it is on every category bound to it: the
 * one mode here covers a single facing whatever the control says, and any wider set turns one grid
 * into a run of identical grids at yaws a mark in a cell does not have.
 */
export const ICON_SET_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'fantasy-inventory-icon-grid',
    name: 'Fantasy Inventory Icon Grid',
    description:
      'A painted loot grid drawn at three quarters, so a bottle and a chest both read as objects rather than as flat marks. The rarity tiers are separate pieces the engine lays over any icon.',
    category: 'ICON',
    subject: {
      species: 'Inventory & Item Icon',
      gender: 'Rare',
      age: 'Serviceable & Lightly Used',
      role: 'Restores & Heals',
      setting: 'High Fantasy',
      build: 'Standard Padded Margin',
      silhouette: 'Bold Compact Blob',
      face_head: 'Droplet & Wave',
      anatomy: 'Base Icon In Rarity Tiers',
      clothing: 'Rarity Glow & Aura',
      worn_details: 'Soft Painterly Modelling',
      primary_colours: 'Aged Bronze & Verdigris',
      accent_colours: 'Health Red #EF4444',
      materials: 'Blown Glass & Cork',
      // The one exclusion this category cannot do without. An icon with a stack count painted into
      // it is an icon for one quantity, in one language.
      exclusions: 'No lettering, numerals, stack counts or keybinds',
      additional_anatomy: 'Tier Pip ×3',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PAINTED_2D',
      projection: 'THREE_QUARTER_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.THREE_QUARTER_TOPDOWN,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'flat-ability-glyph-set',
    name: 'Flat Ability Glyph Set',
    description:
      'Abstract spell glyphs drawn face on with no object behind them, so the silhouette alone has to carry the meaning at the size a hotbar shows it.',
    category: 'ICON',
    subject: {
      species: 'Ability & Spell Icon',
      gender: 'Common',
      age: 'Enchanted & Unblemished',
      role: 'Damages & Attacks',
      setting: 'Near-Future Cyberpunk',
      build: 'Small Centred Mark',
      silhouette: 'Radial & Symmetrical',
      face_head: 'Bolt & Spark',
      anatomy: 'Shared Backing With Swappable Motif',
      clothing: 'Cooldown Dimming Veil',
      worn_details: 'Flat Fill, No Interior Detail',
      primary_colours: 'Slate #1E293B & Pale Ice',
      accent_colours: 'Frost Cyan #22D3EE',
      materials: 'Brushed Alloy & Backlit Panel',
      // The other ban an icon set needs, and the boundary with INTERFACE: the plate this glyph sits
      // in is that category's component, so a set that draws its own cannot be dropped into an
      // interface the project already has.
      exclusions: 'No slot plate, frame or border behind the icon',
      additional_anatomy: 'Element Corner Badge ×4',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'CEL_SHADED',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'RESTRAINED_64_COLOR',
      surfaceDetail: 'MINIMAL',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'pixel-status-badge-set',
    name: 'Pixel Status Badge Set',
    description:
      'Tiny status badges at a fixed cell size, drawn to read as a condition rather than as an object. At this size every extra interior line arrives as noise instead of detail.',
    category: 'ICON',
    subject: {
      species: 'Status Effect Badge',
      gender: 'Cursed & Corrupted',
      age: 'Cracked & Failing',
      role: 'Debuffs & Hinders',
      setting: 'Grim Dark Fantasy',
      build: 'Tightly Filling The Cell',
      silhouette: 'Angular & Faceted',
      face_head: 'Skull & Hazard Mark',
      anatomy: 'Matched Pair, Enabled And Disabled',
      clothing: 'Broken Crack Overlay',
      worn_details: 'Two-Tone Block Shading',
      primary_colours: 'Matte Black & Bone White',
      accent_colours: 'Poison Green #4ADE80',
      materials: 'Bone, Horn & Sinew',
      exclusions: 'No drop shadow outside the icon’s own outline',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PIXEL_ART',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '16 × 16 px per badge',
      paletteLimit: 'STRICT_32_COLOR',
      surfaceDetail: 'MINIMAL',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'isometric-map-marker-set',
    name: 'Isometric Map Marker Set',
    description:
      'Waypoint markers drawn in true isometric so they sit on the same grid the map does. A marker at a different angle from the terrain beneath it reads as pasted on rather than placed.',
    category: 'ICON',
    subject: {
      species: 'Map & Waypoint Marker',
      gender: 'Uncommon',
      age: 'Pristine & Newly Made',
      role: 'Marks A Place',
      setting: 'Victorian Gaslamp',
      build: 'Filling A Tall Portrait Cell',
      silhouette: 'Upright Vertical Mass',
      face_head: 'Chevron & Directional Wedge',
      anatomy: 'Base Icon With State Overlays',
      clothing: 'New Item Flare & Sparkle',
      worn_details: 'Etched Engraved Lines',
      primary_colours: 'Warm Leather Brown & Tan',
      accent_colours: 'Warning Amber #F59E0B',
      materials: 'Cast Iron & Riveted Plate',
      exclusions: 'No background scene, tabletop or ground plane',
      additional_anatomy: 'Empty Slot Mark ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PIXEL_ART',
      projection: 'TRUE_ISOMETRIC',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'RESTRAINED_64_COLOR',
      surfaceDetail: 'CLEAN_PRODUCTION',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GPT_IMAGE',
    },
  },
];
