import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Set dressing — the props a level is furnished with rather than the machines a player operates.
 *
 * The point of the four together is the *camera*: a chest drawn dimetric, a shrine drawn
 * three-quarter, a conveyor drawn oblique. Projection is the single hardest setting to picture from a
 * dropdown, and a prop is the easiest subject to see it on, because a box has no anatomy to argue
 * with the angle.
 */
export const OBJECT_WORLD_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'dimetric-loot-chest',
    name: 'Dimetric Loot Chest',
    description:
      'A container under a 2:1 dimetric camera at 32 × 32 px cells, as four sheets one per cardinal facing: a chest against a wall has to open towards the room whichever way the room runs.',
    category: 'OBJECT',
    subject: {
      species: 'Loot Chest / Container',
      gender: 'Fully Functional',
      age: 'Medieval Wood & Iron',
      role: 'High-Tier Loot Source',
      setting: 'Dungeon Chamber',
      build: 'Compact Tabletop Device',
      silhouette: 'Domed lid over a banded body',
      face_head: 'Iron lock plate & keyhole',
      anatomy: 'Hinged Chest Container',
      clothing: 'Freestanding Base',
      worn_details: 'Runic Engravings',
      primary_colours: 'Weathered Bronze & Teak',
      accent_colours: 'Arcane Purple Gem #8B5CF6',
      materials: 'Polished Brass & Oak',
      exclusions: 'No pedestal or ground grid',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      projection: 'DIMETRIC_2_1',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.DIMETRIC_2_1,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      // One sheet per cardinal facing, because a chest placed against a wall has to open towards the
      // room whichever way the room runs.
      directions: 'FOUR_CARDINAL',
      primaryDirection: 'east',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      rigMode: 'NONE',
      spriteTargetSize: '32 × 32 px per cell',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'lowpoly-camp-station',
    name: 'Low-Poly Camp Station',
    description:
      'Faceted low-poly geometry with the palette off and the detail down, on transparency. A prop is read by its facets here, and drawn seams would only compete with them.',
    category: 'OBJECT',
    subject: {
      species: 'Healing Station',
      gender: 'Fully Functional',
      age: 'Post-Apocalyptic Scraps',
      role: 'Save Station / Healer',
      setting: 'Abandoned Lab',
      build: 'Compact Tabletop Device',
      silhouette: 'Cylindrical Core',
      face_head: 'Analog Dials & Gauge Panels',
      anatomy: 'Modular Conduit',
      clothing: 'Hydraulic Lift Feet',
      worn_details: 'Moss & Vines',
      primary_colours: 'Rusted Iron & Olive',
      accent_colours: 'Laser Green Glow #10B981',
      materials: 'Cast Iron',
      exclusions: 'No ambient smoke',
      additional_anatomy: 'Articulated Arm Clamp ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // Faceted geometry with flat per-face shading, so the palette cap comes off and the surface
      // detail goes down: a low-poly prop is read by its facets, and drawn seams would compete.
      renderStyle: 'LOW_POLY_3D',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'MINIMAL',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      resolutionProfile: 'MID_RESOLUTION',
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      backgroundKey: 'TRANSPARENT',
      rigMode: 'NONE',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'FLUX_API',
    },
  },
  {
    id: 'hazard-conveyor',
    name: 'Industrial Hazard Conveyor',
    description:
      'A machine under the 45° cabinet projection, which keeps its control face undistorted while still showing depth. Four cardinal facings, on an ultrawide canvas.',
    category: 'OBJECT',
    subject: {
      species: 'Power Generator',
      gender: 'Damaged / Repaired',
      age: 'Steampunk Brass',
      role: 'Security Gateway',
      setting: 'Industrial Factory',
      build: 'Modular Wall Panel',
      silhouette: 'Hexagonal Tower',
      face_head: 'Lever & Valve Array',
      anatomy: 'Modular Conduit',
      clothing: 'Wall-Anchored Brackets',
      worn_details: 'Coolant Pipe Joints',
      primary_colours: 'Deep Cobalt Blue #1E3A8A',
      accent_colours: 'Alert Orange LEDs #F97316',
      materials: 'Reflective Mirror Alloy',
      exclusions: 'No text or letters',
      additional_anatomy: 'Coolant Vent Flap ×2, Articulated Arm Clamp ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // Oblique: the front face stays undistorted and depth is pushed back at 45°. It is the cabinet
      // projection, and it suits a machine whose face is a control panel that has to stay readable.
      projection: 'OBLIQUE_45',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.OBLIQUE_45,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      // Cardinal facings, because the cabinet projection keeps a face flat to the camera — a
      // three-quarter yaw is the read it exists to avoid. It is also what keeps the sheet inside
      // the component ceiling: the vent flaps and the arm clamp are drawn at every facing the core
      // covers, and five facings of this six-piece core plus three extras would ask one generation
      // for 45.
      directions: 'FOUR_CARDINAL',
      paletteLimit: 'EXPANDED_ALBEDO',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      surfaceDetail: 'TEXTURED',
      rigMode: 'NONE',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'cel-shaded-shrine',
    name: 'Cel-Shaded Forest Shrine',
    description:
      'A stone shrine in flat cel shading under a hard black contour, turned through the directional core. The set-dressing counterpart to the cel-shaded humanoid.',
    category: 'OBJECT',
    subject: {
      species: 'Ancient Relic Shrine',
      gender: 'Ancient Sealed',
      age: 'Ancient Magitech',
      role: 'Objective Device',
      setting: 'Dungeon Chamber',
      build: 'Spherical Pod',
      silhouette: 'Pyramidal Conduit',
      face_head: 'Runic Crystal Core',
      anatomy: 'Single Rigid Object',
      clothing: 'Freestanding Base',
      worn_details: 'Moss & Vines',
      primary_colours: 'Gilded Gold #F59E0B & Marble',
      accent_colours: 'Arcane Purple Gem #8B5CF6',
      materials: 'Carved Granite & Crystal',
      exclusions: 'No pedestal or ground grid',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'CEL_SHADED',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      rigMode: 'NONE',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GEMINI_PRO_IMAGE',
    },
  },
];
