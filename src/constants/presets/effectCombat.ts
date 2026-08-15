import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Combat effects — the four cameras a hit actually gets drawn under.
 *
 * Chosen by *camera and direction handling* rather than by element, because that is the decision an
 * effect sheet turns on and the one a dropdown cannot teach. The same explosion is a flat elevation
 * for a platformer, one run of eight for a top-down shooter, and a single isometric burst; picking
 * four fireballs in four colours would have demonstrated the option pool and none of the machinery.
 *
 * **Two settings recur across all eight EFFECT presets, and both are load-bearing.**
 *
 * `rigMode: 'NONE'` — section 5's pose-library block asks for rigid segments that flex about shared
 * pivots, and a frame is not a segment: it is the whole effect at one moment. Leaving the studio's
 * default `POSE_LIBRARY` in place would put a page about pivot diameters on a sheet with no joints.
 *
 * `backgroundKey` is chosen per preset rather than left at the sheet default. Magenta keying works by
 * finding one exact colour and removing it, which needs a hard edge to find — and an additive glow
 * has none. So the additive sheets sit on `TRANSPARENT` or `PURE_BLACK`, which is also how additive
 * art is authored: black is the identity for the blend mode these effects are composited with.
 */
export const EFFECT_COMBAT_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'pixel-explosion-flipbook',
    name: 'Pixel Explosion Flipbook',
    description:
      'An explosion strip in flat front elevation, keyed on magenta. Pixel art dithers its alpha rather than feathering it, so the edge stays hard enough for the key to find.',
    category: 'EFFECT',
    subject: {
      species: 'Explosion / Detonation',
      gender: 'Fire & Ember',
      age: 'Heavy / Empowered',
      role: 'Death & Destruction',
      setting: 'Retro Arcade',
      build: 'Actor-Sized Burst',
      silhouette: 'Radial Burst',
      face_head: 'Hot White Centre',
      anatomy: 'One-Shot Burst Sequence',
      clothing: 'Smoke & Soot Plume',
      worn_details: 'Ember Speckle',
      primary_colours: 'Ember Orange #F97316 & Deep Red',
      accent_colours: 'Core Flash White #FFFFFF',
      materials: 'Dithered Pixel Transparency',
      exclusions: 'No character, hand or weapon in frame',
      additional_anatomy: 'Ground Scorch Decal ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PIXEL_ART',
      // Flat front elevation: a flipbook is read as a strip, and any camera angle at all would have
      // the sixteen frames disagreeing about where the ground is.
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'STRICT_32_COLOR',
      resolutionProfile: 'RETRO_16_BIT',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      // Pixel art dithers its alpha rather than feathering it, so the edge stays hard and magenta
      // keying has something to find — the one render style where the sheet default is still right.
      backgroundKey: 'MAGENTA_FF00FF',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'topdown-muzzle-flash-run',
    name: 'Top-Down Muzzle Flash Run',
    description:
      'Eight frame sequences of a muzzle flash seen from overhead, one per compass facing, sharing one identity lock — a directional effect needs eight animations rather than eight frozen frames.',
    category: 'EFFECT',
    subject: {
      species: 'Muzzle Flash / Discharge',
      gender: 'Plasma / Energy',
      age: 'Standard Hit',
      role: 'Impact Confirmation',
      setting: 'Deep-Space Sci-Fi',
      build: 'Point Spark',
      silhouette: 'Directed Cone',
      face_head: 'Concentrated Point Flare',
      anatomy: 'One-Shot Burst Sequence',
      clothing: 'Trailing Spark Shower',
      worn_details: 'Arcing Filaments',
      primary_colours: 'Plasma Cyan & Chrome',
      accent_colours: 'Core Flash White #FFFFFF',
      materials: 'Additive Glow, No Opaque Mass',
      // The weapon is what a generator adds unasked to anything captioned "muzzle", and it is drawn
      // *behind* the flash — so the component it belongs to cannot be cut out without it.
      exclusions: 'No character, hand or weapon in frame',
      additional_anatomy: 'NONE',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PIXEL_ART',
      // Directly overhead, where a cone points somewhere definite and the eight runs differ by a
      // rotation the player can actually read.
      projection: 'PURE_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.PURE_TOPDOWN,
      // Eight sheets, not one: this mode covers the primary facing alone, so a direction set beside
      // it is a run list. That is what a directional effect needs — eight frame *sequences* sharing
      // one identity lock, rather than one sheet holding eight frozen frames and no animation.
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'south',
      rigMode: 'NONE',
      paletteLimit: 'RESTRAINED_64_COLOR',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      backgroundKey: 'PURE_BLACK',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'sideon-impact-spark',
    name: 'Side-On Impact Spark',
    description:
      'A cel-shaded hit spark in flat side elevation on transparency. Cel shapes have a hard contour by definition, so the alpha is exact and needs no key colour.',
    category: 'EFFECT',
    subject: {
      species: 'Impact Hit Spark',
      gender: 'Kinetic Dust & Debris',
      age: 'Critical / Overcharged',
      role: 'Impact Confirmation',
      setting: 'Anime Action',
      build: 'Point Spark',
      silhouette: 'Jagged Shard Cluster',
      face_head: 'Concentrated Point Flare',
      anatomy: 'Telegraph, Impact, Residue',
      clothing: 'Flying Debris Chunks',
      worn_details: 'Hard Cel Shape Banding',
      primary_colours: 'Radiant Gold #FBBF24 & Cream',
      accent_colours: 'Spark Yellow #FDE047',
      materials: 'Hard-Edged Cel Shapes',
      exclusions: 'No motion blur across the cell',
      additional_anatomy: 'Debris Chunk ×4',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'CEL_SHADED',
      projection: 'ORTHOGRAPHIC_SIDE',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_SIDE,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'EXPANDED_ALBEDO',
      surfaceDetail: 'MINIMAL',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      // Cel shapes have a hard contour by definition, so alpha is exact and needs no key colour.
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'SEEDREAM',
    },
  },
  {
    id: 'diamond-shockwave-burst',
    name: '2:1 Diamond Shockwave Burst',
    description:
      'A painted ground telegraph drawn on the 2:1 dimetric grid most engines call isometric, as four cardinal sheets. Under any other camera its ellipse is the wrong shape.',
    category: 'EFFECT',
    subject: {
      species: 'Explosion / Detonation',
      gender: 'Toxic / Corrosive',
      age: 'Ultimate / Screen-Filling',
      role: 'Telegraph / Wind-Up',
      setting: 'Grounded Naturalism',
      build: 'Wide Area Blast',
      silhouette: 'Expanding Ring / Shockwave',
      face_head: 'Hollow Ring, No Centre',
      anatomy: 'In, Hold, Out Transitions',
      clothing: 'Ground Dust Kick-Up',
      worn_details: 'Concentric Pulse Rings',
      primary_colours: 'Toxic Acid Green & Charcoal',
      accent_colours: 'No Accent — Single Hue Ramp',
      materials: 'Soft Volumetric Haze',
      exclusions: 'No ground plane or cast shadow',
      additional_anatomy: 'Shockwave Ring ×1, Ember Cluster ×2',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PAINTED_2D',
      // A ground telegraph is drawn in the projection it will be laid over, or its ellipse is the
      // wrong shape — the one case where an effect's camera is dictated by the field beneath it.
      // That makes it `DIMETRIC_2_1` and not the true isometric: the ground this is laid over is the
      // 2:1 diamond both tileset presets and both projected style references draw, and a ring drawn
      // for a 1.73:1 ground sits on a 2:1 one as an ellipse of visibly the wrong eccentricity.
      projection: 'DIMETRIC_2_1',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.DIMETRIC_2_1,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'FOUR_CARDINAL',
      primaryDirection: 'south',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'TEXTURED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GPT_IMAGE',
    },
  },
];
