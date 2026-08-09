import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Interface kits — the four sheets an interface is actually asked for.
 *
 * **All four share a camera, and that is the finding rather than an oversight.** An interface is
 * flat: it has no yaw to turn to and no elevation to be seen from, so `ORTHOGRAPHIC_FRONT` at zero
 * elevation is not one option among several — it is the only camera the subject has. What these
 * four vary instead are the axes that do carry information here: which of the two sheet modes the
 * deliverable wants, and how the widgets are rendered. Picking four fantasy panels in four
 * colourways would have demonstrated the option pool and none of the machinery.
 *
 * **Lighting is not part of that**, and the retro kit below is why it is worth separating: a
 * bevelled console panel has a very definite light direction, because a raised edge only reads as
 * raised if its highlight and its shade agree about where the light is. What an interface lacks is a
 * light *in the scene* — the direction is a drawing convention, and the lighting model is where a
 * preset states which one.
 *
 * `SINGLE_FRONT` is then the honest direction set rather than what makes the prompt coherent — both
 * modes here cover one facing whatever the control says, so `[IF:MULTI_DIRECTION]` drops section 3's
 * rotation rules, its landmark and occlusion clauses, section 0's turn contract and section 9's
 * directional audit either way. What the set decides is how many *sheets* the deliverable is: any
 * wider set turns one kit into a run of identical kits at yaws a widget does not have.
 */
export const INTERFACE_KIT_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'fantasy-parchment-menu',
    name: 'Fantasy Parchment Menu Kit',
    category: 'INTERFACE',
    subject: {
      species: 'Panel & Window Frame',
      gender: 'Primary Call To Action',
      age: 'Softly Worn Edges',
      role: 'Confirm & Accept',
      setting: 'Parchment & Ink Fantasy',
      build: 'Generous & Airy',
      silhouette: 'Scrollwork Ornate Corners',
      face_head: 'Rune & Sigil Carving',
      anatomy: 'Nine-Slice Stretching Frame',
      clothing: 'Filigree Corner Scrollwork',
      worn_details: 'Parchment Fibre & Foxing',
      primary_colours: 'Aged Parchment & Sepia Ink',
      accent_colours: 'Polished Gold #D4AF37',
      materials: 'Aged Parchment & Wax Seal',
      // The one exclusion this category cannot do without. A quest log with "ACCEPT" painted into
      // the sprite is a quest log for one language and one verb.
      exclusions: 'No lettering, numerals or captions',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PAINTED_2D',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'TILESET_MODULAR',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'TEXTURED',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'cyberpunk-hud-states',
    name: 'Cyberpunk HUD State Library',
    category: 'INTERFACE',
    subject: {
      species: 'Progress & Resource Bar',
      gender: 'Neutral Informational',
      age: 'Glitching & Signal-Degraded',
      role: 'Display Only / Readout',
      setting: 'Cyberpunk Neon HUD',
      build: 'Compact & Tightly Packed',
      silhouette: 'Chamfered Sci-Fi Corners',
      face_head: 'Abstract Geometric Emblem',
      anatomy: 'Three-Slice Horizontal Stretch',
      clothing: 'Etched Circuit Tracery',
      worn_details: 'Hairline Scan Lines',
      primary_colours: 'Midnight Navy #0F172A & Steel',
      accent_colours: 'Interface Cyan #22D3EE',
      materials: 'Backlit Acrylic & Anodised Alloy',
      // A HUD is drawn over the game, so a baked drop shadow arrives as a grey halo the compositor
      // cannot remove — and it falls outside the piece's own bounds, which breaks the cell.
      exclusions: 'No drop shadow behind any piece',
      additional_anatomy: 'Cooldown Sweep ×2',
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
      // Emissive rather than flat: a backlit HUD reads as lit from within, and nothing on the sheet
      // is meant to take a key light at all.
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      paletteLimit: 'STRICT_32_COLOR',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'flat-mobile-ui-slices',
    name: 'Flat Mobile UI Nine-Slices',
    category: 'INTERFACE',
    subject: {
      species: 'Button & Key Cap',
      gender: 'Secondary / Supporting',
      age: 'Crisp Factory-New',
      role: 'Navigate & Page',
      setting: 'Minimalist Flat Modern',
      build: 'Standard Touch Target',
      silhouette: 'Fully Pill-Rounded',
      face_head: 'Chevron & Directional Wedge',
      anatomy: 'Three-Slice Horizontal Stretch',
      clothing: 'Plain Untrimmed Edge',
      worn_details: 'Clean Untextured Fields',
      primary_colours: 'Bright Paper White & Charcoal',
      accent_colours: 'Confirm Green #10B981',
      materials: 'Matte Plastic & Rubber Grip',
      exclusions: 'No screenshot chrome or device bezel',
      additional_anatomy: 'Focus Ring ×1, Selected Fill ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'VECTOR_FLAT',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'TILESET_MODULAR',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      surfaceDetail: 'MINIMAL',
      paletteLimit: 'RESTRAINED_64_COLOR',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '96 × 48 px per button slice',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GEMINI_PRO_IMAGE',
    },
  },
  {
    id: 'retro-console-menu-chrome',
    name: 'Retro Console Menu Chrome',
    category: 'INTERFACE',
    subject: {
      species: 'Inventory Slot & Icon Plate',
      gender: 'Disabled & Unavailable',
      age: 'Scuffed & Scratched Metal',
      role: 'Equip & Inventory',
      setting: 'Retro 16-Bit Console Menu',
      build: 'Chunky Oversized Console',
      silhouette: 'Bevelled Raised Relief',
      face_head: 'No Glyph — Blank Face',
      anatomy: 'Single Fixed-Size Piece',
      clothing: 'Beaded Metal Rivets',
      worn_details: 'Hammered Metal Dimpling',
      primary_colours: 'Slate #1E293B & Cool Grey',
      accent_colours: 'Muted Disabled Grey #64748B',
      materials: 'Brushed Steel & Smoked Glass',
      // An empty slot is the point: a slot drawn holding a sword is a slot that can only ever hold
      // that sword, since the item sprite is composited over it at runtime.
      exclusions: 'No gameplay art inside the frames',
      additional_anatomy: 'Locked Overlay ×1, Equipped Mark ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'RETRO_PIXEL_ART',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      // The one lighting model a bevel needs: a raised edge only reads as raised if the highlight
      // and the shade agree about where the light comes from, and top-left is the convention every
      // console interface of that era was drawn to.
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      resolutionProfile: 'RETRO_16_BIT',
      paletteLimit: 'STRICT_32_COLOR',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      surfaceDetail: 'DETAILED_PRODUCTION',
      aspectRatio: 'TALL_9_16',
      targetModel: 'GENERIC',
    },
  },
];
