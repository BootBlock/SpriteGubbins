import type { ModePlans } from './modePlans.ts';
import { vehiclePlansFor } from './vehicleDivision.ts';
import type { VehicleDivision } from './vehicleDivision.ts';

/**
 * What a VEHICLE sheet asks for, per sheet mode — the standard sheets, which are the side-paired ones.
 *
 * A vehicle is hard-surface geometry like an OBJECT, and comes apart nothing like one. An object's
 * inventory is a housing, the base it stands on, and what opens; a vehicle's is a hull, the *drive*
 * that carries it, and the mount that turns on top — and the entry an object calls a "base, mount or
 * footing" is the one part of a vehicle that never holds still. Filing a tank under OBJECT would ask
 * for a footing and no running gear at all.
 *
 * The drive is named as "the drive unit, as the subject defines it" rather than as wheels, because
 * section 1 forbids inferring equipment from a role and the subject's own Vehicle Class and Drive &
 * Assembly Base already say which it is. An inventory reading "road wheels" would do that inferring
 * on the template's behalf for every walker, skiff and gunship that has none.
 *
 * **These are the sheets of a vehicle with a near side and a far side**, and that is a claim about the
 * base rather than about the category (issue #288). A rotating turret, a wheeled chassis, a tracked
 * one, a half-track and a walker's legs each divide left from right, so one drive unit per side is
 * what they come apart into. The five bases that divide some other way declare their own division in
 * `vehicleDivisions.ts`, and `Single Rigid Hull` divides into nothing at all —
 * `vehicleRigidHull.ts` draws it whole.
 *
 * There is no tileset plan: a vehicle is a subject, not a repeating field, and `Partial` in the plan
 * table is what lets that absence be the answer rather than an omission to fill.
 */
export const VEHICLE_SIDE_PAIRED: VehicleDivision = {
  hull: { label: 'hull-or-fuselage', name: 'Hull or fuselage', noun: 'hull', plural: 'Hulls or fuselages' },
  drive: {
    noun: 'drive',
    perFacing: 'Drive unit',
    positions: [
      { text: 'at rest', slug: 'rest' },
      { text: 'at mid-travel', slug: 'mid-travel' },
    ],
    units: [
      {
        label: 'near-side-drive-unit',
        name: 'Near-side drive unit',
        segments: [
          { text: 'root segment', slug: 'root' },
          { text: 'travelling segment', slug: 'travelling' },
        ],
      },
      {
        label: 'far-side-drive-unit',
        name: 'Far-side drive unit',
        segments: [
          { text: 'root segment', slug: 'root' },
          { text: 'travelling segment', slug: 'travelling' },
        ],
      },
    ],
  },
  mount: {
    label: 'turret',
    name: 'Turret, weapon or working mount',
    noun: 'mount',
    plural: 'Turret, weapon or working mounts',
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
    label: 'crew-hatch-or-canopy',
    stem: 'crew-hatch',
    name: 'Crew hatch or canopy',
    noun: 'hatch',
    positions: [
      { text: 'closed', slug: 'closed' },
      { text: 'open', slug: 'open' },
    ],
  },
};

/** The three sheets a side-paired vehicle is drawn on, which is what the category falls back to. */
export const VEHICLE_STANDARD_PLANS: ModePlans = vehiclePlansFor(VEHICLE_SIDE_PAIRED);
