import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Vehicles and craft — tanks, gunships, skiffs, walkers. Hard-surface geometry that *drives*.
 *
 * The category OBJECT could not cover. An interactive prop decomposes into a housing, what it stands
 * on and what opens; a vehicle decomposes into a hull, the drive that carries it, and the weapon or
 * working mount that turns on top of it — and the piece OBJECT calls a "base, mount or footing" is
 * the one part of a vehicle that is never still. It is also the only hard-surface subject for which a
 * full turn is the usual deliverable rather than an option: an eight-way vehicle sheet is what a
 * top-down game is built from, where an eight-way vending machine is not a thing anyone asks for.
 */
export const VEHICLE: CategoryDefinition = {
  label: 'Vehicle / Craft',
  article: 'a',
  fields: [
    {
      key: 'species',
      label: 'Vehicle Class',
      tooltip:
        'What carries the vehicle — wheels, tracks, legs, rotors, thrusters or a hull in water. It decides the component split before any styling does, because the drive is the half of a vehicle that has to animate and every class animates differently.',
      options: [
        'Wheeled Ground Vehicle',
        'Tracked Armour / Tank',
        'Walker / Mech',
        'Rotorcraft / Gunship',
        'Fixed-Wing Aircraft',
        'Starship / Shuttle',
        'Watercraft / Submersible',
        'Hover / Repulsor Craft',
        'Rail Car / Mine Cart',
      ],
    },
    {
      key: 'gender',
      label: 'Faction Livery',
      tooltip:
        'Whose vehicle it is, said in paint rather than in a label. Livery is what lets a player tell friendly from hostile at a glance across a moving battlefield, and it is the cheapest way to get three sprites out of one chassis.',
      options: [
        'Player Faction Colours',
        'Enemy Raider Markings',
        'Civilian Unmarked',
        'Military Standard Issue',
        'Elite Command Variant',
        'Salvaged Mixed Parts',
        'Corporate Fleet Branding',
      ],
    },
    {
      key: 'age',
      label: 'Service Condition',
      tooltip:
        'How hard a life the vehicle has had. Wear sits almost entirely on the lower hull and the drive — the surfaces that meet the ground — so stating it separately from the livery is what keeps a battered vehicle from reading as a badly-painted new one.',
      options: [
        'Factory Fresh',
        'Field-Worn Service',
        'Battle-Damaged',
        'Derelict Hulk',
        'Rusted Scrapyard Find',
        'Freshly Refitted',
        'Prototype Test Rig',
      ],
    },
    {
      key: 'role',
      label: 'Operational Role',
      tooltip:
        'What the vehicle is for on the field. It governs proportion more than decoration does — a scout and a siege platform obey opposite rules about hull length, weapon mass and how much of the frame is glass.',
      options: [
        'Fast Scout / Recon',
        'Troop Transport',
        'Main Assault Gun',
        'Artillery Support',
        'Supply Hauler',
        'Interceptor / Air Superiority',
        'Salvage & Repair Rig',
        'Command & Control',
      ],
    },
    {
      key: 'setting',
      label: 'World & Era',
      tooltip:
        'The design language the whole fleet is drawn in. It aligns rivet spacing, panel shapes and glass tint across every vehicle at once — diesel-punk plate and deep-space composite rarely share a garage without looking like two games.',
      options: [
        'Near-Future Military',
        'Deep-Space Sci-Fi',
        'Post-Apocalyptic Wasteland',
        'Diesel-Punk 1940s',
        'Steampunk Clockwork',
        'Cyberpunk Street Racer',
        'Fantasy Skyship',
        'Retro Space Age',
      ],
    },
    {
      key: 'build',
      label: 'Chassis Mass',
      tooltip:
        'The vehicle’s bulk and its footprint on the ground. Stating it explicitly is what stops a scout buggy and a siege tank arriving at the same size — the failure that makes a generated fleet look like one vehicle in six paint schemes.',
      options: [
        'Light & Nimble',
        'Medium Balanced Frame',
        'Heavy Armoured Bulk',
        // Not "Long-Wheelbase": this pool is shared by rotorcraft, starships and watercraft, and a
        // wheelbase named in section 1 — which forbids inferring anything it does not state — is an
        // invitation to draw wheels on a repulsor craft. Every other option here describes mass and
        // footprint without naming a drive.
        'Long-Hulled Hauler',
        'Compact Single-Seat',
        'Colossal Siege Platform',
      ],
    },
    {
      key: 'silhouette',
      label: 'Hull Profile',
      tooltip:
        'The outline the vehicle is recognised by from above or side-on. At sprite scale the profile is the whole read — a sloped glacis and a boxy slab are still distinguishable at 32 px where panel lines and rivets are long gone.',
      options: [
        'Low Wedge & Sloped Glacis',
        'Boxy Utilitarian Slab',
        'Rounded Aerodynamic Shell',
        'Angular Stealth Facets',
        'Skeletal Exposed Frame',
        'Bulbous Pressurised Hull',
        'Swept Delta Wing',
      ],
    },
    {
      key: 'face_head',
      label: 'Cockpit & Front Face',
      tooltip:
        'The crew position and the face the vehicle leads with — where the eye lands first, and the landmark that tells a viewer which way it is pointing. It is also the one area worth an emissive colour, since a lit canopy reads as crewed.',
      options: [
        'Armoured Glass Canopy',
        'Vision Slit & Periscope',
        'Open Roll-Cage Seat',
        'Sensor Array & Antenna Mast',
        'Blank Autonomous Nose',
        'Wraparound Bubble Cockpit',
      ],
    },
    {
      key: 'anatomy',
      label: 'Drive & Assembly Base',
      tooltip:
        'How the vehicle breaks into isolated components. Choose by what has to turn, spin or travel — a turret ring, a road wheel, a leg joint — rather than by how detailed the hull is; a rigid hull with no moving drive needs no split at all.',
      options: [
        'Single Rigid Hull',
        'Hull With Rotating Turret',
        'Wheeled Chassis & Axles',
        'Tracked Chassis & Road Wheels',
        'Articulated Walker Legs',
        'Rotor-Borne Airframe',
        'Thruster-Borne Airframe',
      ],
    },
    {
      key: 'clothing',
      label: 'Armour & Cladding',
      tooltip:
        'What is bolted over the bare frame — plating, fairings, improvised scrap. Cladding is drawn as separate geometry from the hull beneath it, so it is also the cheapest way to give one chassis an up-armoured variant.',
      options: [
        'Bolted Applique Plating',
        'Reactive Armour Blocks',
        'Sandbags & Improvised Scrap',
        'Bare Unclad Frame',
        'Aerodynamic Fairing Panels',
        'Ablative Heat Shielding',
      ],
    },
    {
      key: 'worn_details',
      label: 'Markings & Service Wear',
      tooltip:
        'Unit numbers, stencils, grime and weld seams across the hull. These are what make a vehicle look operated rather than modelled — but each costs palette budget, so a few bold marks carry further than full coverage at any sprite size.',
      options: [
        'Unit Numbers & Roundels',
        'Hazard Stripes & Stencils',
        'Mud Splatter & Road Grime',
        'Kill Tally Marks',
        'Exposed Cabling & Hoses',
        'Nose Art & Panel Graffiti',
        'Scorch Marks & Weld Seams',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant hull colours — what the vehicle is identified by across a busy field. Two colours with a clear value gap keep it separable from the terrain it drives over, which a single flat body colour never manages.',
      options: [
        'Olive Drab & Gunmetal',
        'Desert Sand & Rust',
        'Matte White & Slate #334155',
        'Deep Navy #1E3A8A & Steel',
        'Crimson Lacquer #DC2626 & Chrome',
        'Charcoal & Safety Orange #F97316',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'Lamps, thruster glow, beacons and stripe work — the parts that read as emitting rather than reflecting. A hex code pins the hue far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
      options: [
        'Headlamp Amber #F59E0B',
        'Thruster Plasma Blue #22D3EE',
        'Warning Beacon Red #EF4444',
        'Cockpit Glow Green #10B981',
        'Faction Stripe Magenta #F43F5E',
        'Running-Light White',
      ],
    },
    {
      key: 'materials',
      label: 'Hull Materials',
      tooltip:
        'What the vehicle is built from, and how light reads off it: rolled plate takes a broad soft sheen, chrome a hard one, canvas none at all. Under flat neutral lighting it is what still separates the hull from the tyres and the glass.',
      options: [
        'Rolled Steel Plate & Rubber',
        'Riveted Brass & Hardwood',
        'Carbon Fibre & Smoked Glass',
        'Cast Alloy & Ceramic Tile',
        'Corrugated Scrap Iron & Canvas',
        'Polished Chrome & Leather',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping the crew, the road and the effects work off the sheet. Dust plumes and speed lines are the usual offenders — both extend well past the vehicle’s own bounds, which breaks the cell alignment an atlas depends on.',
      options: [
        'No driver, pilot or crew',
        'No ground, road or landing pad',
        'No motion blur or speed lines',
        'No exhaust plume or dust cloud',
        'No weapon fire or tracer effects',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Attached Modules',
      tooltip:
        'Extra bolted-on parts — pods, gear, drums, trailers — each isolated into its own sprite slot so it can be swapped or animated against a static hull. Comma-separated, with ×N for how many of each: “Missile Pod ×2, Ammo Box ×1” names three pieces, each drawn at every facing the sheet covers — fifteen components on a five-view directional core, three on a single-facing sheet.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Roof Turret ×1, Ammo Box ×2',
        'Deployable Landing Gear ×3',
        'Missile Pod ×2',
        'Towed Trailer Section ×1',
        'Spare Wheel ×1, Fuel Drum ×2',
      ],
    },
  ],
};
