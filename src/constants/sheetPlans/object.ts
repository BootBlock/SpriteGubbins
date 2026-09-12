import type { AssemblyFailure, SheetPlan, SheetSeries } from '../../types/components.ts';
import type { FacingTuple } from './directionalViews.ts';
import { atEachYaw, chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';

/**
 * What an OBJECT sheet asks for, per sheet mode.
 *
 * New content, because there was none: every category previously received the humanoid inventories,
 * so an interactive object was asked for a pelvis, two arms and two legs. These describe an object
 * the way an object actually comes apart — a housing, what it stands on, what opens, what moves, and
 * what is bolted to it.
 *
 * Deliberately generic. The entries name *functional roles* rather than a crate's slats or a
 * console's screen, because the subject definition already says what the object is and section 1
 * forbids inferring anything it does not state — including inferring a weapon's parts from a role.
 * An object whose decomposition genuinely differs states the extra pieces as additional components.
 */

/**
 * How every OBJECT sheet forbids its assembled whole, in the three sections that say it.
 *
 * The forms open the shape the one-subject categories share — "the parts fitted together into the
 * assembled X", INTERFACE's state library saying "pieces" for what its own inventory calls them — which
 * names what the sheet must not *depict* without touching what section 6 asks the set to be *capable*
 * of. "The complete object in its resting state" is the part library's own phrase for the capability,
 * so this does not borrow it.
 *
 * **The last two forms say "the object itself" rather than "the object, in whole or in part", and the
 * word is load-bearing.** The part library lists a `Primary moving subassembly`, which is literally
 * parts assembled — so a check reading "nothing is the object assembled, in part" invites a reader to
 * fail the sheet on an entry section 4 required, which is the `CATEGORY_AUDIT_TEXT` "no exhaust"
 * mistake in another form. "Itself" anchors both forms to the whole subject, which no component is.
 *
 * All three sheets take it, because each draws the parts of the one object — its states, its views or
 * its rig pieces — and none of them draws the object.
 */
const OBJECT_ASSEMBLY_FAILURE: AssemblyFailure = {
  instruction:
    'Do not draw the parts fitted together into the assembled object anywhere on the sheet, including as a reference or key.',
  exclusion: 'The object itself, whole or partly built, and any staged product shot of it.',
  audit: 'nothing on the sheet is the object itself, whole or partly built',
};

export const OBJECT_PART_LIBRARY: SheetPlan = {
  name: 'Part library',
  facings: 'run',
  assembly:
    'the complete object in its resting state, and in each state its moving parts allow — opened, activated, or mid-travel — without redrawing any part that does not move.',
  targetQuantity: 'ASSEMBLED',
  // The hatch is drawn closed, part-open and fully open, and the subassembly at three points of its travel.
  posing: 'PER_POSITION',
  scaleExample: 'a latch drawn beside the housing it fastens is in proportion to it',
  scaleUnit: 'a full object',
  componentClass: 'a part of this one object',
  assemblyFailure: OBJECT_ASSEMBLY_FAILURE,
  groups: [
    {
      heading: null,
      intro: 'One direction’s worth of parts, with a separate component for each state a part has:',
      entries: [
        {
          label: 'main-housing-or-body-shell',
          text: 'Main housing or body shell ×1',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'base',
          text: 'Base, mount or footing ×1',
          count: 1,
          kind: 'structure',
          clothingRole: 'DRAWS_IT',
        },
        {
          label: 'access-panel',
          parts: ['access-panel-closed', 'access-panel-part-open', 'access-panel-fully-open'],
          text: 'Access panel, lid or hatch: closed, part-open, fully open',
          count: 3,
          kind: 'mechanism',
        },
        {
          label: 'primary-moving-subassembly',
          parts: [
            'primary-moving-subassembly-rest',
            'primary-moving-subassembly-mid-travel',
            'primary-moving-subassembly-full-travel',
          ],
          text: 'Primary moving subassembly: rest, mid-travel, full-travel',
          count: 3,
          kind: 'mechanism',
        },
        {
          label: 'interface-or-control-face',
          parts: ['control-face-inactive', 'control-face-active'],
          text: 'Interface or control face: inactive, active',
          count: 2,
          kind: 'mechanism',
        },
        {
          label: 'fittings',
          parts: ['handle', 'latch', 'mounting-bracket-1', 'mounting-bracket-2'],
          text: 'Fittings: handle ×1, latch or catch ×1, mounting bracket ×2',
          count: 4,
          kind: 'structure',
          clothingRole: 'DRAWS_IT_PARTLY',
        },
      ],
    },
  ],
};

/**
 * The directional views, steered by the chosen facings.
 *
 * Every entry here is a piece drawn once per facing, so the whole plan scales with the set: six
 * pieces at five views is thirty components, inside the ceiling on one sheet. The eight-compass set
 * would be forty-eight, past it — so `coreFacingChunks` splits that set into a cardinal sheet and a
 * diagonal sheet, exactly as the character core splits, and every group scales to its sheet's own
 * chunk. Unlike CHARACTER and CREATURE there is no articulation run behind these: the moving parts
 * are views of the same object, so they turn with it.
 */
function objectDirectionalSheet(chunk: FacingTuple, chunks: readonly FacingTuple[]): SheetPlan {
  return {
    name: chunkName('Directional views', chunk, chunks),
    facings: chunk,
    assembly:
      'the complete object seen from each facing, with its moving parts in matching positions across those views.',
    targetQuantity: 'ASSEMBLED',
    // The moving parts are drawn once per facing in matching positions, which is the camera turning.
    posing: 'UNSTATED',
    scaleExample: 'a latch drawn beside the housing it fastens is in proportion to it',
    scaleUnit: 'a full object',
    componentClass: 'a part of this one object',
    assemblyFailure: OBJECT_ASSEMBLY_FAILURE,
    groups: [
      {
        heading: 'Directional core',
        intro: `One view of **one** housing and **one** base per facing: the same piece of geometry drawn at each
object yaw section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies, or views facing the
same way are all failures of this entry.`,
        entries: [
          viewsOf('Housings', 'structure', chunk),
          { ...viewsOf('Bases', 'structure', chunk), clothingRole: 'DRAWS_IT' },
        ],
      },
      {
        heading: 'Moving parts',
        entries: [
          atEachYaw('Access panel, lid or hatch', 'mechanism', chunk),
          atEachYaw('Primary moving subassembly', 'mechanism', chunk),
        ],
      },
      {
        heading: 'Fittings',
        entries: [atEachYaw('Handle', 'structure', chunk), atEachYaw('Latch or catch', 'structure', chunk)],
      },
    ],
  };
}

/** The directional pairing: one sheet for up to five facings, two for the eight-compass set. */
export function objectDirectionalVariants(facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [
    objectDirectionalSheet(first, chunks),
    ...rest.map((chunk) => objectDirectionalSheet(chunk, chunks)),
  ];
}

export const OBJECT_CUTOUT_RIG: SheetPlan = {
  name: 'Rig pieces',
  facings: 'run',
  // “The object’s” rather than “its”: the sentence had no noun to point back to, and this is the one
  // sheet of the three whose own prose never named what the pieces are pieces of.
  assembly:
    'any state the rig produces by rotating the object’s moving parts about their pivots. The artwork commits to none of them, which is why every piece is drawn in its rest position.',
  targetQuantity: 'ASSEMBLED',
  // The sheet whose inventory is the rig, and the one entry `fixedRigMode` reads.
  posing: 'AT_REST',
  scaleExample: 'a latch drawn beside the housing it fastens is in proportion to it',
  scaleUnit: 'a full object',
  componentClass: 'a part of this one object',
  assemblyFailure: OBJECT_ASSEMBLY_FAILURE,
  groups: [
    {
      heading: null,
      intro: 'One direction’s worth of rig pieces, each drawn once in rest position:',
      entries: [
        {
          label: 'main-housing-or-body-shell',
          text: 'Main housing or body shell ×1',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'base',
          text: 'Base, mount or footing ×1',
          count: 1,
          kind: 'structure',
          clothingRole: 'DRAWS_IT',
        },
        {
          label: 'access-panel',
          text: 'Access panel, lid or hatch ×1, drawn closed',
          count: 1,
          kind: 'mechanism',
        },
        {
          label: 'primary-moving-subassembly',
          parts: ['primary-moving-subassembly-root', 'primary-moving-subassembly-travelling'],
          text: 'Primary moving subassembly: root segment, travelling segment',
          count: 2,
          kind: 'mechanism',
        },
        {
          label: 'fittings',
          parts: ['handle', 'latch'],
          text: 'Fittings: handle ×1, latch or catch ×1',
          count: 2,
          kind: 'structure',
        },
      ],
      outro: `Each moving piece carries its pivot at the joint it turns about, matched in diameter to the piece
it turns against, exactly as any other articulated segment on a rigged sheet would.`,
    },
  ],
};

/**
 * How a rigid object's sheets forbid what goes wrong with them, in the three sections that say it.
 *
 * **Not {@link OBJECT_ASSEMBLY_FAILURE}, because a rigid object has no parts to fit together.** Its
 * *Structure Base* says it comes apart in one piece, so every component on its sheets is the whole
 * object, and a form forbidding the parts fitted together would name parts the sheet does not have
 * while forbidding nothing it could draw. What does go wrong is PORTRAIT's failure in an object's
 * shape: two of the drawings merged into one, or the object staged as a product shot rather than drawn
 * as a sprite.
 */
const RIGID_OBJECT_FAILURE: AssemblyFailure = {
  instruction:
    'Do not draw the object with two of its drawings merged into one, or staged as a product shot, anywhere on the sheet, including as a reference or key.',
  exclusion: 'Two drawings of the object merged into one, and any staged product shot of it.',
  audit: 'nothing on the sheet is two drawings of the object merged into one, or a staged product shot of it',
};

/**
 * The sheets of a `Single Rigid Object`, which comes apart in one piece (issue #283).
 *
 * **Every component is the whole object, because that is what the base says.** A rigid prop has no
 * hinge and no segment join, so there is no housing to cut from its base and no hatch to draw open —
 * and the standard sheets above ordered both regardless, so section 1 stated a rigid object while
 * section 4 ordered an access panel in three positions and a moving subassembly in three more. What
 * such an object does have is facings and states, so its two sheets are those: the object turned, and
 * the object at rest and active. There is no rig sheet, because nothing on it turns about a pivot, and
 * `rigModes.ts` offers it no rig for the same reason.
 *
 * **A stated size names the component here**, since the component is the object: a reader's
 * `48 × 64 px` is checkable against each drawing, where on the standard sheets it names what the parts
 * assemble into and no single component has it.
 *
 * **The mounting is painted rather than drawn apart.** `Mounting / Framework` is a piece of its own on
 * the standard sheets, where a base or bracket carries it; on these the mount is part of the one piece,
 * so no entry claims it and section 1's paint rule covers it.
 */
export const OBJECT_RIGID_STATES: SheetPlan = {
  name: 'Object states',
  facings: 'run',
  assembly:
    'one object shown at rest and active, both drawn to the same footprint and registration, so either can replace the other in place without the object shifting.',
  targetQuantity: 'COMPONENT',
  // The one object, drawn once for each state it takes.
  posing: 'PER_POSITION',
  scaleExample:
    'the object at rest and the object active beside it are the same object drawn at the same scale',
  scaleUnit: 'a full object',
  componentClass: 'this one object, drawn whole',
  assemblyFailure: RIGID_OBJECT_FAILURE,
  groups: [
    {
      heading: null,
      intro:
        'One direction’s worth of the object, drawn whole once for each state it takes and never cut into parts:',
      entries: [
        { label: 'object-at-rest', text: 'The object at rest ×1', count: 1, kind: 'structure' },
        {
          label: 'object-active',
          text: 'The object active ×1 — powered, lit or in use, and otherwise unchanged',
          count: 1,
          kind: 'structure',
        },
      ],
    },
  ],
};

/** One sheet of a rigid object's views: the whole object at each of this sheet's facings. */
function objectRigidViewSheet(chunk: FacingTuple, chunks: readonly FacingTuple[]): SheetPlan {
  return {
    name: chunkName('Object views', chunk, chunks),
    facings: chunk,
    assembly:
      'one object seen from each facing, every view registered to the same footprint, so the engine can swap one for the next as the object turns without it shifting.',
    targetQuantity: 'COMPONENT',
    // The one object at each yaw, which is the camera turning rather than anything on it moving.
    posing: 'UNSTATED',
    scaleExample: 'one view of the object and the view beside it are the same object drawn at the same scale',
    scaleUnit: 'a full object',
    componentClass: 'this one object, drawn whole',
    assemblyFailure: RIGID_OBJECT_FAILURE,
    groups: [
      {
        heading: null,
        intro: `One view of **the object**, drawn whole, per facing: the same drawing turned to each object yaw
section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies, or views facing the same way are all
failures of this entry.`,
        entries: [viewsOf('Objects', 'structure', chunk)],
      },
    ],
  };
}

/**
 * A rigid object's directional pairing: one sheet for up to five facings, and two for the eight-compass
 * set, for the adjacent-yaw reason `coreFacingChunks` gives rather than for the count.
 */
export function objectRigidViewVariants(facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [objectRigidViewSheet(first, chunks), ...rest.map((chunk) => objectRigidViewSheet(chunk, chunks))];
}
