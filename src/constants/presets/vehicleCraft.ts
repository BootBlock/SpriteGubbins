import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * The vehicles that are not tanks — what walks, what leaves atmosphere, what sails and what runs on
 * rails.
 *
 * `vehicleCore.ts` picks its four by *camera*, because projection is the decision a vehicle sheet
 * turns on and the one a dropdown cannot teach. The cost of choosing that way is that all four land
 * in near-future ground combat, and this category's pool is unusually wide — nine vehicle classes,
 * eight eras, seven liveries — so a reader opening the collection learned the machinery and almost
 * none of the vocabulary. These four are picked by *subject* instead, and between the two files the
 * category now demonstrates every livery, service condition, chassis mass, hull profile, cockpit,
 * cladding, marking set, colour pairing, material, exclusion and attached module the pool offers,
 * and all eight eras.
 *
 * **The walker is the rig plan's own footnote made literal.** `VEHICLE_CUTOUT_RIG` describes each
 * drive as a "root segment, travelling segment" and then says what that means where a drive has no
 * articulated pair — a wheel against its hub, a nozzle against its housing. A leg is the case that
 * wording was written *from*, and no preset had one.
 *
 * **The sky-galleon is where the pool runs out, which is worth showing rather than hiding.** These
 * fields are written for hard-surface machines: a wooden ship has no "Cockpit & Front Face" and
 * nothing "bolted over the bare frame", so five of its sixteen answers are free text — which is what
 * every subject field being a `ComboBox` rather than a `<select>` is for. Forcing a figurehead into
 * `Blank Autonomous Nose` would teach the opposite lesson.
 */
export const VEHICLE_CRAFT_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'cutout-rig-command-walker',
    name: 'Cut-Out Rig Command Walker',
    description:
      'A legged mech rigged from the side facing, where a hip, a knee and an ankle are all unambiguous. Tapered caps and a full overlap, because armour over a joint opens a gap at full stride.',
    category: 'VEHICLE',
    subject: {
      species: 'Walker / Mech',
      gender: 'Civilian Unmarked',
      age: 'Prototype Test Rig',
      role: 'Command & Control',
      setting: 'Cyberpunk Street Racer',
      build: 'Compact Single-Seat',
      silhouette: 'Angular Stealth Facets',
      face_head: 'Sensor Array & Antenna Mast',
      // The one drive the rig plan's closing paragraph describes without analogy: a leg genuinely is
      // a root segment and a travelling segment turning about a pivot, where a road wheel and a
      // thruster nozzle are that arrangement only by extension.
      anatomy: 'Articulated Walker Legs',
      clothing: 'Reactive Armour Blocks',
      worn_details: 'Exposed Cabling & Hoses',
      primary_colours: 'Deep Navy #1E3A8A & Steel',
      accent_colours: 'Faction Stripe Magenta #F43F5E',
      materials: 'Cast Alloy & Ceramic Tile',
      exclusions: 'No weapon fire or tracer effects',
      additional_anatomy: 'Roof Turret ×1, Ammo Box ×2',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      // Three runs of one subject, started from the middle of the set rather than its first
      // entry: legs are what a walker rig is judged on, and the side elevation is the only facing
      // where a hip, a knee and an ankle are all unambiguous. Getting them right there is what the
      // other two runs are then matched against.
      primaryDirection: 'right side',
      // A hydraulic leg segment narrows into its joint, so the cap tapers rather than bulging. The
      // armour block bolted over that joint is why the overlap is full: a half cap opens a gap at
      // full stride, which on a walker is every other frame.
      jointCapStyle: 'TAPERED',
      overlapMargin: 'FULL_CAP',
      // A vehicle's sockets are where a pod or a gun is parented, and they are the same idea as a
      // character's hand and back — one named point per thing the game may bolt on at runtime.
      sockets: 'mount_ring, hard_point_left, hard_point_right',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '64 × 80 px assembled',
      aspectRatio: 'SQUARE_1_1',
      // Thirteen unlabelled cells, four of which are leg segments that differ only in which end
      // carries the pivot — which is the sheet a companion manifest earns its keep on. Asking for
      // one is the user's switch rather than the preset's, so this names a target that *can* return
      // text and leaves the choice where it belongs.
      targetModel: 'GEMINI_FLASH_IMAGE',
    },
  },
  {
    id: 'topdown-shmup-interceptor',
    name: 'Top-Down Shmup Interceptor',
    description:
      'A vertical shoot-’em-up ship that never turns: flat vector shapes seen straight down on a tall canvas, with the whole yaw budget spent on states instead of facings.',
    category: 'VEHICLE',
    subject: {
      species: 'Starship / Shuttle',
      gender: 'Military Standard Issue',
      age: 'Factory Fresh',
      role: 'Interceptor / Air Superiority',
      setting: 'Retro Space Age',
      build: 'Light & Nimble',
      silhouette: 'Swept Delta Wing',
      face_head: 'Armoured Glass Canopy',
      anatomy: 'Thruster-Borne Airframe',
      clothing: 'Ablative Heat Shielding',
      worn_details: 'Kill Tally Marks',
      primary_colours: 'Crimson Lacquer #DC2626 & Chrome',
      accent_colours: 'Cockpit Glow Green #10B981',
      materials: 'Polished Chrome & Leather',
      // The thruster is a component drawn at rest and at mid-travel, so the flare is geometry the
      // sheet already owns. A painted-on plume would be the same event drawn twice, once in a place
      // it cannot be cut away from.
      exclusions: 'No exhaust plume or dust cloud',
      additional_anatomy: 'Deployable Landing Gear ×3',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // Retro Space Age is a poster style before it is a spaceship: flat areas, one hard contour and
      // no colour budget to speak of. Surface detail comes down for the same reason a low-poly sheet
      // brings it down — drawn seams compete with the shapes that are doing the work.
      renderStyle: 'VECTOR_FLAT',
      paletteLimit: 'UNRESTRICTED',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      surfaceDetail: 'MINIMAL',
      // A vertical shoot-'em-up's ship never turns: it points up-screen for the whole game, and the
      // yaw budget every other vehicle sheet spends on facings is spent here on states instead.
      projection: 'PURE_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.PURE_TOPDOWN,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      resolutionProfile: 'MID_RESOLUTION',
      // Laid out tall because a delta planform is, and eighteen of them side by side would waste
      // most of a wide canvas on background.
      aspectRatio: 'TALL_9_16',
      targetModel: 'MIDJOURNEY',
    },
  },
  {
    id: 'inked-sky-galleon',
    name: 'Ink-Washed Sky-Galleon',
    description:
      'A wooden sailing hull in ink and wash, textured and turned through the five-view core. Five of its sixteen subject fields are free text, because this pool is written for hard-surface machines.',
    category: 'VEHICLE',
    subject: {
      // A sailing hull is filed under the watercraft class because that is what it is; the era is
      // what puts it in the air. Splitting the two is why one class can serve a submarine and a
      // ship of the line without either reading as the other.
      species: 'Watercraft / Submersible',
      gender: 'Elite Command Variant',
      age: 'Freshly Refitted',
      role: 'Troop Transport',
      setting: 'Fantasy Skyship',
      // Chassis Mass states bulk and footprint rather than armament, and a flagship that carries a
      // company of troops is the largest thing this pool describes.
      build: 'Colossal Siege Platform',
      silhouette: 'Rounded Aerodynamic Shell',
      face_head: 'Carved figurehead & open helm',
      // Lift fans rather than a rigid hull, so the plan's "drive unit" has something concrete to be
      // at rest and at mid-travel — the sails above are cladding, and a sheet whose only drive was
      // canvas would leave four components with nothing to draw.
      anatomy: 'Rotor-Borne Airframe',
      clothing: 'Canvas sails & rope rigging',
      worn_details: 'Gilded scrollwork & pennant streamers',
      primary_colours: 'Varnished Oak & Verdigris Copper #2A9D8F',
      accent_colours: 'Running-Light White',
      materials: 'Riveted Brass & Hardwood',
      exclusions: 'No driver, pilot or crew',
      // One ramp and one anchor, not a pair of ramps: the extras are drawn at every facing the
      // five-view core covers, so each named piece costs five drawings, and a third would put the
      // sheet at 45 against the 43-component ceiling.
      additional_anatomy: 'Boarding Ramp ×1, Anchor ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // Ink and wash: a hard contour carrying the rigging and the carved work, with the tone laid in
      // behind it. Texture is the whole point of the style, so surface detail goes up rather than
      // down, and the colour budget comes off because a wash has no countable colours.
      renderStyle: 'HAND_DRAWN_INK',
      paletteLimit: 'UNRESTRICTED',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      surfaceDetail: 'TEXTURED',
      // Forty components arriving as eight pieces across five facings, which is very nearly a
      // square grid already — a wide canvas would stretch the rows across a strip.
      aspectRatio: 'SQUARE_1_1',
      rigMode: 'NONE',
      targetModel: 'GEMINI_PRO_IMAGE',
    },
  },
  {
    id: 'side-on-rail-gun-car',
    name: 'Side-On Rail Gun Car',
    description:
      'The 16-bit contract on a rail vehicle: a coarse grid, 32 colours and no interior detail, in the flat side elevation a car on a fixed line is only ever seen from.',
    category: 'VEHICLE',
    subject: {
      species: 'Rail Car / Mine Cart',
      gender: 'Military Standard Issue',
      age: 'Derelict Hulk',
      role: 'Artillery Support',
      setting: 'Steampunk Clockwork',
      build: 'Heavy Armoured Bulk',
      silhouette: 'Boxy Utilitarian Slab',
      face_head: 'Vision Slit & Periscope',
      anatomy: 'Wheeled Chassis & Axles',
      clothing: 'Bolted Applique Plating',
      worn_details: 'Scorch Marks & Weld Seams',
      primary_colours: 'Soot Black & Oxidised Brass #B45309',
      accent_colours: 'Headlamp Amber #F59E0B',
      materials: 'Riveted Wrought Iron & Cast Steel',
      // The rails are level geometry, not part of the sprite. A car that arrives sitting on its own
      // length of track cannot be placed on any other, and the join is exactly where the cut would
      // have to be made.
      exclusions: 'No ground, road or landing pad',
      additional_anatomy: 'Towed Trailer Section ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // The 16-bit contract, stated in full: a coarser pixel grid, a hard 32-colour ceiling and no
      // interior detail beyond what survives it. Each of the three is what makes the other two
      // achievable — a 64-colour sheet at high resolution simply is not the same picture.
      renderStyle: 'RETRO_PIXEL_ART',
      paletteLimit: 'STRICT_32_COLOR',
      resolutionProfile: 'RETRO_16_BIT',
      surfaceDetail: 'MINIMAL',
      // A rail vehicle is the one subject with no yaw to argue about: it runs along a fixed line, so
      // the flat side elevation is not a stylistic choice but the only view the game ever shows.
      projection: 'ORTHOGRAPHIC_SIDE',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_SIDE,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      aspectRatio: 'ULTRAWIDE_21_9',
      targetModel: 'QWEN_IMAGE',
    },
  },
];
