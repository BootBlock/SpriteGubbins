import type { ComponentEntry, SheetPlan, SheetSeries, ViewSheetPlan } from '../../types/components.ts';
import { capitalised } from '../../utils/capitalised.ts';
import { spokenList } from '../../utils/spokenList.ts';
import type { FacingTuple } from './directionalViews.ts';
import { chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';
import { FIGURE_ASSEMBLY_FAILURE } from './figureAssemblyFailure.ts';
import { mirroredLimb } from './mirroredLimb.ts';
import { fixed } from './modePlans.ts';
import type { ModePlans } from './modePlans.ts';
import type { PartDrawing } from './partDrawing.ts';
import { RIG_PIECES_OUTRO } from './rigPieces.ts';

/**
 * How one creature's body comes apart, and the three sheets that draw it that way (issue #286).
 *
 * **The defect this exists to answer.** Every CREATURE sheet used to draw one head, one body, one
 * hindquarters and a left and right forelimb and hindlimb, whatever the subject's *Anatomy Base* said.
 * A serpent has no limbs, an octopus has eight tentacles and no fore or hind limb, a fish swims on fins
 * and a tail, and a rooted growth stands on a stalk over its roots. Section 1 carries the base verbatim,
 * so each of those stated one body above an inventory drawing another — issue #281's defect in the
 * category whose body is the whole subject.
 *
 * **A body, not a sheet.** What differs between those bases is the trunk — the rigid pieces drawn at
 * every facing — and the limbs fitted to it: which chains of segments there are, and the positions each
 * segment is drawn in. Everything else — the three sheets' shape, the way a pose library numbers its
 * variants and an articulation sheet names them, the rig drawing each segment once, the assembly failure
 * — is one creature described the same way. So a base declares its body and this builds the sheets,
 * which keeps one changed position from being a fact stated in three inventories.
 *
 * **The prose is derived from the same fields the entries are**, where it names a piece: the trunk
 * lines, the directional core's intro and its assembly promise all list the trunk the entries draw. The
 * sentences that describe the body rather than list it — the motions, where each piece ends, and the
 * scale examples — are the body's own, beside the pieces they describe.
 */

/** A rigid piece of the trunk: drawn once on the pose library and the rig, once per facing on the core. */
interface TrunkPiece {
  /** `head`, `hindquarters`, `root mass` — what the trunk lines call it. */
  readonly name: string;
  /** `head`, `root-mass` — the component's own name. */
  readonly slug: string;
  /** `Heads`, `Root masses` — the directional core draws one per facing. */
  readonly plural: string;
}

/** One segment of a limb, drawn once per position it takes. */
export interface LimbSegment {
  /** `upper limb`, `foot or claw` — what the pose library's count and the rig call it. */
  readonly name: string;
  /** `upper-limb`, `foot` — the stem each drawing of it is named from. */
  readonly slug: string;
  /** `Upper limbs`, `Feet or claws` — what the articulation sheet's entry opens with. */
  readonly plural: string;
  /** `upper-limbs`, `feet` — the articulation sheet's entry label, after the limb's stem. */
  readonly pluralSlug: string;
  /** Every position the segment is drawn in, which is also how many pose-library variants it has. */
  readonly positions: readonly [PartDrawing, ...PartDrawing[]];
}

/** One chain of segments fitted to the trunk — a forelimb, a tentacle, a stalk, a tail. */
interface Limb {
  /** `left-forelimb` — the pose library's and the rig's entry label. */
  readonly label: string;
  /** `left-fore` — the stem every component of this limb is named from. */
  readonly stem: string;
  /** `Left forelimb` — the articulation sheet's group heading and the rig line's opening. */
  readonly heading: string;
  readonly segments: readonly [LimbSegment, ...LimbSegment[]];
  /**
   * What the articulation sheet says above this limb's segments, where the heading alone would
   * misread them — the octopus's one tentacle is every tentacle's pieces, and a sheet listing one
   * tentacle without saying so reads as an animal with one arm.
   */
  readonly intro?: string;
  /**
   * The limb this one is the right-side copy of, as the inventory names it — `the left forelimb` — or
   * absent on a limb drawn in its own right. See `ComponentEntry.mirrors`.
   */
  readonly mirrors?: string;
}

/** How one *Anatomy Base* divides the creature it names. */
export interface CreatureBody {
  readonly trunk: readonly [TrunkPiece, ...TrunkPiece[]];
  readonly limbs: readonly [Limb, ...Limb[]];
  /** `limbs`, `tentacles`, `fins and tail` — what the articulation sheet fits to the trunk. */
  readonly limbNoun: string;
  /** `gait`, `movement` — what the rig produces by rotating the pieces. */
  readonly motionNoun: string;
  /** Every motion a full set of the components has to reach, as section 5 lists them. */
  readonly motions: string;
  /** Where each piece ends — closes the inventory of every sheet but the articulation run. */
  readonly termination: string;
  /** Which end of each trunk piece is its front — the directional core's `ViewSheetPlan.landmark`. */
  readonly landmark: string;
  readonly scale: {
    /** The pose library's and the rig's example, which names pieces both of those sheets draw. */
    readonly pieces: string;
    /** The directional core's, which names trunk pieces alone. */
    readonly trunk: string;
    /** The articulation sheet's, which names limb segments alone. */
    readonly limbs: string;
  };
}

/** `one head, one body and one hindquarters` — the trunk as a count, with `one` spelt as given. */
function trunkList(trunk: readonly TrunkPiece[], one: string): string {
  return spokenList(trunk.map((piece) => `${one} ${piece.name}`));
}

/** The pose library's and the rig's trunk line: every trunk piece once, in the primary direction. */
function trunkEntry(trunk: readonly TrunkPiece[], text: string): ComponentEntry {
  return {
    label: 'trunk',
    parts: trunk.map((piece) => piece.slug),
    text,
    count: trunk.length,
    kind: 'anatomy',
  };
}

/** The articulation sheet's entries for one limb: each segment, named once per position it takes. */
function segmentEntries(limb: Limb): readonly ComponentEntry[] {
  return limb.segments.map((segment) => ({
    label: `${limb.stem}-${segment.pluralSlug}`,
    parts: segment.positions.map((position) => `${limb.stem}-${segment.slug}-${position.slug}`),
    text: `${segment.plural}: ${segment.positions.map((position) => position.text).join(', ')}`,
    count: segment.positions.length,
    kind: 'anatomy' as const,
  }));
}

/** The pose library's line for one limb: its variants numbered, one per position a segment takes. */
function variantEntry(limb: Limb): ComponentEntry {
  const count = limb.segments.reduce((sum, segment) => sum + segment.positions.length, 0);
  const counts = limb.segments.map((segment) => `${segment.name} ×${segment.positions.length}`).join(', ');
  return {
    label: limb.label,
    parts: limb.segments.flatMap((segment) =>
      segment.positions.map((_, index) => `${limb.stem}-${segment.slug}-${index + 1}`),
    ),
    text:
      limb.mirrors === undefined
        ? `${count} ${limb.label} articulation variants: ${counts}`
        : `${count} ${limb.label} articulation variants, redrawn for the right side`,
    count,
    kind: 'anatomy',
    ...(limb.mirrors === undefined ? {} : { mirrors: limb.mirrors }),
  };
}

/**
 * The rig's line for one limb: every segment once, in rest orientation — `Left forelimb: upper limb,
 * lower limb, foot or claw`, or `Dorsal fin ×1` where the limb is one segment and naming it twice would
 * read as two pieces.
 */
function rigEntry(limb: Limb): ComponentEntry {
  const [only, ...more] = limb.segments;
  return {
    label: limb.label,
    parts: limb.segments.map((segment) => `${limb.stem}-${segment.slug}`),
    text:
      more.length === 0
        ? `${limb.heading} ×1`
        : `${limb.heading}: ${[only, ...more].map((segment) => segment.name).join(', ')}`,
    count: limb.segments.length,
    kind: 'anatomy',
    ...(limb.mirrors === undefined ? {} : { mirrors: limb.mirrors }),
  };
}

/** One direction's worth of a body's pieces, with every limb segment drawn once per position. */
function poseLibrary(body: CreatureBody): SheetPlan {
  const trunk = body.trunk.map((piece) => `1 ${piece.name}`).join(', ');
  return {
    name: 'Pose library',
    facings: 'run',
    assembly: `${body.motions}.`,
    targetQuantity: 'ASSEMBLED',
    // One limb segment per orientation it is drawn at, which is what the numbered variants are.
    posing: 'PER_POSITION',
    scaleExample: body.scale.pieces,
    // Not the "figure" CHARACTER keeps and `CATEGORY_ASSEMBLY` and `FIGURE_ASSEMBLY_FAILURE` share with
    // it: those name a *failure* the two categories have in common, where this is naming the subject
    // itself, and the word appears nowhere in this category's inventories.
    scaleUnit: 'a full creature',
    componentClass: 'creature anatomy',
    assemblyFailure: FIGURE_ASSEMBLY_FAILURE,
    groups: [
      {
        heading: null,
        entries: [
          trunkEntry(body.trunk, `${trunk}, in the primary direction`),
          ...body.limbs.map(variantEntry),
        ],
        outro: body.termination,
      },
    ],
  };
}

/** One core sheet: the trunk, turned to this sheet's share of the chosen facings. */
function directionalCore(
  body: CreatureBody,
  chunk: FacingTuple,
  chunks: readonly FacingTuple[],
): ViewSheetPlan {
  return {
    name: chunkName('Directional core', chunk, chunks),
    facings: chunk,
    landmark: body.landmark,
    // "The pieces" rather than "the trunk", which a serpent's single head is not, and "creature" rather
    // than "animal", which a rooted growth is not.
    assembly: `${trunkList(body.trunk, 'one')} per facing, reading as one creature turned rather than several drawings of it — the pieces the articulation sheets fit their ${body.limbNoun} to.`,
    targetQuantity: 'ASSEMBLED',
    // The trunk repeated across yaws — the camera turning, not the trunk.
    posing: 'UNSTATED',
    scaleExample: body.scale.trunk,
    scaleUnit: 'a full creature',
    componentClass: 'creature anatomy',
    assemblyFailure: FIGURE_ASSEMBLY_FAILURE,
    groups: [
      {
        heading: null,
        intro: `One view of ${trunkList(body.trunk, '**one**')} per facing: the same piece of
geometry drawn at each object yaw section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies,
or views facing the same way are all failures of this entry, however well drawn.`,
        entries: body.trunk.map((piece) => viewsOf(piece.plural, 'anatomy', chunk)),
        outro: body.termination,
      },
    ],
  };
}

/** The limbs, one facing per generation — the creature spelling of the character articulation run. */
function articulation(body: CreatureBody): SheetPlan {
  return {
    name: 'Articulation',
    facings: 'run',
    assembly: `the ${body.limbNoun} of ${body.motions} — each fitted to the pieces drawn on the directional core sheets, one facing per sheet.`,
    targetQuantity: 'ASSEMBLED',
    // The creature spelling of the character articulation run, and posed for the same reason.
    posing: 'PER_POSITION',
    scaleExample: body.scale.limbs,
    scaleUnit: 'a full creature',
    componentClass: 'creature anatomy',
    assemblyFailure: FIGURE_ASSEMBLY_FAILURE,
    groups: body.limbs.map((limb) => ({
      heading: limb.heading,
      ...(limb.intro === undefined ? {} : { intro: limb.intro }),
      entries:
        limb.mirrors === undefined
          ? segmentEntries(limb)
          : [
              mirroredLimb({
                label: limb.label,
                mirrors: limb.mirrors,
                of: segmentEntries(limb),
                parts: segmentEntries(limb).flatMap((entry) => entry.parts ?? []),
              }),
            ],
    })),
  };
}

/** The rig pieces of one body: the trunk and every limb segment, each drawn once in rest orientation. */
function cutoutRig(body: CreatureBody): SheetPlan {
  return {
    name: 'Rig pieces',
    facings: 'run',
    assembly: `any ${body.motionNoun} the rig produces by rotating the pieces about their pivots. The artwork commits to none of them, which is why every piece is drawn unposed.`,
    targetQuantity: 'ASSEMBLED',
    // The sheet whose inventory is the rig, and the one entry `fixedRigMode` reads.
    posing: 'AT_REST',
    scaleExample: body.scale.pieces,
    scaleUnit: 'a full creature',
    componentClass: 'creature anatomy',
    assemblyFailure: FIGURE_ASSEMBLY_FAILURE,
    groups: [
      {
        heading: null,
        intro: 'One direction’s worth of rig pieces, each drawn once in rest orientation:',
        entries: [
          trunkEntry(
            body.trunk,
            body.trunk
              .map((piece, index) => `${index === 0 ? capitalised(piece.name) : piece.name} ×1`)
              .join(', '),
          ),
          ...body.limbs.map(rigEntry),
        ],
        outro: `${body.termination}

${RIG_PIECES_OUTRO}`,
      },
    ],
  };
}

/**
 * The three sheets one body can be drawn on, as `CATEGORY_SHEET_PLANS` and `CATEGORY_ASSEMBLY_BASES`
 * both want them.
 *
 * Called once per body at module scope, never per lookup: `plansFor` answers by identity, and the
 * studio resets the sheet mode and the sheet index only where that identity changes.
 */
export function creaturePlansFor(body: CreatureBody): ModePlans {
  const library = poseLibrary(body);
  const limbs = articulation(body);
  return {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(library),
    CORE_DIRECTIONAL_VARIANTS: (facings): SheetSeries => {
      const chunks = coreFacingChunks(facings);
      const [first, ...rest] = chunks;
      return [
        directionalCore(body, first, chunks),
        ...rest.map((chunk) => directionalCore(body, chunk, chunks)),
        limbs,
      ];
    },
    CUTOUT_RIG_SINGLE_DIRECTION: fixed(cutoutRig(body)),
  };
}
