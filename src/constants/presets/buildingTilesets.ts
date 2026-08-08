import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Environment tile fields — the sixteen-tile sheet a level's ground and walls are built from.
 *
 * BUILDING is the only category the tileset plan is filed under, because it is the only one labelled
 * as an environment. All four of these therefore share a plan and differ only in *camera and scale*,
 * which is the whole decision a tileset actually asks of you: a 16 px top-down tile and a 64 × 32
 * isometric diamond are the same sixteen components drawn for incompatible grids.
 *
 * Every one states its tile size outright, because a tile that does not match the engine's grid is not
 * a stylistic miss, it is unusable — and no resolution profile can say it, since every profile is
 * written in terms of a figure's height. The two whose look is not itself a scale take `CUSTOM` as
 * well, so for those the stated number is the only thing describing how big the art is.
 */
export const BUILDING_TILESET_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'topdown-dungeon-tileset',
    name: 'Top-Down Dungeon Tileset',
    category: 'BUILDING',
    subject: {
      species: 'Ancient Temple Gate',
      gender: 'Abandoned Ruins',
      age: 'Ancient Egyptian Sandstone',
      role: 'Level geometry tiles',
      setting: 'Desert Wasteland',
      build: 'Sprawling Low Structure',
      silhouette: 'Flat wall cap profile',
      face_head: 'Runic Archway',
      anatomy: 'MODULAR BUILDING TILES',
      clothing: 'Ivy Trellis Grill',
      worn_details: 'Moss & Ivy Growth',
      primary_colours: 'Sandstone & Copper',
      accent_colours: 'Golden Runic Glow #F59E0B',
      materials: 'Cut Granite Blocks & Iron Girders',
      // Not the category's stock exclusion, which forbids ground tiles — on a tileset the ground tiles
      // are the deliverable, so what has to be excluded instead is everything standing on them.
      exclusions: 'No characters, no props, no baked lighting, no shadow',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: 'TILESET_MODULAR',
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
    id: 'iso-city-tileset',
    name: 'Isometric City Tileset',
    category: 'BUILDING',
    subject: {
      species: 'City block tile set',
      gender: 'Active & In-Use',
      age: 'Neo-Tokyo Cyberpunk',
      role: 'Level geometry tiles',
      setting: 'Rain-Slicked Neon Street',
      build: 'Sprawling Low Structure',
      silhouette: 'Solar Glass Panels',
      face_head: 'Recessed doorway tile',
      anatomy: 'MODULAR BUILDING TILES',
      clothing: 'Wooden Scaffolding',
      worn_details: 'Bullet Scratches',
      primary_colours: 'Concrete Slate & Blue Metal',
      accent_colours: 'Warm Lantern Orange #F97316',
      materials: 'Reinforced Concrete & Steel',
      exclusions: 'No characters, no vehicles, no baked shadow',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: 'TILESET_MODULAR',
      projection: 'TRUE_ISOMETRIC',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
      directions: 'SINGLE_FRONT',
      resolutionProfile: 'CUSTOM',
      // The 2:1 diamond, stated as a size rather than described: an isometric tile whose width is not
      // exactly twice its height does not tessellate, and no amount of art fixes that.
      spriteTargetSize: '64 × 32 px per tile',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      surfaceDetail: 'DETAILED_PRODUCTION',
      rigMode: 'NONE',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'retro-forest-tileset',
    name: '16-Bit Forest Tileset',
    category: 'BUILDING',
    subject: {
      species: 'Forest ground tile set',
      gender: 'Overgrown Nature takeover',
      age: 'Medieval Timber-Frame',
      role: 'Level geometry tiles',
      setting: 'Enchanted Forest Clearing',
      build: 'Sprawling Low Structure',
      silhouette: 'Low hedge cap profile',
      face_head: 'Curtained Archway',
      anatomy: 'MODULAR BUILDING TILES',
      clothing: 'Ivy Trellis Grill',
      worn_details: 'Moss & Ivy Growth',
      primary_colours: 'Weathered Grey Stone & Oak',
      accent_colours: 'Verdigris Green #10B981',
      materials: 'Cedar Wood, Clay Tiles & Paper',
      exclusions: 'No characters, no props, no baked lighting, no shadow',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
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
    id: 'volcanic-cavern-tileset',
    name: 'Volcanic Cavern Tileset',
    category: 'BUILDING',
    subject: {
      species: 'Volcanic cavern tile set',
      gender: 'Severely Damaged',
      age: 'Steampunk Ironworks',
      role: 'Level geometry tiles',
      setting: 'Volcanic Cavern Base',
      build: 'Sprawling Low Structure',
      silhouette: 'Jagged rock cap profile',
      face_head: 'Steel Blast Door',
      anatomy: 'MODULAR BUILDING TILES',
      clothing: 'Iron walkway grating',
      worn_details: 'Lava fissure glow & ash drift',
      primary_colours: 'Gothic Slate & Bronze',
      accent_colours: 'Lava Orange #EA580C',
      materials: 'Corrugated Iron & Glass',
      exclusions: 'No characters, no props, no baked shadow',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      directionalMode: 'TILESET_MODULAR',
      directions: 'SINGLE_FRONT',
      paletteLimit: 'EXPANDED_ALBEDO',
      surfaceDetail: 'TEXTURED',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      // Black, because the fissures are the light source: on magenta an emissive crack keys against a
      // field brighter than itself and the glow's outer falloff goes with the background.
      backgroundKey: 'PURE_BLACK',
      rigMode: 'NONE',
      spriteTargetSize: '48 × 48 px per tile',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'FLUX_API',
    },
  },
];
