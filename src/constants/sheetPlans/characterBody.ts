import type { ComponentEntry, SheetPlan, SheetSeries } from '../../types/components.ts';
import { slugify } from '../../utils/slugify.ts';
import { spokenList } from '../../utils/spokenList.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../promptText/inventory.ts';
import type { FacingTuple } from './directionalViews.ts';
import { chunkName, coreFacingChunks, viewsOf } from './directionalViews.ts';
import { FIGURE_ASSEMBLY_FAILURE } from './figureAssemblyFailure.ts';
import { mirroredLimb } from './mirroredLimb.ts';
import { fixed } from './modePlans.ts';
import type { ModePlans } from './modePlans.ts';
import type { PartDrawing } from './partDrawing.ts';
import { RIG_PIECES_OUTRO } from './rigPieces.ts';

/**
 * One CHARACTER body plan, and the sheets of every mode that draw it (issue #284).
 *
 * **The defect this exists to answer.** Every CHARACTER sheet used to draw one head, one torso, one
 * pelvis, two arms and two legs, whatever the subject's *Anatomy Base* said. Section 1 carries the base
 * verbatim, so `Humanoid With Wings` stated wings above an inventory that drew none, `Four-Armed
 * Humanoid` four arms above one that drew two, and `Serpent Lower Body` a serpent's tail above a pelvis
 * and two legs — issue #281's defect in the category whose body is the whole subject.
 *
 * **A body, not a sheet.** What differs between those bases is the trunk's pieces, the limbs hung on
 * it, where each trunk piece ends, and the poses the limbs reach. Everything else — the three modes,
 * the directional split, the scale rule, the forms that forbid the assembled figure, and the prose of
 * every sheet — is one figure described one way. So a base declares its body and this builds the rest,
 * in the pattern `vehicleDivision.ts` set for VEHICLE's drives, and the standard humanoid is one body
 * among them rather than a set of sheets the others are copies of.
 *
 * **A body too large for one generation splits its series** rather than overrunning
 * `PRACTICAL_COMPONENT_CEILING`: the pose library and the articulation run each fill a sheet with
 * whole limb chains, in the order the body lists them, and start another where the next chain would
 * pass the ceiling. A chain is never divided, so its left and right sides and its segments stay on one
 * page, drawn against each other.
 */

/** One piece of the trunk, which every sheet but the articulation run draws. */
export interface TrunkPiece {
  /** `head` — what the pose library and the rig call it, and the stem of its component's name. */
  readonly name: string;
  /** `Heads` — the directional core's entry, one per facing. */
  readonly plural: string;
  /**
   * Where it ends and what it carries none of, as the sentence the trunk's closing paragraph gives it.
   * Wrapped where that paragraph wraps, because the pieces' sentences follow one another on its lines.
   */
  readonly ends: string;
}

/** One segment of a limb chain, and the variants the posed sheets draw it in. */
export interface LimbSegment {
  /** `upper arm` — what the pose library and the rig call it. */
  readonly name: string;
  /** `Upper arms` — the articulation run's entry. */
  readonly plural: string;
  /** `upper-arm` — the stem every component of this segment is named from, unique within the body. */
  readonly slug: string;
  /** `upper-arms` — the articulation entry's identifier, unique within the body. */
  readonly group: string;
  /** Every orientation the posed sheets draw it at; the rig draws it once, unposed. */
  readonly variants: readonly [PartDrawing, ...PartDrawing[]];
}

/** A chain of segments hung on the trunk: an arm, a wing, a tail, a serpent's body. */
export interface LimbChain {
  /** `arm`, `second arm`, `serpent body` — the chain's name, which headings and identifiers take. */
  readonly noun: string;
  /** `arms`, `hind legs`, `tail` — what a split sheet's name calls the chain. */
  readonly plural: string;
  /** What the trunk's closing sentence calls a chain of this sort. */
  readonly sort: 'limb' | 'wing' | 'tail' | 'serpent-body section';
  /** A left and a right, or one on the centreline. */
  readonly sides: 'PAIRED' | 'SINGLE';
  /** `a hand` — its smallest piece, which a sheet's scale example sets beside a larger one. */
  readonly smallest: string;
  /** `an upper leg` — its largest piece, for the same sentence. */
  readonly largest: string;
  readonly segments: readonly [LimbSegment, ...LimbSegment[]];
}

/** Everything that differs between two CHARACTER bodies. */
export interface CharacterBody {
  /** Head and torso first, because the core's and the rig's scale examples name both. */
  readonly trunk: readonly [TrunkPiece, TrunkPiece, ...TrunkPiece[]];
  /** The poses a full set of the body's pieces reaches, which the posed sheets promise. */
  readonly poses: readonly [string, ...string[]];
  /** The limbs, in the order the posed sheets draw them and a split series divides them. */
  readonly chains: readonly [LimbChain, ...LimbChain[]];
  /**
   * Which end of each trunk piece is its front, where the trunk is not the head, torso and pelvis
   * CHARACTER's own landmark sentence names — see `SheetPlan.landmark`. The directional core carries it,
   * as the one sheet whose pieces are turned.
   */
  readonly landmark?: string;
}

/**
 * Where each trunk piece ends, as the paragraph every trunk sheet closes with.
 *
 * Stated as its own paragraph because nothing else in the prompt says it and its absence is the
 * reported failure: a generator's prior for "torso" is a torso *with arms*, so trunk sheets came back
 * wearing limbs the inventory never listed. Section 4's generic boundary rule states the principle;
 * this names the joins in the body's own vocabulary, which is what a generator can check a drawing
 * against.
 *
 * **The closing sentence is about the series, not about this sheet's own list.** It once read "has
 * merged entries the inventory lists separately", which is true on the pose library and the rig — both
 * of which list the limbs — and false on the directional core, whose inventory is the trunk alone. What
 * is true on all three is that every limb is counted somewhere in the series, so a trunk piece that
 * arrives wearing one has taken a component that was counted twice. It names the sorts of chain the
 * body has, so a winged body's trunk is told a wing is counted too.
 */
function trunkTermination(body: CharacterBody): string {
  const sorts = [...new Set(body.chains.map((chain) => chain.sort))];
  return `Each of these is a severed, isolated piece of one figure — never the whole figure with the other
parts faded or hidden. ${body.trunk.map((piece) => piece.ends).join(' ')} Every ${spokenList(sorts)} is a component counted in its own
right, on this sheet or on another of this series, so a trunk piece that arrives wearing one has
merged two components into one and breaks the count in section [SEC:CONTRACT].`;
}

/** The poses as one sentence fragment, so every sheet that promises them promises the same ones. */
function posesOf(body: CharacterBody): string {
  const earlier = body.poses.slice(0, -1);
  const last = body.poses.at(-1) ?? '';
  return earlier.length === 0 ? last : `${earlier.join('; ')}; and ${last}`;
}

/** `left`, `right`, or nothing for a chain on the centreline. */
type Side = 'left' | 'right' | null;

function sidesOf(chain: LimbChain): readonly Side[] {
  return chain.sides === 'PAIRED' ? ['left', 'right'] : [null];
}

/** `left-arm`, `serpent-body` — a chain's identifier on one side, or a segment's component stem. */
function sided(side: Side, stem: string): string {
  return side === null ? stem : `${side}-${stem}`;
}

/** `Left arm` from `left arm` — a sentence's first word, or a heading's. */
function capitalised(words: string): string {
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** `Left arm`, `Serpent body` — a chain as a heading names it. */
function headingOf(chain: LimbChain, side: Side): string {
  return capitalised(side === null ? chain.noun : `${side} ${chain.noun}`);
}

/** How many components one side of a chain is on the posed sheets: every variant of every segment. */
function variantCount(chain: LimbChain): number {
  return chain.segments.reduce((total, segment) => total + segment.variants.length, 0);
}

/** The pose library's line for one side of a chain. */
function poseLibraryEntry(chain: LimbChain, side: Side): ComponentEntry {
  const count = variantCount(chain);
  const label = sided(side, slugify(chain.noun));
  const parts = chain.segments.flatMap((segment) =>
    segment.variants.map((_, index) => `${sided(side, segment.slug)}-${String(index + 1)}`),
  );
  if (side === 'right') {
    return {
      label,
      parts,
      text: `${String(count)} ${label} articulation variants, redrawn for the right side`,
      mirrors: `the left ${chain.noun}`,
      count,
      kind: 'anatomy',
    };
  }
  const [only, ...more] = chain.segments;
  const listed =
    more.length === 0
      ? only.variants.map((variant) => variant.text).join(', ')
      : chain.segments.map((segment) => `${segment.name} ×${String(segment.variants.length)}`).join(', ');
  return {
    label,
    parts,
    text: `${String(count)} ${label} articulation variants: ${listed}`,
    count,
    kind: 'anatomy',
  };
}

/** The articulation run's entries for one side of a chain that is drawn in full, one per segment. */
function articulationEntries(chain: LimbChain, side: Side): readonly ComponentEntry[] {
  return chain.segments.map((segment) => ({
    label: sided(side, segment.group),
    parts: segment.variants.map((variant) => `${sided(side, segment.slug)}-${variant.slug}`),
    text: `${segment.plural}: ${segment.variants.map((variant) => variant.text).join(', ')}`,
    count: segment.variants.length,
    kind: 'anatomy' as const,
  }));
}

/** The articulation run's groups for a chain: each side under its own heading, the right mirroring. */
function articulationGroups(chain: LimbChain): SheetPlan['groups'] {
  if (chain.sides === 'SINGLE') {
    return [{ heading: headingOf(chain, null), entries: articulationEntries(chain, null) }];
  }
  const left = articulationEntries(chain, 'left');
  return [
    { heading: headingOf(chain, 'left'), entries: left },
    {
      heading: headingOf(chain, 'right'),
      entries: [
        mirroredLimb({
          label: sided('right', slugify(chain.noun)),
          mirrors: `the left ${chain.noun}`,
          of: left,
          parts: chain.segments.flatMap((segment) =>
            segment.variants.map((variant) => `${sided('right', segment.slug)}-${variant.slug}`),
          ),
        }),
      ],
    },
  ];
}

/** The rig's line for one side of a chain: every segment once, unposed. */
function rigEntry(chain: LimbChain, side: Side): ComponentEntry {
  const heading = headingOf(chain, side);
  return {
    label: sided(side, slugify(chain.noun)),
    parts: chain.segments.map((segment) => sided(side, segment.slug)),
    text:
      chain.segments.length === 1
        ? `${heading} ×1`
        : `${heading}: ${chain.segments.map((segment) => segment.name).join(', ')}`,
    ...(side === 'right' ? { mirrors: `the left ${chain.noun}` } : {}),
    count: chain.segments.length,
    kind: 'anatomy',
  };
}

/** The chains one posed sheet draws: never none, because a sheet starts with the chain that opened it. */
type ChainSheet = readonly [LimbChain, ...LimbChain[]];

/** Every component one chain puts on a posed sheet, both sides of it. */
function componentsOf(chain: LimbChain): number {
  return variantCount(chain) * sidesOf(chain).length;
}

/**
 * The chains divided into the fewest sheets that each stay within `PRACTICAL_COMPONENT_CEILING`,
 * whole chains in the body's order, where the first sheet also carries `firstSheetBase` components.
 */
function packed(body: CharacterBody, firstSheetBase: number): readonly [...ChainSheet[], ChainSheet] {
  const [firstChain, ...rest] = body.chains;
  const done: ChainSheet[] = [];
  let current: [LimbChain, ...LimbChain[]] = [firstChain];
  let total = firstSheetBase + componentsOf(firstChain);
  for (const chain of rest) {
    const count = componentsOf(chain);
    if (total + count > PRACTICAL_COMPONENT_CEILING) {
      done.push(current);
      current = [chain];
      total = count;
    } else {
      current.push(chain);
      total += count;
    }
  }
  return [...done, current];
}

/** `Articulation`, or `Articulation — hind legs and tail` where the run split. */
function splitName(base: string, contents: readonly string[], split: boolean): string {
  return split ? `${base} — ${spokenList(contents)}` : base;
}

/** `a hand drawn beside an upper leg is in proportion to it`, from the first and last chains on a sheet. */
function scaleBetween(chains: ChainSheet, larger?: string): string {
  const last = chains.reduce((_, chain) => chain);
  return `${chains[0].smallest} drawn beside ${larger ?? last.largest} is in proportion to it`;
}

/**
 * `limbs`, or the chains by name — `arms, tail and legs` — where the sheet is one part of a split run or
 * draws a chain the trunk's closing sentence counts as something other than a limb.
 */
function limbsOf(chains: ChainSheet, split: boolean): string {
  const limbsOnly = chains.every((chain) => chain.sort === 'limb');
  return split || !limbsOnly ? spokenList(chains.map((chain) => chain.plural)) : 'limbs';
}

/** The shape every CHARACTER sheet shares, whatever it draws. */
const FIGURE_SHEET = {
  targetQuantity: 'ASSEMBLED',
  scaleUnit: 'a full figure',
  componentClass: 'character anatomy',
  assemblyFailure: FIGURE_ASSEMBLY_FAILURE,
} as const;

/** The pose library: the trunk in the primary direction and every limb variant, split where it must be. */
function poseLibrary(body: CharacterBody): SheetSeries {
  const [first, ...rest] = packed(body, body.trunk.length);
  const split = rest.length > 0;
  const poses = posesOf(body);
  const chainEntries = (chains: ChainSheet) =>
    chains.flatMap((chain) => sidesOf(chain).map((side) => poseLibraryEntry(chain, side)));

  const trunkSheet: SheetPlan = {
    ...FIGURE_SHEET,
    name: splitName('Pose library', ['trunk', ...first.map((chain) => chain.plural)], split),
    facings: 'run',
    // Split, this sheet holds only part of what the poses need, so it promises its own share of them.
    assembly: split
      ? `the trunk and the ${spokenList(first.map((chain) => chain.plural))} of ${poses} — the trunk the other pose library sheets of the same facing fit their limbs to.`
      : `${poses}.`,
    // One limb segment per orientation it is drawn at.
    posing: 'PER_POSITION',
    scaleExample: scaleBetween(first, `a ${body.trunk[1].name}`),
    groups: [
      {
        heading: null,
        entries: [
          {
            label: 'trunk',
            parts: body.trunk.map((piece) => slugify(piece.name)),
            text: `${body.trunk.map((piece) => `1 ${piece.name}`).join(', ')}, in the primary direction`,
            count: body.trunk.length,
            kind: 'anatomy',
          },
          ...chainEntries(first),
        ],
        outro: trunkTermination(body),
      },
    ],
  };

  // A later sheet draws limbs alone, for the trunk the first sheet of its facing drew, so it closes with
  // no trunk rule.
  return [
    trunkSheet,
    ...rest.map((chains): SheetPlan => ({
      ...FIGURE_SHEET,
      name: splitName(
        'Pose library',
        chains.map((chain) => chain.plural),
        true,
      ),
      facings: 'run',
      assembly: `the ${spokenList(chains.map((chain) => chain.plural))} of ${poses} — each fitted to the trunk drawn on the pose library sheet of the same facing.`,
      posing: 'PER_POSITION',
      scaleExample: scaleBetween(chains),
      groups: [{ heading: null, entries: chainEntries(chains) }],
    })),
  ];
}

/**
 * One core sheet: the trunk, turned to this sheet's share of the chosen facings.
 *
 * Up to five views share a sheet; the eight-compass set arrives as two — see `coreFacingChunks` for
 * why the split is by yaw parity. Either way the entries, the count and section 3's yaw list are all
 * written from the same tuple, so they cannot disagree about which views the sheet owes.
 */
function directionalCore(body: CharacterBody, chunk: FacingTuple, chunks: readonly FacingTuple[]): SheetPlan {
  return {
    ...FIGURE_SHEET,
    name: chunkName('Directional core', chunk, chunks),
    facings: chunk,
    ...(body.landmark === undefined ? {} : { landmark: body.landmark }),
    assembly: `${spokenList(body.trunk.map((piece) => `one ${piece.name}`))} per facing, reading as one body turned rather than several drawings of it — the trunk the articulation sheets hang their limbs on.`,
    // The trunk repeated across yaws — the camera turning, not the trunk moving.
    posing: 'UNSTATED',
    scaleExample: `a ${body.trunk[0].name} drawn beside the ${body.trunk[1].name} it joins is in proportion to it`,
    groups: [
      {
        heading: null,
        intro: `One view of ${spokenList(body.trunk.map((piece) => `**one** ${piece.name}`))} per facing: the same piece of geometry
drawn at each object yaw section [SEC:CAMERA] lists, in that order. Separate designs, mirrored copies, or views
facing the same way are all failures of this entry, however well drawn.`,
        entries: body.trunk.map((piece) => viewsOf(piece.plural, 'anatomy', chunk)),
        outro: trunkTermination(body),
      },
    ],
  };
}

/**
 * The limbs, one facing per generation.
 *
 * These variants were never directional, which is exactly why they are the half that comes off the
 * core: a limb set redrawn at every yaw of a set would be hundreds of components. As a `'run'` sheet
 * the chosen direction set is its run list — an eight-direction game generates the articulation run
 * once per facing, each run's limbs fitted to the trunk views the core sheets drew.
 */
function articulation(body: CharacterBody): SheetSeries {
  const [first, ...rest] = packed(body, 0);
  const split = rest.length > 0;
  const run = (chains: ChainSheet): SheetPlan => ({
    ...FIGURE_SHEET,
    name: splitName(
      'Articulation',
      chains.map((chain) => chain.plural),
      split,
    ),
    facings: 'run',
    assembly: `the ${limbsOf(chains, split)} of ${posesOf(body)} — each fitted to the trunk drawn on the directional core sheets, one facing per sheet.`,
    // The same orientations as the pose library's limbs, which is what this run is.
    posing: 'PER_POSITION',
    scaleExample: scaleBetween(chains),
    groups: chains.flatMap(articulationGroups),
  });
  return [run(first), ...rest.map(run)];
}

/** The directional pairing: the core sheet or sheets for the chosen facings, then the limbs. */
function directionalVariants(body: CharacterBody, facings: FacingTuple): SheetSeries {
  const chunks = coreFacingChunks(facings);
  const [first, ...rest] = chunks;
  return [
    directionalCore(body, first, chunks),
    ...rest.map((chunk) => directionalCore(body, chunk, chunks)),
    ...articulation(body),
  ];
}

/** The rig pieces: the trunk and every limb segment, each drawn once in rest orientation. */
function cutoutRig(body: CharacterBody): SheetPlan {
  return {
    ...FIGURE_SHEET,
    name: 'Rig pieces',
    facings: 'run',
    assembly:
      'any pose the rig produces by rotating the pieces about their pivots. The artwork commits to none of them, which is why every piece is drawn unposed.',
    // The sheet whose inventory is the rig, and the one entry `fixedRigMode` reads.
    posing: 'AT_REST',
    scaleExample: `${body.chains[0].smallest} drawn beside a ${body.trunk[1].name} is in proportion to it`,
    groups: [
      {
        heading: null,
        intro: 'One direction’s worth of rig pieces, each drawn once in rest orientation:',
        entries: [
          {
            label: 'trunk',
            parts: body.trunk.map((piece) => slugify(piece.name)),
            text: capitalised(body.trunk.map((piece) => `${piece.name} ×1`).join(', ')),
            count: body.trunk.length,
            kind: 'anatomy',
          },
          ...body.chains.flatMap((chain) => sidesOf(chain).map((side) => rigEntry(chain, side))),
        ],
        outro: `${trunkTermination(body)}

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
export function characterPlansFor(body: CharacterBody): ModePlans {
  return {
    SINGLE_DIRECTION_POSE_LIBRARY: fixed(...poseLibrary(body)),
    CORE_DIRECTIONAL_VARIANTS: (facings) => directionalVariants(body, facings),
    CUTOUT_RIG_SINGLE_DIRECTION: fixed(cutoutRig(body)),
  };
}
