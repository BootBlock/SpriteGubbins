import type { ComponentEntry, SheetPlan, SheetSeries, ViewSheetPlan } from '../../types/components.ts';
import type { FacingTuple } from './directionalViews.ts';
import { chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';
import { FIGURE_ASSEMBLY_FAILURE } from './figureAssemblyFailure.ts';
import { fixed } from './modePlans.ts';
import type { ModePlans } from './modePlans.ts';
import type { PartDrawing } from './partDrawing.ts';

/**
 * The sheets of `Amorphous — No Fixed Limbs`, a creature that turns about no pivot (issue #286).
 *
 * **What the base says is that nothing on it is fixed**, and the standard sheets ordered four limbs in
 * fifteen positions and a hindquarters. An ooze, a living cloud and a shoggoth have a mass that changes
 * shape and reaches out of itself where it needs to, so the pieces are those two: the mass drawn in each
 * shape it takes, and the pseudopods it pushes out, drawn apart so that the engine can lay one over the
 * mass anywhere along its edge.
 *
 * **There is no rig sheet**, because a pseudopod is laid over the mass rather than hinged to it and
 * nothing turns about a pivot. `rigModes.ts` offers it no rig for the same reason, reading the absence
 * of this mode as it reads a rigid object's. It is also why the body is not a `CreatureBody`: that
 * shape is segments drawn in positions and turned about joints, and this has neither.
 *
 * **It keeps the figure's failure**, because it is still one creature cut into pieces: a mass drawn
 * wearing its pseudopods is the pieces joined back into the whole, which is what that failure forbids.
 */

/** Every motion a full set of the components has to reach, as section 5 lists them. */
const AMORPHOUS_MOTIONS =
  'a settled rest; a spreading crawl; a gathering rise; an engulfing lunge; and a reach, a lash or a grasp made with a pseudopod pushed out of the mass';

/** Where each piece ends — the amorphous spelling of a jointed body's termination paragraph. */
const AMORPHOUS_TERMINATION = `Each of these is a separate piece of one creature — never the whole creature with the other
pieces faded or hidden. The creature has **no fixed limbs**: it pushes a pseudopod out of its mass
wherever a movement calls for one. A body mass is the creature’s whole bulk in one shape, and carries
**no pseudopod**: where a shape reaches, the reach is a pseudopod drawn as a piece of its own. A
pseudopod ends at a soft, open base that overlaps the mass wherever it is laid, and has no joint — it
is laid over the mass rather than hinged to it. Every pseudopod is a component counted in its own
right, on this sheet or on another of this series, so a body mass that arrives wearing one has merged
two components into one and breaks the count in section [SEC:CONTRACT].`;

/** The shapes the mass takes beyond settled, which is the one the directional core draws at every facing. */
const MASS_SHAPES: readonly PartDrawing[] = [
  { text: 'spreading', slug: 'spreading' },
  { text: 'gathered and rising', slug: 'rising' },
  { text: 'lunging', slug: 'lunging' },
];

/** The body mass in the given shapes. */
function massEntry(shapes: readonly PartDrawing[]): ComponentEntry {
  return {
    label: 'body-masses',
    parts: shapes.map((shape) => `body-mass-${shape.slug}`),
    text: `Body masses: ${shapes.map((shape) => shape.text).join(', ')}`,
    count: shapes.length,
    kind: 'anatomy',
  };
}

const PSEUDOPODS: ComponentEntry = {
  label: 'pseudopods',
  parts: ['pseudopod-budding', 'pseudopod-reaching', 'pseudopod-lashing'],
  text: 'Pseudopods: budding, reaching, lashing',
  count: 3,
  kind: 'anatomy',
};

/** The fields every sheet of this body shares. */
const SHARED = {
  targetQuantity: 'ASSEMBLED',
  scaleUnit: 'a full creature',
  componentClass: 'creature anatomy',
  assemblyFailure: FIGURE_ASSEMBLY_FAILURE,
} as const;

const AMORPHOUS_POSE_LIBRARY: SheetPlan = {
  ...SHARED,
  name: 'Pose library',
  facings: 'run',
  assembly: `${AMORPHOUS_MOTIONS}.`,
  // The mass once per shape and a pseudopod once per reach, which is what the entries name.
  posing: 'PER_POSITION',
  scaleExample: 'a pseudopod drawn beside the body mass it reaches from is in proportion to it',
  groups: [
    {
      heading: null,
      entries: [massEntry([{ text: 'settled', slug: 'settled' }, ...MASS_SHAPES]), PSEUDOPODS],
      outro: AMORPHOUS_TERMINATION,
    },
  ],
};

/** One core sheet: the mass, settled, turned to this sheet's share of the chosen facings. */
function amorphousCore(chunk: FacingTuple, chunks: readonly FacingTuple[]): ViewSheetPlan {
  return {
    ...SHARED,
    name: chunkName('Directional core', chunk, chunks),
    facings: chunk,
    // A mass has no head and no tail, so its front is the side it moves towards.
    landmark:
      'a body mass’s front is the side it spreads or lunges towards, where its leading edge is thinnest, and its rear the heavier side it gathers itself from.',
    assembly:
      'one settled body mass per facing, reading as one creature turned rather than several drawings of it — the mass the shape sheets redraw and lay pseudopods over.',
    // One mass repeated across yaws — the camera turning, not the mass.
    posing: 'UNSTATED',
    scaleExample:
      'one view of the body mass and the view beside it are the same mass drawn at the same scale',
    groups: [
      {
        heading: null,
        intro: `One view of **one** settled body mass per facing: the same piece of geometry drawn at each
object yaw section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies, or views facing the
same way are all failures of this entry, however well drawn.`,
        entries: [viewsOf('Body masses', 'anatomy', chunk)],
        outro: AMORPHOUS_TERMINATION,
      },
    ],
  };
}

/** The shapes, one facing per generation — the amorphous spelling of the articulation run. */
const AMORPHOUS_SHAPES: SheetPlan = {
  ...SHARED,
  name: 'Shapes',
  facings: 'run',
  assembly: `the shapes and pseudopods of ${AMORPHOUS_MOTIONS} — each drawn to the mass on the directional core sheets, one facing per sheet.`,
  posing: 'PER_POSITION',
  scaleExample: 'a pseudopod drawn beside a body mass is in proportion to it',
  groups: [{ heading: null, entries: [massEntry(MASS_SHAPES), PSEUDOPODS], outro: AMORPHOUS_TERMINATION }],
};

/** The directional pairing: the core sheet or sheets for the chosen facings, then the shapes. */
function amorphousDirectionalVariants(facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [
    amorphousCore(first, chunks),
    ...rest.map((chunk) => amorphousCore(chunk, chunks)),
    AMORPHOUS_SHAPES,
  ];
}

/** The two sheets a creature with no fixed limbs is drawn on, and the rig it withholds by having neither. */
export const CREATURE_AMORPHOUS_PLANS: ModePlans = {
  SINGLE_DIRECTION_POSE_LIBRARY: fixed(AMORPHOUS_POSE_LIBRARY),
  CORE_DIRECTIONAL_VARIANTS: amorphousDirectionalVariants,
};
