import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Background layers — the four backdrops a scrolling game and a still screen are actually asked for.
 *
 * **The axis these four vary is the one that decides everything downstream: does it loop.** A
 * parallax band butts against its own copy for ever and can therefore carry nothing a player would
 * recognise twice; a static panel is drawn once at screen size and is free to be the most
 * distinctive image in the game. Those are two different disciplines from the same subject, which is
 * why this category has two sheet modes and why the library spends two presets on each.
 *
 * **All four share `ORTHOGRAPHIC_FRONT`, and it is the category rather than a choice.** A backdrop is
 * a plane standing at a distance, seen face on: it has no top surface, no ground plane to lay out and
 * no thickness to project, so `categoryProjections.ts` binds it exactly as it binds INTERFACE. What
 * a backdrop *does* have and a widget does not is depth — which is carried by the depth tier and the
 * palette, not by the camera.
 *
 * **Each of the four pins the playable-geometry exclusion or the seam one**, and between them they
 * say why a backdrop has two bans no other category needs. A ledge painted into the far band is a
 * ledge somebody will try to stand on, which costs a bug report rather than a redraw; a visible join
 * is the failure that only shows up once the band is scrolling, by which time the sheet has been
 * signed off.
 */
export const BACKGROUND_LAYER_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'forest-parallax-band-set',
    name: 'Forest Parallax Band Set',
    description:
      'Four looping bands of woodland at dusk, each pulled towards the sky colour as it recedes. The landmark is a loose piece, because a castle drawn into a band would be recognised every screen.',
    category: 'BACKGROUND',
    subject: {
      species: 'Near Treeline & Hedgerow',
      gender: 'Far Parallax, Slowest',
      age: 'Golden Hour & Long Light',
      role: 'Establishing Vista',
      setting: 'High Fantasy Wilderness',
      build: 'Long Repeat, Four Screens Wide',
      silhouette: 'Dense Irregular Canopy',
      face_head: 'No Landmark — Fully Repeatable',
      anatomy: 'Horizontally Seamless Band',
      clothing: 'Shafts Of Light Through Gaps',
      worn_details: 'Soft Painterly Blocking',
      primary_colours: 'Dawn Rose & Pale Gold',
      accent_colours: 'Lantern Amber #F59E0B',
      materials: 'Living Foliage & Bark',
      // The failure that only shows once the band is scrolling, by which time the sheet has been
      // signed off.
      exclusions: 'No visible seam where the band repeats',
      additional_anatomy: 'Falling Leaf ×3',
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
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'cyberpunk-city-parallax',
    name: 'Cyberpunk City Parallax',
    description:
      'A neon skyline in restrained pixel art, drawn quiet enough to lose to whatever is fighting in front of it. Lit windows are the only bright note the bands are allowed.',
    category: 'BACKGROUND',
    subject: {
      species: 'Mid-Distance Skyline & Rooftops',
      gender: 'Mid Parallax',
      age: 'Rain & Low Cloud',
      role: 'Combat Arena Backdrop',
      setting: 'Near-Future Cyberpunk Street',
      build: 'Standard Repeat, Two Screens Wide',
      silhouette: 'Broken Urban Roofline',
      face_head: 'No Landmark — Fully Repeatable',
      anatomy: 'Stacked Depth Layers',
      clothing: 'Rain Veil & Streaks',
      worn_details: 'Dithered Gradient Bands',
      primary_colours: 'Night Indigo #1E1B4B & Deep Blue',
      accent_colours: 'Neon Magenta #E879F9',
      materials: 'Glass, Steel & Concrete',
      // The ban that costs a bug report rather than a redraw: a ledge painted into the far band is a
      // ledge somebody will try to stand on.
      exclusions: 'No playable platforms, ledges or collision geometry',
      additional_anatomy: 'Drifting Cloud Wisp ×2, Sun Disc ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PIXEL_ART',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'TILESET_MODULAR',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '640 × 360 px per band',
      paletteLimit: 'RESTRAINED_64_COLOR',
      surfaceDetail: 'CLEAN_PRODUCTION',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'title-screen-backdrop-panel',
    name: 'Title Screen Backdrop Panel',
    description:
      'A single non-repeating panel for a title screen, cut into the few pieces a slow camera pan needs. Nothing here loops, so the landmark can be the most distinctive image in the game.',
    category: 'BACKGROUND',
    subject: {
      species: 'Full Static Scene Panel',
      gender: 'Static Non-Scrolling Panel',
      age: 'Night & Moonlit',
      role: 'Title & Menu Backdrop',
      setting: 'Post-Apocalyptic Waste',
      build: 'Full-Screen Single Panel',
      silhouette: 'Ragged Ruin & Collapse',
      face_head: 'Wrecked Ship & Hulk',
      anatomy: 'Single Non-Repeating Panel',
      clothing: 'Low Fog Bank',
      worn_details: 'Visible Brush Texture',
      primary_colours: 'Ash Grey & Ember Orange',
      accent_colours: 'Moonlit Silver #CBD5E1',
      materials: 'Corroded Alloy & Cabling',
      exclusions: 'No interface, logo or lettering',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
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
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GEMINI_PRO_IMAGE',
    },
  },
  {
    id: 'undersea-cavern-layer-library',
    name: 'Undersea Cavern Layer Library',
    description:
      'A boss chamber drawn as separable masses rather than one picture, so the camera can move without the far wall moving with it. The dressing pieces are placed once and drawn clear.',
    category: 'BACKGROUND',
    subject: {
      species: 'Underwater Column & Kelp',
      gender: 'Foreground Overlay, Ahead Of Play',
      age: 'Fog & Heavy Haze',
      role: 'Boss Chamber',
      setting: 'Tropical Island & Reef',
      build: 'Tall Vertical Column',
      silhouette: 'Sheer Cliff Wall',
      face_head: 'Colossal Statue',
      anatomy: 'Seamless Band With Loose Overlays',
      clothing: 'Drifting Embers & Motes',
      worn_details: 'Hatched & Cross-Hatched Shading',
      primary_colours: 'Deep Teal Water & Sunlit Surface',
      accent_colours: 'Bioluminescent Green #4ADE80',
      materials: 'Water, Silt & Weed',
      exclusions: 'No foreground props the player could mistake for pickups',
      additional_anatomy: 'Reflection Strip ×1',
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
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'TALL_9_16',
      targetModel: 'GPT_IMAGE',
    },
  },
];
