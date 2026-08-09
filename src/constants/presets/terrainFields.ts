import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Ground fields — the four sheets a level's terrain is actually built from.
 *
 * Chosen by *which two materials meet*, because that is the decision a terrain sheet turns on and the
 * one a dropdown cannot teach. A blend set draws the same tiles whatever the materials are; what
 * changes is whether the boundary is grass giving way to a dirt track, snow to bare rock, or water to
 * sand — and the third of those is a shoreline, which needs no plan of its own precisely because a
 * shoreline is two materials meeting like any other.
 *
 * Every one states its tile size outright, for the reason the building tile sets do: a tile that does
 * not match the engine's grid is not a stylistic miss, it is unusable, and no resolution profile can
 * say it, since every profile is written in terms of a figure's height.
 *
 * **The cliff preset is the one that is not a blend set**, and it is here to show where the blend set
 * stops. A cliff is a change in height rather than in material, so it needs an exposed face that a
 * flat field has nowhere to put — which is why the elevation edge lives in the feature library, and
 * why a reader who only ever opens `TILESET_MODULAR` would never find it.
 */
export const TERRAIN_FIELD_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'topdown-grass-dirt-blend',
    name: 'Top-Down Grass & Dirt Blend',
    category: 'TERRAIN',
    subject: {
      species: 'Grassland & Meadow',
      gender: 'Lush & Thriving',
      age: 'Lightly Weathered',
      role: 'Walkable Ground',
      setting: 'High Fantasy Wilderness',
      build: 'Medium Grain, Balanced',
      silhouette: 'Soft Organic Feathered Edge',
      face_head: 'Hero Boulder Outcrop',
      anatomy: 'Corner-Matched Blob Set',
      clothing: 'Grass Tufts & Weeds',
      worn_details: 'Pebble Runs & Grit',
      primary_colours: 'Meadow Green & Loam Brown',
      accent_colours: 'Wildflower Yellow #FACC15',
      materials: 'Soil, Turf & Root Mat',
      exclusions: 'No characters, no buildings, no sky, no cast shadow',
      additional_anatomy: 'Dirt Path Straight ×2, Path Corner ×2',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'TILESET_MODULAR',
      // Directly overhead, where a boundary is a shape on a flat plane and nothing carries a
      // vertical face. Any elevation at all gives every tile a side that has to agree with the tile
      // beside it, which is a second seam to keep closed for no gain on a ground field.
      projection: 'PURE_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.PURE_TOPDOWN,
      // Tiles have one view; there is no facing to turn.
      directions: 'SINGLE_FRONT',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '32 × 32 px per tile',
      rigMode: 'NONE',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'iso-snow-rock-blend',
    name: 'Isometric Snow & Rock Blend',
    category: 'TERRAIN',
    subject: {
      species: 'Snowfield & Ice Sheet',
      gender: 'Frozen Over',
      age: 'Frost-Shattered',
      role: 'Slow or Difficult Going',
      setting: 'Grim Dark Ruin',
      build: 'Coarse Grain, Bold Shapes',
      silhouette: 'Ragged Torn Boundary',
      face_head: 'Ancient Standing Stone',
      anatomy: 'Edge-Matched Wang Set',
      clothing: 'Snow Drift & Ice Crust',
      worn_details: 'Frost Patterning',
      primary_colours: 'Snow White & Slate Grey',
      accent_colours: 'Frost Highlight White',
      materials: 'Packed Snow & Blue Ice',
      exclusions: 'No sky, horizon or distant background',
      additional_anatomy: 'Frozen Puddle ×2, Snow Drift ×2',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'TILESET_MODULAR',
      projection: 'TRUE_ISOMETRIC',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
      directions: 'SINGLE_FRONT',
      resolutionProfile: 'CUSTOM',
      // The 2:1 diamond, stated as a size rather than described: an isometric tile whose width is not
      // exactly twice its height does not tessellate, and no amount of art fixes that.
      spriteTargetSize: '64 × 32 px per tile',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      surfaceDetail: 'DETAILED_PRODUCTION',
      paletteLimit: 'UNRESTRICTED',
      rigMode: 'NONE',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'retro-shoreline-blend',
    name: '16-Bit Shoreline Blend',
    category: 'TERRAIN',
    subject: {
      species: 'Shallow Water & Wetland',
      gender: 'Flooded & Waterlogged',
      age: 'Water-Carved & Channelled',
      role: 'Water Crossing',
      setting: 'Bright Cartoon Overworld',
      build: 'Chunky Low-Resolution Blocks',
      silhouette: 'Rounded Rolling Bank',
      face_head: 'Still Water Surface',
      anatomy: 'Corner-Matched Blob Set',
      clothing: 'Pebble & Stone Scatter',
      worn_details: 'Wind Ripples & Drift Lines',
      primary_colours: 'Deep Teal Water & Wet Sand',
      accent_colours: 'Shallow Water Teal #14B8A6',
      materials: 'Wet Stone & Standing Water',
      exclusions: 'No composed landscape scene or vista',
      additional_anatomy: 'Stepping Stone ×3, Ford Crossing ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'TILESET_MODULAR',
      directions: 'SINGLE_FRONT',
      renderStyle: 'RETRO_PIXEL_ART',
      resolutionProfile: 'RETRO_16_BIT',
      paletteLimit: 'STRICT_32_COLOR',
      surfaceDetail: 'MINIMAL',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      rigMode: 'NONE',
      spriteTargetSize: '16 × 16 px per tile',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'side-on-volcanic-cliff',
    name: 'Side-On Volcanic Cliff Features',
    category: 'TERRAIN',
    subject: {
      species: 'Volcanic Crust & Ash',
      gender: 'Scorched & Burned',
      age: 'Freshly Cut & Sharp-Edged',
      role: 'Hazard & Damage Surface',
      setting: 'Post-Apocalyptic Waste',
      build: 'Large Tile, One Feature Each',
      silhouette: 'Overhanging Undercut Cliff',
      face_head: 'Glowing Vent or Fissure',
      anatomy: 'Terraced Elevation Set',
      clothing: 'Ash Fall & Cinder',
      worn_details: 'Hairline Cracks & Fractures',
      primary_colours: 'Basalt Black & Ash Grey',
      accent_colours: 'Lava Crack Orange #EA580C',
      materials: 'Fractured Basalt & Cinder',
      exclusions: 'No characters, creatures or vehicles',
      additional_anatomy: 'Lava Flow Straight ×2, Lava Pool ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // The feature library rather than the blend set: a platformer's ground is a cliff seen from the
      // side, and a face is exactly what a flat blend has nowhere to put.
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      projection: 'ORTHOGRAPHIC_SIDE',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_SIDE,
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '48 × 48 px per tile',
      // Black, because the fissures are the light source: on magenta an emissive crack keys against a
      // field brighter than itself and the glow's outer falloff goes with the background.
      backgroundKey: 'PURE_BLACK',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      surfaceDetail: 'TEXTURED',
      paletteLimit: 'EXPANDED_ALBEDO',
      rigMode: 'NONE',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'FLUX_API',
    },
  },
];
