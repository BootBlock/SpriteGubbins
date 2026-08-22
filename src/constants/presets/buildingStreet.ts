import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Whole structures — the buildings a level is made of one at a time rather than tiled.
 *
 * A building is one of the three categories whose default sheet is a tile field, so these four
 * deliberately take the other two plans: the module library, which delivers a façade as repeatable
 * bays, and the directional core, which delivers one structure turned. The tile-field presets live
 * next door in `buildingTilesets.ts`.
 *
 * The core's facing count is a property of the configuration rather than of the mode, so the
 * watchtower states its own — see the comment there for why three and not the default five.
 */
export const BUILDING_STREET_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'building-ramen',
    name: 'Neo-Tokyo Ramen Kiosk',
    description:
      'A single structure as a module library — the bays, awning and fittings a façade is assembled from, rather than one fixed elevation.',
    category: 'BUILDING',
    subject: {
      species: 'Ramen Stand Kiosk',
      gender: 'Active & In-Use',
      age: 'Neo-Tokyo Cyberpunk',
      role: 'Vendor / Shop Kiosk',
      setting: 'Rain-Slicked Neon Street',
      build: '1-Story Wide Kiosk',
      silhouette: 'Overhanging Neon Signage & Pipes',
      face_head: 'Open Counter & Bar Stools',
      anatomy: 'Single Structure Model',
      clothing: 'Striped Fabric Awning',
      worn_details: 'Hanging Paper Lanterns & Cables',
      primary_colours: 'Dark Stained Wood & Vermilion Red #EA580C',
      accent_colours: 'Neon Pink Sign Glow #F43F5E',
      materials: 'Cedar Wood, Clay Tiles & Paper',
      exclusions: 'No ground terrain tiles, no characters',
      additional_anatomy: 'External Chimney ×1, Smoke Pipe ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      surfaceDetail: 'DETAILED_PRODUCTION',
      resolutionProfile: 'HIGH_RESOLUTION',
      paletteLimit: 'EXPANDED_ALBEDO',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      // The one shipped preset that inherited `DEFAULT_IMAGE_CONFIG`'s `POSE_LIBRARY` on a category
      // with no joints, which is the reported defect in the built-in library: a kiosk's bays and
      // awning were being handed section 5's shared pivots. Its three neighbours already said
      // `NONE`, which is how the omission stayed invisible.
      rigMode: 'NONE',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'oblique-shopfront-row',
    name: 'Oblique Shopfront Row',
    description:
      'A row of separate shopfront bays under the 45° oblique camera, at 96 × 128 px per bay on an ultrawide canvas. The projection is what lets the bays sit side by side without disagreeing.',
    category: 'BUILDING',
    subject: {
      species: 'Cybernetics Clinic',
      gender: 'Active & In-Use',
      age: 'Neo-Tokyo Cyberpunk',
      role: 'Vendor / Shop Kiosk',
      setting: 'Rain-Slicked Neon Street',
      build: '2-Story Compact Footprint',
      silhouette: 'Overhanging Neon Signage & Pipes',
      face_head: 'Sliding Automated Glass',
      anatomy: 'Modular Building Tiles',
      clothing: 'Neon Holographic Banner',
      worn_details: 'Holographic Vending Sign',
      primary_colours: 'Concrete Slate & Blue Metal',
      accent_colours: 'Neon Pink Sign Glow #F43F5E',
      materials: 'Corrugated Iron & Glass',
      exclusions: 'No ground terrain tiles, no characters',
      additional_anatomy: 'Rooftop Antenna Rig ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // Oblique keeps the shopfronts undistorted while still showing depth, which is what lets a row
      // of separate bays be laid side by side without the perspective disagreeing between them.
      projection: 'OBLIQUE_45',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.OBLIQUE_45,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      resolutionProfile: 'MID_RESOLUTION',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      rigMode: 'NONE',
      spriteTargetSize: '96 × 128 px per bay',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'gothic-watchtower',
    name: 'Gothic Watchtower',
    description:
      'One structure turned three ways through the directional core, under a true-isometric camera and laid out tall — a sheet’s shape should match its subject’s, and three storeys waste most of a landscape canvas.',
    category: 'BUILDING',
    subject: {
      species: 'Modular Watchtower',
      gender: 'Fortified Stronghold',
      age: 'Gothic Stone Fortress',
      role: 'Defense Tower Structure',
      setting: 'Snowy Mountain Pass',
      build: 'Tall 3-Tier Tower',
      silhouette: 'Battlements & Machicolations',
      face_head: 'Heavy Reinforced Oak Door',
      anatomy: 'Tower With Detachable Roof',
      clothing: 'Gargoyle Corner Statues',
      worn_details: 'Wall Mounted Torches & Shield',
      primary_colours: 'Weathered Grey Stone & Oak',
      accent_colours: 'Torchfire Yellow #EAB308',
      materials: 'Cut Granite Blocks & Iron Girders',
      exclusions: 'No surrounding trees or sky',
      additional_anatomy: 'Defensive Turret Mount ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      projection: 'TRUE_ISOMETRIC',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      // Pinned rather than inherited: `DEFAULT_IMAGE_CONFIG` opens on `FIVE_CLASSIC`, whose extra two
      // views are the flat front and back a true-isometric camera never gives you. The three-quarter
      // pair and the side are the yaws this projection actually draws, and three of them is what the
      // portrait canvas below is sized for.
      directions: 'THREE_CLASSIC',
      paletteLimit: 'EXPANDED_ALBEDO',
      surfaceDetail: 'TEXTURED',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      rigMode: 'NONE',
      // Tall, because the sheet's shape should match the subject's: three storeys turned three ways
      // packs into a portrait canvas and wastes most of a landscape one.
      aspectRatio: 'TALL_9_16',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'desert-outpost-pod',
    name: 'Desert Outpost Pod',
    description:
      'A rendered 3D structure at one facing on transparency, with no colour budget and no outline. The building preset to reach for when the sheet is a render rather than art.',
    category: 'BUILDING',
    subject: {
      species: 'Sci-Fi Landing Pad',
      gender: 'Under Construction',
      age: 'Sci-Fi Outpost Modular',
      role: 'Spawn Point',
      setting: 'Desert Wasteland',
      build: 'Miniature Outpost Pod',
      silhouette: 'Solar Glass Panels',
      face_head: 'Steel Blast Door',
      anatomy: 'Single Structure Model',
      clothing: 'Solar Panel Array',
      worn_details: 'Exposed Air Conditioning Units',
      primary_colours: 'White Polymer & Glass',
      accent_colours: 'Plasma Cyan Stream #06B6D4',
      materials: 'Reinforced Concrete & Steel',
      exclusions: 'No floor shadow, no grid overlay',
      additional_anatomy: 'Rooftop Heli-Pad ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'RENDERED_3D',
      paletteLimit: 'UNRESTRICTED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      backgroundKey: 'TRANSPARENT',
      rigMode: 'NONE',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GEMINI_FLASH_IMAGE',
    },
  },
];
