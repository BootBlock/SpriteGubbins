import type { AssemblyFailure, ComponentEntry, SheetPlan } from '../../types/components.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { spellNumber, spellNumberCapitalised } from '../../utils/numberWords.ts';

/**
 * What a TERRAIN sheet asks for, per sheet mode.
 *
 * Terrain is tiles like a BUILDING and comes apart nothing like one. A building tileset is a floor
 * field with walls *around* it — floor, wall top, wall face, and outer and inner corners of each —
 * which is architecture, and it has no way to express the thing a terrain sheet is entirely about:
 * two materials meeting, and the edge and corner tiles that carry one into the other across open
 * ground. So the blend set below is not the building plan renamed; the two share only the word
 * "tile".
 *
 * **The blend set answers a water edge as readily as a grass-to-dirt one**, which is why there is no
 * separate shoreline plan: a shoreline *is* two materials meeting, and the second material being
 * liquid changes what is painted rather than which tiles exist. A **cliff** is the case it genuinely
 * cannot answer — that is a change in height rather than in material, and it needs an exposed face,
 * which a flat field has nowhere to put. The face and its corners are therefore the feature library's
 * first group rather than the blend set's fourth.
 *
 * **Neither plan is a series, and both are well inside `PRACTICAL_COMPONENT_CEILING`.** A 47-tile
 * blob set would be over it, and splitting one across two sheets is the wrong answer for a tile set
 * specifically: seamlessness is an agreement between tiles about where a boundary leaves the edge,
 * and two generations do not hold that agreement. So the transition group draws the boundary cases an
 * autotiler indexes and leaves the blob set's redundant permutations to the tool that assembles them.
 *
 * **The scatter layer is carried by the base tile's variants rather than by overlay components.**
 * `clothing` is *Scatter Layer* in this category, and the honest answer for a tile set is paint: an
 * overlay decal that must never reach a tile edge is one more thing a player can recognise twice
 * across a field, where a variant is a difference they cannot. Section 1 then says so — its paint
 * rule excepts only what a plan draws as components of its own, and no entry below does, so a
 * TERRAIN prompt tells the generator the pebbles and tufts are painted onto the tiles. That
 * agreement between the two sections is the point: a sheet whose section 1 forbids what its
 * section 4 requires is the contradiction these per-category plans exist to remove.
 *
 * **The variants are therefore a separate group, and it is the group a reader can decline.** Paint
 * settles what the scatter *is*, and it does not settle how many tiles are ordered to differ in it:
 * the *Scatter Layer* pool offers `Bare Untouched Ground`, and for a reader who picks it the seven
 * variants below were still ordered to differ in a property section 1 had just said the subject does
 * not have — under section 4's own rule against merging entries or substituting duplicates. They
 * carry `clothingRole: 'VARIES_IN_IT'`, which drops them without claiming they ever drew the
 * scatter, and the group goes with them because `planAsDrawn` takes an emptied group out. What is
 * left is the two primaries and the fourteen transitions — the sixteen the transition group's own
 * intro calls the set an autotiler indexes — so declining buys a plainer sheet rather than a
 * broken one.
 */

/**
 * The two materials the blend set joins, one primary tile each.
 *
 * Hoisted because four sentences on this sheet count them: this group's own intro opens on how many
 * materials the set joins, the variant group below draws one run per material, the transition
 * group's intro adds one primary per material to reach the sixteen an autotiler indexes, and that
 * group's outro says how many tiles repeat against themselves. All four read the length of this
 * list, so a third material moves every one of them.
 */
const MATERIAL_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'base-material-tile',
    text: 'Base material tile ×1: the primary of the two',
    count: 1,
    kind: 'tile',
  },
  {
    label: 'second-material-tile',
    text: 'Second material tile ×1: the primary the first washes into',
    count: 1,
    kind: 'tile',
  },
];

/**
 * The repeat-breaking variants of those two primaries, and the only entries on this sheet a reader
 * can decline.
 *
 * Split out of `MATERIAL_ENTRIES` rather than counted inside them, because an entry's `count` is
 * fixed and this is the one run on the sheet whose length is a function of the subject. Written as
 * two entries in a group of their own so that dropping both empties the group, which takes the intro
 * explaining them with it — an intro over no bullets is what a filter applied inside one entry would
 * have left.
 *
 * **Five and two, which are the figures the ×6 and ×3 they came out of carried.** A subject with a
 * scatter layer still gets six tiles of the base material and three of the second, so the sheet asks
 * for what it always asked for. **The reading order does move**, and that is the change a reader of
 * a sprite pack sees: the two primaries now come first and the seven variants after them, where the
 * old plan ran all six base tiles before the second material's three. Grid position is the only
 * identity a labelless sheet has, so this renumbers the blend set — which is why it is stated here
 * and in the commit that made it, rather than left to be discovered from a manifest.
 */
const SCATTER_VARIANT_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'base-material-tile-variants',
    text: 'Base material tile variants ×5: the primary redrawn, differing only in surface scatter',
    count: 5,
    kind: 'tile',
    clothingRole: 'VARIES_IN_IT',
  },
  {
    label: 'second-material-tile-variants',
    text: 'Second material tile variants ×2: the primary redrawn, differing only in surface scatter',
    count: 2,
    kind: 'tile',
    clothingRole: 'VARIES_IN_IT',
  },
];

/** The tiles carrying the boundary, which the group's own intro counts twice over. */
const TRANSITION_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'straight-transitions',
    parts: [
      'straight-transition-north',
      'straight-transition-east',
      'straight-transition-south',
      'straight-transition-west',
    ],
    text: 'Straight transitions ×4: the boundary crossing the tile from the north, east, south and west edge',
    count: 4,
    kind: 'tile',
  },
  {
    label: 'outer-corner-transitions',
    text: 'Outer corner transitions ×4: the second material turning a convex corner, once per corner',
    count: 4,
    kind: 'tile',
  },
  {
    label: 'inner-corner-transitions',
    text: 'Inner corner transitions ×4: the second material turning a concave corner, once per corner',
    count: 4,
    kind: 'tile',
  },
  {
    label: 'enclosed-transitions',
    parts: ['enclosed-second-material', 'enclosed-base-material'],
    text: 'Enclosed transitions ×2: an isolated patch of the second material, and an isolated patch of the base within it',
    count: 2,
    kind: 'tile',
  },
];

const TRANSITION_TILE_COUNT = componentTotal(TRANSITION_ENTRIES);

/**
 * How both TERRAIN sheets forbid their assembled whole.
 *
 * **These recover the half `CATEGORY_ASSEMBLY.TERRAIN`'s terms had to give up.** The tiles-already-laid
 * reading cannot be weighted as a term without negating the subject, so the negative channel says only
 * the composed-view half — but a whole clause can hold both, because "laid together" is a relation
 * between tiles rather than a word standing in for one. Section 9's says "drawn already laid together"
 * for the reason `CATEGORY_AUDIT_TEXT`'s own TERRAIN line is qualified twice over: the audit is applied
 * tile by tile, and a check reading "no laid tiles" would fail the sheet on every tile section 4
 * requires.
 *
 * **Two of the three displaced wording this category already carried.** TERRAIN was the only category
 * whose assembly failure had reached the body before these forms existed, ad hoc:
 * `CATEGORY_EXCLUSION_TEXT` banned "any composed landscape, vista or diorama drawn in place of the
 * component grid" and `CATEGORY_AUDIT_TEXT` asked for "nothing drawn as a landscape view rather than as
 * a separate piece". Both clauses moved into these forms and their old homes gave them up in the same
 * change — one list saying one thing twice in two wordings is what these records are for removing.
 *
 * Both sheets take them, because both lay tiles: the blend set is nothing else, and the feature
 * library's elevation edge is tiles of the same ground with its features standing on them.
 */
const TERRAIN_ASSEMBLY_FAILURE: AssemblyFailure = {
  instruction:
    'Do not draw the tiles laid together, or a landscape composed from them, anywhere on the sheet, including as a reference or key.',
  exclusion:
    'The tiles laid together, and any landscape, vista or diorama composed from them in place of the component grid.',
  audit:
    'nothing on the sheet is a run of tiles drawn already laid together, or a landscape composed from them',
};

export const TERRAIN_BLEND_SET: SheetPlan = {
  name: 'Blend set',
  facings: 'run',
  assembly:
    'a continuous field of the base material with the second washing into it across any area — every straight boundary, every corner of both senses, and an isolated patch of either — with no seam where tiles meet and nothing a viewer can recognise twice.',
  targetQuantity: 'COMPONENT',
  // Every tile is a different tile: the variants differ in scatter, the transitions in which edge they carry.
  posing: 'UNSTATED',
  // A blend set's tiles are all one size by construction, so the agreement shape is the honest one
  // here: what can still go wrong is the scatter grain changing between a base tile and a
  // transition, which reads as two materials drawn at two scales.
  scaleExample:
    'one base material tile and the transition tile beside it are drawn at the same size, their surface scatter at one grain throughout',
  scaleUnit: 'one ground tile',
  // A ground tile and nothing else: the landform pieces are the feature library's (issue #278).
  componentClass: 'a ground tile',
  assemblyFailure: TERRAIN_ASSEMBLY_FAILURE,
  groups: [
    {
      heading: null,
      // The sentence names the transitions and stops there. Naming the variants too would have this
      // group promise entries the plan no longer holds for a subject that declined the scatter —
      // the group below it is dropped, this one is not, and section 4 would then open by ordering
      // something section 1 had just said the subject has none of. The transitions are on every
      // blend set whatever the reader chose, so they are safe to point at from here.
      intro: `The ${spellNumber(MATERIAL_ENTRIES.length)} materials the set joins, one tile each. These are the primaries the transition
set below is drawn against, so the material in each is what the rest of the sheet matches:`,
      entries: MATERIAL_ENTRIES,
    },
    {
      heading: 'Repeat-breaking variants',
      intro: `The ${spellNumber(componentTotal(SCATTER_VARIANT_ENTRIES))} tiles that carry the subject’s scatter layer — the pebbles, tufts and drift that keep a
field of one material from reading as a single tile stamped in rows. Each is its own primary above
redrawn: the material underneath is identical, so they differ in what is scattered across them and in
nothing else, and any one of them may stand in for its primary wherever the autotiler places it:`,
      entries: SCATTER_VARIANT_ENTRIES,
    },
    {
      heading: 'Transition set',
      intro: `${spellNumberCapitalised(TRANSITION_TILE_COUNT)} tiles carrying the boundary between the two, which with the *primary* tile of each material
above complete the ${spellNumber(TRANSITION_TILE_COUNT + MATERIAL_ENTRIES.length)} an autotiler indexes. Each is that same boundary at a different position
in the tile, never a different boundary:`,
      entries: TRANSITION_ENTRIES,
      outro: `Seamlessness here is an agreement about *edges*, not a property any one tile has on its own: each tile
edge carries either the base material or the second, drawn to the same profile every time it appears,
so two tiles whose facing edges carry the same material meet without a join. The ${spellNumber(MATERIAL_ENTRIES.length)} pure tiles
therefore repeat against themselves on both axes, and every transition meets whichever neighbours its
own edges allow — which is what the autotiler is choosing between. No tile carries a landmark — a
distinctive rock, a bright tuft, a crack that reads as a line — that a viewer could pick out twice
across a laid field.`,
    },
  ],
};

export const TERRAIN_FEATURE_LIBRARY: SheetPlan = {
  name: 'Feature library',
  facings: 'run',
  assembly:
    'a stretch of ground standing one level above the field around it — its lip, its face, both corner senses and the foot where the face lands — with the standing features and openings placed on either level.',
  targetQuantity: 'COMPONENT',
  // The ×2 and ×3 entries are distinct pieces — a straight run and one that breaks the line, a full
  // drop and a half-height ledge, three sizes of boulder — not one piece at several positions.
  posing: 'UNSTATED',
  // The one TERRAIN sheet that does hold a pair: the loose features stand on the elevation edge,
  // and a boulder larger than the lip it sits on is the failure this example names.
  scaleExample: 'a boulder drawn beside the lip it stands on is in proportion to it',
  // The blend set's unit, although this sheet draws a lip, a face and a foot rather than a flat tile:
  // each of those is a tile of the same ground, and the boulder above is placed on one.
  scaleUnit: 'one ground tile',
  componentClass: 'a ground tile or a landform piece',
  assemblyFailure: TERRAIN_ASSEMBLY_FAILURE,
  groups: [
    {
      heading: 'Elevation edge',
      intro: `A cliff is a change in height rather than in material, so a blend set has no way to express it: a
flat field has nowhere to put an exposed face. These are the pieces that give the field an upper
level, and they repeat along a run the way the blend set’s tiles do.`,
      entries: [
        {
          label: 'lip',
          parts: ['lip-straight', 'lip-broken'],
          text: 'Lip ×2: a straight run, and a variant that breaks the line',
          count: 2,
          kind: 'tile',
        },
        {
          label: 'exposed-face',
          parts: ['exposed-face-full-drop', 'exposed-face-half-height'],
          text: 'Exposed face ×2: one full drop, one half-height ledge',
          count: 2,
          kind: 'tile',
        },
        {
          label: 'lip-corners',
          parts: ['lip-corner-convex', 'lip-corner-concave'],
          text: 'Lip corners ×2: one convex, one concave',
          count: 2,
          kind: 'tile',
        },
        {
          label: 'foot-strip',
          text: 'Foot strip ×1, where the face lands on the field below',
          count: 1,
          kind: 'tile',
        },
      ],
      outro: `The lip, the face and the foot stack into one edge and repeat along it, so each matches its
neighbours left and right and the three meet without a step where they stack.`,
    },
    {
      heading: 'Standing features',
      intro: 'Placed once rather than tiled, and the only pieces in the set allowed to be distinctive:',
      entries: [
        {
          label: 'focal-feature',
          text: 'Focal feature ×1 — the one piece the field is composed around',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'boulder-or-outcrop',
          parts: ['boulder-large', 'boulder-medium', 'boulder-small'],
          text: 'Boulder or outcrop ×3: large, medium and small',
          count: 3,
          kind: 'structure',
        },
        {
          label: 'rooted-feature',
          text: 'Rooted feature ×2: what the ground has grown or heaved up',
          count: 2,
          kind: 'structure',
        },
        { label: 'debris-or-spoil-heap', text: 'Debris or spoil heap ×1', count: 1, kind: 'structure' },
      ],
    },
    {
      heading: 'Ground openings',
      intro:
        'Where the field gives way rather than rises, each drawn with the ground it interrupts left clear:',
      entries: [
        {
          label: 'pit-and-rim',
          parts: ['pit', 'pit-rim'],
          text: 'Pit or sinkhole ×1, and its raised rim ×1',
          count: 2,
          kind: 'structure',
        },
        {
          label: 'fissure',
          parts: ['fissure-straight', 'fissure-branching'],
          text: 'Fissure ×2: one straight run, one branching',
          count: 2,
          kind: 'structure',
        },
      ],
    },
  ],
};
