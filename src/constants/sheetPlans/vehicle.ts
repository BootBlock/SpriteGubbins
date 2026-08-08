import type { SheetPlan } from '../../types/components.ts';

/**
 * What a VEHICLE sheet asks for, per sheet mode.
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
 * There is no tileset plan: a vehicle is a subject, not a repeating field, and `Partial` in the plan
 * table is what lets that absence be the answer rather than an omission to fill.
 */

export const VEHICLE_PART_LIBRARY: SheetPlan = {
  assembly:
    'the complete vehicle at rest, and in each state its moving parts allow — mount traversed or elevated, hatch open, drive at rest and at mid-travel — without redrawing any part that does not move.',
  groups: [
    {
      heading: null,
      intro: "One direction's worth of parts, with a separate component for each state a part has:",
      entries: [
        { text: 'Hull or fuselage ×1', count: 1, kind: 'structure' },
        // Split near from far, and each into a state pair, because this group's own intro promises
        // "a separate component for each state a part has" — and a drive with only two *sides* and
        // no second state is the one entry that would not have kept that promise, leaving the
        // assembly sentence above naming a travel the sheet never draws. The rig plan splits the
        // sides the same way, so the two modes describe one vehicle rather than two.
        { text: 'Near-side drive unit: at rest, at mid-travel', count: 2, kind: 'mechanism' },
        { text: 'Far-side drive unit: at rest, at mid-travel', count: 2, kind: 'mechanism' },
        {
          text: 'Turret, weapon or working mount: stowed, traversed, elevated',
          count: 3,
          kind: 'mechanism',
        },
        { text: 'Crew hatch or canopy: closed, open', count: 2, kind: 'mechanism' },
        { text: 'Cladding panel or fairing ×1', count: 1, kind: 'structure' },
        {
          text: 'Fittings: lamp housing ×1, exhaust or vent ×1, tow or hard point ×2',
          count: 4,
          kind: 'structure',
        },
      ],
    },
  ],
};

export const VEHICLE_DIRECTIONAL_VARIANTS: SheetPlan = {
  assembly:
    'the complete vehicle seen from each of the directions listed above, reading as one machine turned rather than several drawings of it, with its drive and mount in matching positions across those views.',
  groups: [
    {
      heading: 'Directional core',
      intro: `Three views each of **one** hull and **one** mount: the same piece of geometry drawn
at each object yaw section 3 lists, in that order. Three separate designs, three mirrored
copies, or three views facing the same way are all failures of this entry.`,
      entries: [
        {
          text: 'Hulls or fuselages: front-three-quarter, right side, back-three-quarter',
          count: 3,
          kind: 'structure',
        },
        {
          text: 'Turret, weapon or working mounts: front-three-quarter, right side, back-three-quarter',
          count: 3,
          kind: 'mechanism',
        },
      ],
    },
    {
      // Grouped by what the entries *are*, not by where they sit on the vehicle. A heading is
      // rendered into section 4 above its own bullets, so "Running gear" over a cladding panel
      // describes the group wrongly to the one reader that cannot ask.
      heading: 'Moving parts',
      entries: [
        { text: 'Drive unit, at each of the three yaws', count: 3, kind: 'mechanism' },
        { text: 'Crew hatch or canopy, at each of the three yaws', count: 3, kind: 'mechanism' },
      ],
    },
    {
      heading: 'Fittings',
      entries: [
        { text: 'Cladding panel or fairing, at each of the three yaws', count: 3, kind: 'structure' },
        { text: 'Lamp housing, at each of the three yaws', count: 3, kind: 'structure' },
      ],
    },
  ],
};

export const VEHICLE_CUTOUT_RIG: SheetPlan = {
  assembly:
    'any state the rig produces by rotating its drive and its mount about their pivots. The artwork commits to none of them, which is why every piece is drawn in its rest position.',
  groups: [
    {
      heading: null,
      intro: "One direction's worth of rig pieces, each drawn once in rest position:",
      entries: [
        { text: 'Hull or fuselage ×1', count: 1, kind: 'structure' },
        {
          text: 'Turret, weapon or working mount: base ring ×1, traversing body ×1',
          count: 2,
          kind: 'mechanism',
        },
        { text: 'Near-side drive unit: root segment, travelling segment', count: 2, kind: 'mechanism' },
        { text: 'Far-side drive unit: root segment, travelling segment', count: 2, kind: 'mechanism' },
        { text: 'Crew hatch or canopy ×1, drawn closed', count: 1, kind: 'mechanism' },
        { text: 'Fittings: cladding panel ×1, lamp housing ×1', count: 2, kind: 'structure' },
      ],
      outro: `Each moving piece carries its pivot at the joint it turns about, matched in diameter to the piece
it turns against, exactly as a limb segment would. Where a drive has no articulated pair — a single
road wheel, a fixed thruster — its travelling segment is the part that turns or extends against the
root: the wheel against its hub, the nozzle against its housing.`,
    },
  ],
};
