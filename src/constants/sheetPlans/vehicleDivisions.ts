import type { ModePlans } from './modePlans.ts';
import { VEHICLE_SIDE_PAIRED } from './vehicle.ts';
import { vehiclePlansFor } from './vehicleDivision.ts';
import type { VehicleDivision } from './vehicleDivision.ts';

/**
 * The five *Drive & Assembly Base* values that divide a vehicle some way other than left from right,
 * and the sheets each of them draws (issue #288).
 *
 * **Each one is a base whose own name contradicted the standard sheets.** A rotor is one lifting disc
 * over a tail rotor, and it turns rather than travels. A thruster fires rather than travels. A
 * motorcycle's wheels are both on the centreline, so it has no near side, no far side and no crew
 * hatch. A boat divides into a screw and a rudder. A towed implement is a piece no VEHICLE sheet drew
 * at all, on the one base that names it. Section 1 carries the base verbatim, so each of those was a
 * sheet stating one division above an inventory drawing another.
 *
 * **Written as divisions rather than as sheets**, so what a reader compares between two bases is the
 * six or seven facts that differ. `vehicleDivision.ts` builds the three sheets from them, and holds
 * the prose of all three to the entries beneath it.
 */

/** A rotorcraft, a lift-fan skyship, a gunship: one lifting disc, one tail rotor, and both turn. */
const ROTOR_BORNE: VehicleDivision = {
  hull: { label: 'fuselage', name: 'Fuselage', noun: 'fuselage', plural: 'Fuselages' },
  drive: {
    noun: 'rotors',
    perFacing: 'Rotor assembly',
    positions: [
      { text: 'at rest', slug: 'rest' },
      { text: 'turning', slug: 'turning' },
    ],
    units: [
      {
        label: 'main-rotor',
        name: 'Main rotor or lift fan',
        segments: [
          { text: 'mast', slug: 'mast' },
          { text: 'turning rotor head', slug: 'rotor-head' },
        ],
      },
      {
        label: 'tail-rotor',
        name: 'Tail or secondary rotor',
        segments: [
          { text: 'tail gearbox', slug: 'gearbox' },
          { text: 'turning tail rotor', slug: 'blades' },
        ],
      },
    ],
  },
  mount: {
    label: 'weapon-mount',
    name: 'Chin, door or pylon mount',
    noun: 'mount',
    plural: 'Chin, door or pylon mounts',
    positions: [
      { text: 'stowed', slug: 'stowed' },
      { text: 'traversed', slug: 'traversed' },
      { text: 'elevated', slug: 'elevated' },
    ],
    segments: [
      { text: 'base ring ×1', slug: 'base-ring' },
      { text: 'traversing body ×1', slug: 'traversing-body' },
    ],
  },
  access: {
    label: 'crew-door-or-canopy',
    stem: 'crew-door',
    name: 'Crew door or canopy',
    noun: 'door',
    positions: [
      { text: 'closed', slug: 'closed' },
      { text: 'open', slug: 'open' },
    ],
  },
};

/**
 * A shuttle, an interceptor, a repulsor lifter under thrust: a main engine and a manoeuvring thruster,
 * both of which are shut down or firing.
 *
 * **Its mount takes two positions where every other division's takes three**, and that is the honest
 * count rather than a saving: an aircraft's hardpoint is a pylon that extends or a bay that opens, and
 * neither traverses. A third position would be the entry inventing a motion the subject has not got.
 */
const THRUSTER_BORNE: VehicleDivision = {
  hull: { label: 'fuselage', name: 'Fuselage', noun: 'fuselage', plural: 'Fuselages' },
  drive: {
    noun: 'thrusters',
    perFacing: 'Thruster cluster',
    positions: [
      { text: 'shut down', slug: 'shut-down' },
      { text: 'firing', slug: 'firing' },
    ],
    units: [
      {
        label: 'main-thruster',
        name: 'Main thruster or engine',
        segments: [
          { text: 'thruster housing', slug: 'housing' },
          { text: 'gimballing nozzle', slug: 'nozzle' },
        ],
      },
      {
        label: 'manoeuvring-thruster',
        name: 'Manoeuvring thruster',
        segments: [
          { text: 'mounting block', slug: 'block' },
          { text: 'swivelling nozzle', slug: 'nozzle' },
        ],
      },
    ],
  },
  mount: {
    label: 'pylon',
    name: 'Weapon pylon or sensor mount',
    noun: 'mount',
    plural: 'Weapon pylons or sensor mounts',
    positions: [
      { text: 'stowed', slug: 'stowed' },
      { text: 'extended', slug: 'extended' },
    ],
    segments: [
      { text: 'pylon root ×1', slug: 'root' },
      { text: 'extending carrier ×1', slug: 'carrier' },
    ],
  },
  access: {
    label: 'canopy-or-crew-hatch',
    stem: 'canopy',
    name: 'Canopy or crew hatch',
    noun: 'canopy',
    positions: [
      { text: 'closed', slug: 'closed' },
      { text: 'open', slug: 'open' },
    ],
  },
};

/**
 * A motorcycle, a trike, a mine bike: one wheel in the forks, one driven behind it, and a rider sitting
 * on the frame rather than inside it.
 *
 * **The one division with no access piece.** A two-wheeler has no hatch and no canopy, so an entry
 * ordering one closed and one open would be this issue's own defect written smaller — and the rider is
 * off the sheet under either of the *Explicit Exclusions* naming a crew.
 */
const TWO_WHEEL: VehicleDivision = {
  hull: { label: 'frame', name: 'Frame', noun: 'frame', plural: 'Frames' },
  drive: {
    noun: 'wheels',
    perFacing: 'Wheels and forks',
    positions: [
      { text: 'at rest', slug: 'rest' },
      { text: 'at mid-travel', slug: 'mid-travel' },
    ],
    units: [
      {
        label: 'front-wheel-and-forks',
        name: 'Front wheel & forks',
        segments: [
          { text: 'steering head', slug: 'steering-head' },
          { text: 'turning fork and wheel', slug: 'fork' },
        ],
      },
      {
        label: 'rear-wheel-and-final-drive',
        name: 'Rear wheel & final drive',
        segments: [
          { text: 'swing arm', slug: 'swing-arm' },
          { text: 'turning wheel', slug: 'wheel' },
        ],
      },
    ],
  },
  mount: {
    label: 'rack',
    name: 'Rack, pannier or weapon mount',
    noun: 'mount',
    plural: 'Racks, panniers or weapon mounts',
    positions: [
      { text: 'stowed', slug: 'stowed' },
      { text: 'loaded', slug: 'loaded' },
    ],
    segments: [
      { text: 'mounting rail ×1', slug: 'rail' },
      { text: 'swinging carrier ×1', slug: 'carrier' },
    ],
  },
  access: null,
};

/** A launch, a gunboat, a submersible: a screw that turns and a rudder that swings, both under one hull. */
const SCREW_AND_RUDDER: VehicleDivision = {
  hull: { label: 'hull', name: 'Hull', noun: 'hull', plural: 'Hulls' },
  drive: {
    // The nautical collective for the screw, the shaft and the rudder together, which is what the two
    // units are. `screw and rudder` would read "its screw and rudder and mount" in the promise beneath
    // the directional core.
    noun: 'running gear',
    perFacing: 'Screw and rudder',
    positions: [
      { text: 'at rest', slug: 'rest' },
      { text: 'at full travel', slug: 'full-travel' },
    ],
    units: [
      {
        label: 'screw-or-propeller',
        name: 'Screw or propeller',
        segments: [
          { text: 'shaft and boss', slug: 'shaft' },
          { text: 'turning blades', slug: 'blades' },
        ],
      },
      {
        label: 'rudder-or-steering-gear',
        name: 'Rudder or steering gear',
        segments: [
          { text: 'rudder stock', slug: 'stock' },
          { text: 'swinging blade', slug: 'blade' },
        ],
      },
    ],
  },
  mount: {
    label: 'deck-mount',
    name: 'Deck gun, crane or working mount',
    noun: 'mount',
    plural: 'Deck guns, cranes or working mounts',
    positions: [
      { text: 'stowed', slug: 'stowed' },
      { text: 'traversed', slug: 'traversed' },
      { text: 'elevated', slug: 'elevated' },
    ],
    segments: [
      { text: 'base ring ×1', slug: 'base-ring' },
      { text: 'traversing body ×1', slug: 'traversing-body' },
    ],
  },
  access: {
    label: 'deck-hatch-or-wheelhouse-door',
    stem: 'deck-hatch',
    name: 'Deck hatch or wheelhouse door',
    noun: 'hatch',
    positions: [
      { text: 'closed', slug: 'closed' },
      { text: 'open', slug: 'open' },
    ],
  },
};

/**
 * A tractor and its plough, a hauler and its trailer: the side-paired division with the two pieces its
 * base names and no sheet drew.
 *
 * **Built from {@link VEHICLE_SIDE_PAIRED} rather than beside it**, because a towing vehicle divides
 * left from right exactly as an untowed one does. What its base adds is the hitch and what hangs off
 * it, so those are what it states.
 */
const TOWED_IMPLEMENT: VehicleDivision = {
  ...VEHICLE_SIDE_PAIRED,
  implement: {
    hitchLabel: 'drawbar-or-hitch',
    hitchName: 'Drawbar or hitch',
    label: 'towed-implement',
    name: 'Towed implement',
    noun: 'implement',
    positions: [
      { text: 'raised', slug: 'raised' },
      { text: 'lowered', slug: 'lowered' },
    ],
    segments: [
      { text: 'hitch arm', slug: 'arm' },
      { text: 'working body', slug: 'body' },
    ],
  },
};

export const VEHICLE_ROTOR_PLANS: ModePlans = vehiclePlansFor(ROTOR_BORNE);
export const VEHICLE_THRUSTER_PLANS: ModePlans = vehiclePlansFor(THRUSTER_BORNE);
export const VEHICLE_TWO_WHEEL_PLANS: ModePlans = vehiclePlansFor(TWO_WHEEL);
export const VEHICLE_SCREW_PLANS: ModePlans = vehiclePlansFor(SCREW_AND_RUDDER);
export const VEHICLE_TOWED_PLANS: ModePlans = vehiclePlansFor(TOWED_IMPLEMENT);
