import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Spell, status and travelling effects — the half of an effect library that is not a one-shot hit.
 *
 * The combat four fire, land, and are gone inside half a second. These four are what an effect does
 * when it has to last: **two loop** (the portal and the aura, which say so through
 * `Seamless Loop Cycle`), **one holds** before it pays off (the nova's
 * `Telegraph, Impact, Residue`), and **one travels** (`Core And Secondary Split`, a projectile body
 * with its own trail behind it). Between them that is every Frame Assembly Base shape except the
 * plain burst the combat file already covers.
 *
 * The looping pair are the ones that are harder to get right, and the reason is a constraint a burst
 * does not have: the last frame has to read back into the first without a seam, which is a property
 * of the whole sequence rather than of any frame in it.
 *
 * They also carry the palette-limit and render-style range a burst rarely reaches: a portal is a
 * painted volume with no hard edge anywhere, and a status marker is flat vector shapes that have
 * nothing else. See `effectCombat.ts` for why every one of them sets `rigMode: 'NONE'` and chooses
 * its own background key.
 */
export const EFFECT_MAGIC_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'arcane-portal-loop',
    name: 'Painted Arcane Portal Loop',
    category: 'EFFECT',
    subject: {
      species: 'Portal / Rift Opening',
      gender: 'Arcane / Runic',
      age: 'Standard Hit',
      role: 'Persistent Area Field',
      setting: 'High Fantasy Magic',
      build: 'Tall Column or Beam',
      silhouette: 'Spiralling Vortex',
      face_head: 'Hollow Ring, No Centre',
      anatomy: 'Seamless Loop Cycle',
      clothing: 'Drifting Ember Motes',
      worn_details: 'Runic Glyphs & Sigils',
      primary_colours: 'Arcane Violet #8B5CF6 & Indigo',
      accent_colours: 'Rim Magenta #F0ABFC',
      materials: 'Soft Volumetric Haze',
      exclusions: 'No overlap or bleed between frames',
      additional_anatomy: 'NONE',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PAINTED_2D',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'TEXTURED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'GEMINI_PRO_IMAGE',
    },
  },
  {
    id: 'frost-nova-cast',
    name: 'Three-Quarter Frost Nova',
    category: 'EFFECT',
    subject: {
      species: 'Spell Cast / Channel',
      gender: 'Ice & Frost',
      age: 'Heavy / Empowered',
      role: 'Telegraph / Wind-Up',
      setting: 'High Fantasy Magic',
      build: 'Wide Area Blast',
      silhouette: 'Radial Burst',
      face_head: 'Layered Multi-Core Cluster',
      anatomy: 'Telegraph, Impact, Residue',
      clothing: 'Condensation & Vapour',
      worn_details: 'Crackle & Fracture Lines',
      primary_colours: 'Frost Blue #38BDF8 & Pale White',
      accent_colours: 'Electric Cyan #22D3EE',
      materials: 'Additive Core, Opaque Debris',
      exclusions: 'No character, hand or weapon in frame',
      additional_anatomy: 'Debris Chunk ×4',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'RENDERED_3D',
      // The studio's own default camera, which is the one most action games put the field under —
      // and the one a ground-level nova has to agree with or it will not sit flat on the floor.
      projection: 'THREE_QUARTER_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.THREE_QUARTER_TOPDOWN,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'FOUR_CARDINAL',
      primaryDirection: 'south',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'DETAILED_PRODUCTION',
      resolutionProfile: 'CUSTOM',
      // `CUSTOM` means "work to this size", so the field has to carry one — with it empty the prompt
      // loses the only statement of scale it had.
      spriteTargetSize: '256 × 256 px per frame',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'PURE_BLACK',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'FLUX_API',
    },
  },
  {
    id: 'vector-status-aura',
    name: 'Vector Status Aura Loop',
    category: 'EFFECT',
    subject: {
      species: 'Aura / Status Field',
      gender: 'Holy / Radiant',
      age: 'Minor / Glancing',
      role: 'Status Ailment Marker',
      setting: 'Cyberpunk Neon',
      build: 'Actor-Sized Burst',
      silhouette: 'Expanding Ring / Shockwave',
      face_head: 'Diffuse, No Single Focus',
      anatomy: 'Seamless Loop Cycle',
      clothing: 'No Secondary Layer',
      worn_details: 'Concentric Pulse Rings',
      primary_colours: 'Void Black & Crimson',
      accent_colours: 'Smoke Grey #6B7280',
      materials: 'Opaque Painted Shapes',
      // A status marker sits under the actor's feet for as long as the status lasts, so anything the
      // engine draws on top of it — a number, a bar, a cursor — would be baked in twice.
      exclusions: 'No damage numbers or UI text',
      additional_anatomy: 'NONE',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'VECTOR_FLAT',
      projection: 'OBLIQUE_45',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.OBLIQUE_45,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'STRICT_32_COLOR',
      surfaceDetail: 'MINIMAL',
      resolutionProfile: 'MID_RESOLUTION',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'PURE_WHITE',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'QWEN_IMAGE',
    },
  },
  {
    id: 'ink-void-projectile-trail',
    name: 'Hand-Drawn Void Projectile Trail',
    category: 'EFFECT',
    subject: {
      species: 'Projectile Body & Trail',
      gender: 'Void / Shadow',
      age: 'Fizzle / Failed Cast',
      role: 'Traversal & Movement Cue',
      setting: 'Cosmic Horror',
      build: 'Thin Trail or Ribbon',
      silhouette: 'Sweeping Ribbon Arc',
      face_head: 'Dense Molten Core',
      anatomy: 'Core And Secondary Split',
      clothing: 'Smoke & Soot Plume',
      worn_details: 'Scrolling Noise Texture',
      primary_colours: 'Ember Orange #F97316 & Deep Red',
      accent_colours: 'Scorch Umber #6B4423',
      materials: 'Refractive Distortion Only',
      exclusions: 'No lens flare or camera artefacts',
      additional_anatomy: 'Lingering Smoke Puff ×2',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'HAND_DRAWN_INK',
      projection: 'DIMETRIC_2_1',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.DIMETRIC_2_1,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'THREE_CLASSIC',
      primaryDirection: 'right side',
      rigMode: 'NONE',
      paletteLimit: 'EXPANDED_ALBEDO',
      surfaceDetail: 'CLEAN_PRODUCTION',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      backgroundKey: 'PURE_WHITE',
      aspectRatio: 'TALL_9_16',
      targetModel: 'GEMINI_FLASH_IMAGE',
    },
  },
];
