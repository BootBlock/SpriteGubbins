import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Vehicles — the four sheets a vehicle is actually asked for, one per camera a game puts it under.
 *
 * The set is chosen by *projection* rather than by subject, because that is the decision a vehicle
 * sheet turns on and the one a dropdown cannot teach: the same tank is a rig run eight times from
 * directly overhead, a turnaround under a three-quarter camera, or a single side elevation, and
 * each of those wants a different sheet mode with it. Picking four tanks in four paint schemes would
 * have demonstrated the option pool and none of the machinery.
 *
 * **The eight-way sheet is a run list, not one image.** `CUTOUT_RIG_SINGLE_DIRECTION` covers the
 * primary facing alone, so `EIGHT_COMPASS` beside it means eight sheets sharing one identity lock —
 * which is what the top-down preset below is asking for, and why its component count is ten rather
 * than eighty. Asking one generation for eighty isolated pieces is the failure mode that got v1's
 * 111-component mode deleted.
 */
export const VEHICLE_CORE_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'topdown-battle-tank',
    name: 'Top-Down Battle Tank',
    category: 'VEHICLE',
    subject: {
      species: 'Tracked Armour / Tank',
      gender: 'Player Faction Colours',
      age: 'Field-Worn Service',
      role: 'Main Assault Gun',
      setting: 'Near-Future Military',
      build: 'Heavy Armoured Bulk',
      silhouette: 'Low Wedge & Sloped Glacis',
      face_head: 'Vision Slit & Periscope',
      anatomy: 'Hull With Rotating Turret',
      clothing: 'Bolted Applique Plating',
      worn_details: 'Unit Numbers & Roundels',
      primary_colours: 'Olive Drab & Gunmetal',
      accent_colours: 'Warning Beacon Red #EF4444',
      materials: 'Rolled Steel Plate & Rubber',
      exclusions: 'No ground, road or landing pad',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PIXEL_ART',
      // Directly overhead, where a tank's turret is a disc on a rectangle and the traverse is the
      // only thing the player reads. Any elevation at all reintroduces a hull side that has to stay
      // consistent across all eight runs for no gain.
      projection: 'PURE_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.PURE_TOPDOWN,
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
      primaryDirection: 'south',
      rigMode: 'CUTOUT_RIG',
      // A turret ring genuinely is a rounded cap, and the traverse genuinely is a rotation about its
      // centre — the one place in this app where the joint vocabulary describes the subject
      // literally rather than by analogy.
      jointCapStyle: 'ROUNDED',
      overlapMargin: 'HALF_CAP',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'three-quarter-scout-buggy',
    name: 'Three-Quarter Scout Buggy',
    category: 'VEHICLE',
    subject: {
      species: 'Wheeled Ground Vehicle',
      gender: 'Salvaged Mixed Parts',
      age: 'Rusted Scrapyard Find',
      role: 'Fast Scout / Recon',
      setting: 'Post-Apocalyptic Wasteland',
      build: 'Light & Nimble',
      silhouette: 'Skeletal Exposed Frame',
      face_head: 'Open Roll-Cage Seat',
      anatomy: 'Wheeled Chassis & Axles',
      clothing: 'Sandbags & Improvised Scrap',
      worn_details: 'Mud Splatter & Road Grime',
      primary_colours: 'Desert Sand & Rust',
      accent_colours: 'Headlamp Amber #F59E0B',
      materials: 'Corrugated Scrap Iron & Canvas',
      // The dust plume is what a generator adds unasked to anything captioned "fast", and it is drawn
      // outside the vehicle's own silhouette — so the component it belongs to cannot be cut out
      // without it.
      exclusions: 'No exhaust plume or dust cloud',
      additional_anatomy: 'Spare Wheel ×1, Fuel Drum ×2',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PIXEL_ART',
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      rigMode: 'POSE_LIBRARY',
      surfaceDetail: 'DETAILED_PRODUCTION',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'side-on-attack-gunship',
    name: 'Side-On Attack Gunship',
    category: 'VEHICLE',
    subject: {
      species: 'Rotorcraft / Gunship',
      gender: 'Enemy Raider Markings',
      age: 'Battle-Damaged',
      role: 'Main Assault Gun',
      setting: 'Diesel-Punk 1940s',
      build: 'Medium Balanced Frame',
      silhouette: 'Bulbous Pressurised Hull',
      face_head: 'Wraparound Bubble Cockpit',
      anatomy: 'Rotor-Borne Airframe',
      clothing: 'Bare Unclad Frame',
      worn_details: 'Nose Art & Panel Graffiti',
      primary_colours: 'Charcoal & Safety Orange #F97316',
      accent_colours: 'Running-Light White',
      materials: 'Riveted Brass & Hardwood',
      exclusions: 'No motion blur or speed lines',
      additional_anatomy: 'Missile Pod ×2',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PAINTED_2D',
      // A side-scroller's aircraft lives in flat side elevation, and that is also the one view in
      // which a rotor mast, a weapon pylon and an undercarriage can each be swapped without
      // redrawing the fuselage they hang off.
      projection: 'ORTHOGRAPHIC_SIDE',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_SIDE,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'TEXTURED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'isometric-hover-hauler',
    name: 'Isometric Hover Hauler',
    category: 'VEHICLE',
    subject: {
      species: 'Hover / Repulsor Craft',
      gender: 'Corporate Fleet Branding',
      age: 'Factory Fresh',
      role: 'Supply Hauler',
      setting: 'Deep-Space Sci-Fi',
      build: 'Long-Hulled Hauler',
      silhouette: 'Boxy Utilitarian Slab',
      face_head: 'Blank Autonomous Nose',
      anatomy: 'Single Rigid Hull',
      clothing: 'Aerodynamic Fairing Panels',
      worn_details: 'Hazard Stripes & Stencils',
      primary_colours: 'Matte White & Slate #334155',
      accent_colours: 'Thruster Plasma Blue #22D3EE',
      materials: 'Carbon Fibre & Smoked Glass',
      exclusions: 'No driver, pilot or crew',
      additional_anatomy: 'Towed Trailer Section ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'LOW_POLY_3D',
      projection: 'TRUE_ISOMETRIC',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
      // Four sheets, one per cardinal facing: an isometric field turns in quarters, and this mode
      // covers the primary facing alone. The part library it resolves to still asks for a working
      // mount in three states — the plans describe what a vehicle *can* have, and a hauler answers
      // that entry with its crane or loading arm rather than with a gun.
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'FOUR_CARDINAL',
      primaryDirection: 'south',
      rigMode: 'NONE',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'CLEAN_PRODUCTION',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'SEEDREAM',
    },
  },
];
