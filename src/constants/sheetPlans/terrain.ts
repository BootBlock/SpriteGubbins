import type { SheetPlan } from '../../types/components.ts';

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
 * **The scatter layer is carried by the base tile's variants rather than by overlay components**, and
 * that is a constraint from the template rather than a preference: section 1 states that every
 * fitted, applied and worn attribute it lists is painted onto the component it sits on and never
 * drawn as a separate piece, naming the additional-anatomy field as the single exception. `clothing`
 * is *Scatter Layer* in this category, so six scatter overlays in section 4 would be a second
 * exception — and a sheet whose section 1 forbids what its section 4 requires is the contradiction
 * these per-category plans exist to remove. Variants are also the honest answer for a tile set: an
 * overlay decal that must never reach a tile edge is one more thing that can be recognised twice
 * across a field.
 */

export const TERRAIN_BLEND_SET: SheetPlan = {
  name: 'Blend set',
  facings: 'run',
  assembly:
    'a continuous field of the base material with the second washing into it across any area — every straight boundary, every corner of both senses, and an isolated patch of either — with no seam where tiles meet and nothing a viewer can recognise twice.',
  targetQuantity: 'COMPONENT',
  groups: [
    {
      heading: null,
      intro: `The two materials the set joins. The variants carry the subject’s scatter layer — the pebbles, tufts
and drift that keep a field of one material from reading as a single tile stamped in rows — so they
differ in what is scattered across them and in nothing else:`,
      entries: [
        {
          label: 'base-material-tile',
          text: 'Base material tile ×6: the primary, and five variants differing only in surface scatter',
          count: 6,
          kind: 'tile',
        },
        {
          label: 'second-material-tile',
          text: 'Second material tile ×3: the primary, and two variants',
          count: 3,
          kind: 'tile',
        },
      ],
    },
    {
      heading: 'Transition set',
      intro: `Fourteen tiles carrying the boundary between the two, which with the *primary* tile of each material
above complete the sixteen an autotiler indexes. Each is that same boundary at a different position
in the tile, never a different boundary:`,
      entries: [
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
      ],
      outro: `Seamlessness here is an agreement about *edges*, not a property any one tile has on its own: each tile
edge carries either the base material or the second, drawn to the same profile every time it appears,
so two tiles whose facing edges carry the same material meet without a join. The two pure tiles
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
