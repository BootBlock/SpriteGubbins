import type {
  AssemblyFailure,
  ComponentEntry,
  ComponentKind,
  SheetPlan,
  SheetSeries,
  ViewSheetPlan,
} from '../../types/components.ts';
import type { FacingTuple } from './directionalViews.ts';
import { atEachYaw, chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';
import { fixed } from './modePlans.ts';
import type { ModePlans } from './modePlans.ts';
import type { PartDrawing } from './partDrawing.ts';

/**
 * How one vehicle divides, and the three sheets that divide it that way (issue #288).
 *
 * **The defect this exists to answer.** Every VEHICLE sheet used to draw a near-side drive unit and a
 * far-side one, at rest and at mid-travel, whatever the subject's *Drive & Assembly Base* said. A
 * motorcycle has no near side and no far side — both wheels sit on the centreline — a rotor turns
 * rather than travels, a thruster fires rather than travels, and none of the three has a hatch, a
 * turret and a pair of side units to be at mid-travel. So section 1 named a drive the inventory below
 * it never drew, which is issue #281's defect in the one category whose drive is half the subject.
 *
 * **A division, not a sheet.** What differs between those bases is the hull's noun, the two units that
 * carry the vehicle, the mount that works on top, and whether a crew gets in at all. Everything else —
 * the cladding, the fittings, the scale rule, the three forms that forbid the assembled whole, and the
 * prose of all three sheets — is the same vehicle described the same way. So a base declares the parts
 * that differ and this builds the rest, which is what keeps one changed word from being a fact stated
 * in three inventories and four sentences.
 *
 * **The prose is derived from the same fields the entries are.** The part library's assembly promise
 * names the positions its entries draw, the directional core's intro names the hull and the mount, and
 * the scale example names the hull. Writing any of them by hand is how a division's sheet comes to
 * promise a travel its inventory does not draw.
 */

/** One of the two units that carry the vehicle, as this base divides them. */
export interface DriveUnit {
  /** The entry's identifier, and the stem each of its components is named from. */
  readonly label: string;
  /** `Near-side drive unit`, `Main rotor or lift fan` — what the inventory calls it. */
  readonly name: string;
  /** The root and the moving piece the rig cuts this unit into. */
  readonly segments: readonly [PartDrawing, PartDrawing];
}

/** What a base tows, on the one base whose name says it tows something. */
export interface TowedImplement {
  readonly hitchLabel: string;
  readonly hitchName: string;
  readonly label: string;
  readonly name: string;
  /** The noun the part library's assembly promise calls it by. */
  readonly noun: string;
  readonly positions: readonly [PartDrawing, PartDrawing];
  readonly segments: readonly [PartDrawing, PartDrawing];
}

/** How one *Drive & Assembly Base* divides the vehicle it names. */
export interface VehicleDivision {
  readonly hull: {
    readonly label: string;
    /** `Hull or fuselage` — the part library's and the rig's own entry. */
    readonly name: string;
    /** `hull` — the noun the scale example and the directional intro call it by. */
    readonly noun: string;
    /** `Hulls or fuselages` — the directional core draws one per facing. */
    readonly plural: string;
  };
  readonly drive: {
    /** `drive` — the noun the assembly promises call the pair by. */
    readonly noun: string;
    /** `Drive unit` — the directional views draw one of these per facing, not one per side. */
    readonly perFacing: string;
    /** The positions **both** units are drawn in, which is what makes them one drive rather than two. */
    readonly positions: readonly [PartDrawing, PartDrawing];
    readonly units: readonly [DriveUnit, DriveUnit];
  };
  readonly mount: {
    readonly label: string;
    readonly name: string;
    /** `mount` — the noun the assembly promises and the directional intro call it by. */
    readonly noun: string;
    readonly plural: string;
    /** At least two, because a mount with one position is a fitting rather than a mount. */
    readonly positions: readonly [PartDrawing, PartDrawing, ...PartDrawing[]];
    readonly segments: readonly [PartDrawing, PartDrawing];
  };
  /**
   * What opens to let a crew in, or `null` on a vehicle a rider sits **on**.
   *
   * `Two-Wheel Frame & Forks` is the null: a motorcycle has no hatch and no canopy, and an entry
   * ordering one closed and open would be the defect this whole module answers, drawn smaller.
   */
  readonly access: {
    readonly label: string;
    /** The stem its components are named from, where that is shorter than the label. */
    readonly stem: string;
    readonly name: string;
    /** `hatch` — the noun the part library's assembly promise calls it by. */
    readonly noun: string;
    readonly positions: readonly [PartDrawing, PartDrawing];
  } | null;
  readonly implement?: TowedImplement;
  /**
   * Which end of each piece the directional views turn is its front, one clause a piece — what the
   * views' `ViewSheetPlan.landmark` joins. Clauses rather than one sentence, so the towed division adds
   * its implement's to the side-paired division's without writing theirs out a second time.
   */
  readonly landmarks: readonly [string, ...string[]];
}

/**
 * How every VEHICLE sheet forbids its assembled whole — `OBJECT_ASSEMBLY_FAILURE`'s three forms in this
 * category's noun, and for that record's reasons: they name the parts fitted together rather than the
 * capability section 6 asks for, and "the vehicle itself" anchors the last two to the whole subject,
 * which no component is.
 *
 * Shared by every division, because each of them draws the parts of one vehicle and none of them draws
 * the vehicle. `vehicleRigidHull.ts` is the one VEHICLE sheet set that cannot take it, and says why.
 */
export const VEHICLE_ASSEMBLY_FAILURE: AssemblyFailure = {
  instruction:
    'Do not draw the parts fitted together into the assembled vehicle anywhere on the sheet, including as a reference or key.',
  exclusion: 'The vehicle itself, whole or partly built, and any staged product shot of it.',
  audit: 'nothing on the sheet is the vehicle itself, whole or partly built',
};

/** The cladding, which every division draws once and the `clothing` pool's absent option takes away. */
function claddingEntry(text: string, label: string): ComponentEntry {
  return { label, text, count: 1, kind: 'structure', attribute: { field: 'clothing', role: 'DRAWS_IT' } };
}

/** An entry drawn once per position or per segment — `Near-side drive unit: at rest, at mid-travel`. */
function drawnIn(
  label: string,
  stem: string,
  name: string,
  drawings: readonly PartDrawing[],
  kind: ComponentKind,
): ComponentEntry {
  return {
    label,
    parts: drawings.map((drawing) => `${stem}-${drawing.slug}`),
    text: `${name}: ${drawings.map((drawing) => drawing.text).join(', ')}`,
    count: drawings.length,
    kind,
  };
}

/** A part drawn once — `Hull or fuselage ×1`. */
function onceEntry(label: string, name: string, kind: ComponentKind): ComponentEntry {
  return { label, text: `${name} ×1`, count: 1, kind };
}

/** `at rest and at mid-travel`, `stowed, traversed and elevated` — a promise's list of positions. */
function joined(drawings: readonly PartDrawing[]): string {
  const texts = drawings.map((drawing) => drawing.text);
  const last = texts.pop() ?? '';
  return texts.length === 0 ? last : `${texts.join(', ')} and ${last}`;
}

/** What the part library promises its states assemble into, named from the entries that draw them. */
function partLibraryAssembly({ access, drive, implement, mount }: VehicleDivision): string {
  const moving = [
    `${mount.noun} ${mount.positions
      .slice(1)
      .map((drawing) => drawing.text)
      .join(' or ')}`,
    access === null ? null : `${access.noun} ${access.positions[1].text}`,
    `${drive.noun} ${joined(drive.positions)}`,
    implement === undefined ? null : `${implement.noun} ${joined(implement.positions)}`,
  ].filter((clause): clause is string => clause !== null);

  return `the complete vehicle at rest, and in each state its moving parts allow — ${moving.join(', ')} — without redrawing any part that does not move.`;
}

/** The part library of one division: one direction's parts, with a component for each state. */
export function vehiclePartLibrary(division: VehicleDivision): SheetPlan {
  const { access, drive, hull, implement, mount } = division;

  return {
    name: 'Part library',
    facings: 'run',
    assembly: partLibraryAssembly(division),
    targetQuantity: 'ASSEMBLED',
    // Every part with more than one position is drawn once per position, which is what the group's own
    // intro promises and what `partLibraryAssembly` above lists back.
    posing: 'PER_POSITION',
    scaleExample: `a lamp housing drawn beside the ${hull.noun} it is mounted on is in proportion to it`,
    scaleUnit: 'a full vehicle',
    componentClass: 'a part of this one vehicle',
    assemblyFailure: VEHICLE_ASSEMBLY_FAILURE,
    groups: [
      {
        heading: null,
        intro: 'One direction’s worth of parts, with a separate component for each state a part has:',
        entries: [
          onceEntry(hull.label, hull.name, 'structure'),
          // Split unit by unit, and each into its positions, because this group's own intro promises
          // "a separate component for each state a part has" — and a drive with two units and no
          // second state is the one entry that would not have kept that promise, leaving the assembly
          // sentence above naming a travel the sheet never draws. The rig plan splits the same units
          // the same way, so the two modes describe one vehicle rather than two.
          ...drive.units.map((unit) =>
            drawnIn(unit.label, unit.label, unit.name, drive.positions, 'mechanism'),
          ),
          drawnIn(mount.label, mount.label, mount.name, mount.positions, 'mechanism'),
          ...(access === null
            ? []
            : [drawnIn(access.label, access.stem, access.name, access.positions, 'mechanism')]),
          ...(implement === undefined
            ? []
            : [
                onceEntry(implement.hitchLabel, implement.hitchName, 'structure'),
                drawnIn(implement.label, implement.label, implement.name, implement.positions, 'mechanism'),
              ]),
          claddingEntry('Cladding panel or fairing ×1', 'cladding-panel-or-fairing'),
          {
            label: 'fittings',
            parts: ['lamp-housing', 'exhaust-vent', 'hard-point-1', 'hard-point-2'],
            text: 'Fittings: lamp housing ×1, exhaust or vent ×1, tow or hard point ×2',
            count: 4,
            kind: 'structure',
          },
        ],
      },
    ],
  };
}

/**
 * One sheet of a division's directional views, steered by the chosen facings — five or six pieces per
 * view on every division but the towed one, so one sheet holds up to five facings and the
 * eight-compass set splits into a cardinal and a diagonal sheet, exactly as `objectDirectionalVariants`
 * does. The towed division draws eight per view, which is forty at five facings and still inside
 * `PRACTICAL_COMPONENT_CEILING`.
 */
function directionalSheet(
  division: VehicleDivision,
  chunk: FacingTuple,
  chunks: readonly FacingTuple[],
): ViewSheetPlan {
  const { access, drive, hull, implement, mount } = division;

  return {
    name: chunkName('Directional views', chunk, chunks),
    facings: chunk,
    landmark: `${division.landmarks.join('; ')}.`,
    assembly: `the complete vehicle seen from each facing, reading as one machine turned rather than several drawings of it, with its ${drive.noun} and ${mount.noun} in matching positions across those views.`,
    targetQuantity: 'ASSEMBLED',
    // The drive and the mount are drawn once per facing in matching positions, which is the camera turning.
    posing: 'UNSTATED',
    scaleExample: `a lamp housing drawn beside the ${hull.noun} it is mounted on is in proportion to it`,
    scaleUnit: 'a full vehicle',
    componentClass: 'a part of this one vehicle',
    assemblyFailure: VEHICLE_ASSEMBLY_FAILURE,
    groups: [
      {
        heading: 'Directional core',
        intro: `One view of **one** ${hull.noun} and **one** ${mount.noun} per facing: the same piece of geometry drawn at each
object yaw section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies, or views facing the
same way are all failures of this entry.`,
        entries: [viewsOf(hull.plural, 'structure', chunk), viewsOf(mount.plural, 'mechanism', chunk)],
      },
      {
        // Grouped by what the entries *are*, not by where they sit on the vehicle. A heading is
        // rendered into section 4 above its own bullets, so "Running gear" over a cladding panel
        // describes the group wrongly to the one reader that cannot ask.
        heading: 'Moving parts',
        entries: [
          atEachYaw(drive.perFacing, 'mechanism', chunk),
          ...(access === null ? [] : [atEachYaw(access.name, 'mechanism', chunk)]),
          ...(implement === undefined ? [] : [atEachYaw(implement.name, 'mechanism', chunk)]),
        ],
      },
      {
        heading: 'Fittings',
        entries: [
          // The hitch leads, so the two pieces a towing base adds stay adjacent across the group
          // boundary: the implement closes the moving parts above and its hitch opens this group.
          ...(implement === undefined ? [] : [atEachYaw(implement.hitchName, 'structure', chunk)]),
          {
            ...atEachYaw('Cladding panel or fairing', 'structure', chunk),
            attribute: { field: 'clothing', role: 'DRAWS_IT' },
          },
          atEachYaw('Lamp housing', 'structure', chunk),
        ],
      },
    ],
  };
}

/** A division's directional pairing: one sheet for up to five facings, two for the eight-compass set. */
function directionalVariants(division: VehicleDivision, facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [
    directionalSheet(division, first, chunks),
    ...rest.map((chunk) => directionalSheet(division, chunk, chunks)),
  ];
}

/** The rig pieces of one division: every piece drawn once, in rest position, with its pivot on it. */
export function vehicleCutoutRig(division: VehicleDivision): SheetPlan {
  const { access, drive, hull, implement, mount } = division;

  return {
    name: 'Rig pieces',
    facings: 'run',
    assembly: `any state the rig produces by rotating the vehicle’s ${drive.noun} and its ${mount.noun} about their pivots. The artwork commits to none of them, which is why every piece is drawn in its rest position.`,
    targetQuantity: 'ASSEMBLED',
    // The sheet whose inventory is the rig, and the one entry `fixedRigMode` reads.
    posing: 'AT_REST',
    scaleExample: `a lamp housing drawn beside the ${hull.noun} it is mounted on is in proportion to it`,
    scaleUnit: 'a full vehicle',
    componentClass: 'a part of this one vehicle',
    assemblyFailure: VEHICLE_ASSEMBLY_FAILURE,
    groups: [
      {
        heading: null,
        intro: 'One direction’s worth of rig pieces, each drawn once in rest position:',
        entries: [
          onceEntry(hull.label, hull.name, 'structure'),
          drawnIn(mount.label, mount.label, mount.name, mount.segments, 'mechanism'),
          ...drive.units.map((unit) =>
            drawnIn(unit.label, unit.label, unit.name, unit.segments, 'mechanism'),
          ),
          ...(access === null
            ? []
            : [
                {
                  label: access.label,
                  text: `${access.name} ×1, drawn ${access.positions[0].text}`,
                  count: 1,
                  kind: 'mechanism' as const,
                },
              ]),
          ...(implement === undefined
            ? []
            : [
                onceEntry(implement.hitchLabel, implement.hitchName, 'structure'),
                drawnIn(implement.label, implement.label, implement.name, implement.segments, 'mechanism'),
              ]),
          // Two entries rather than one `Fittings:` line, because the pool this category's `clothing`
          // field offers includes `Bare Unclad Frame` — a reader who chooses it has said the hull
          // carries no cladding, and a bundled line could only be dropped by taking the lamp housing
          // with it. A lamp is a fitting whatever the frame is clad in. See `ComponentEntry.attribute`.
          claddingEntry('Cladding panel ×1', 'cladding-panel'),
          onceEntry('lamp-housing', 'Lamp housing', 'structure'),
        ],
        outro: `Each moving piece carries its pivot at the joint it turns about, matched in diameter to the piece
it turns against, exactly as any other articulated segment on a rigged sheet would. Where a drive has
no articulated pair — a single road wheel, a fixed thruster — its travelling segment is the part that
turns or extends against the root: the wheel against its hub, the nozzle against its housing.`,
      },
    ],
  };
}

/**
 * The three sheets one division can be drawn on, as `CATEGORY_SHEET_PLANS` and `CATEGORY_ASSEMBLY_BASES`
 * both want them.
 *
 * Called once per division at module scope, never per lookup: `plansFor` answers by identity, and the
 * studio resets the sheet mode and the sheet index only where that identity changes.
 */
export function vehiclePlansFor(division: VehicleDivision): ModePlans {
  return {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(vehiclePartLibrary(division)),
    CORE_DIRECTIONAL_VARIANTS: (facings) => directionalVariants(division, facings),
    CUTOUT_RIG_SINGLE_DIRECTION: fixed(vehicleCutoutRig(division)),
  };
}
