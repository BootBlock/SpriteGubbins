import type { SheetPlan } from '../../types/components.ts';

/**
 * What a BACKGROUND sheet asks for, per sheet mode.
 *
 * **Two of the four modes are declined, and the absences are the answer.** A backdrop is a plane
 * standing at a distance the player never reaches: it has no far side, so `CORE_DIRECTIONAL_VARIANTS`
 * would draw the same plane five times, and it has no joints, so `CUTOUT_RIG_SINGLE_DIRECTION` has
 * nothing to cap. What remains are the two shapes a background is genuinely delivered in, and they
 * are the two halves of the same question: does it scroll for ever, or does it fit the screen once.
 *
 * **The parallax set is a tile set in the strict sense**, which is why it lands on `TILESET_MODULAR`
 * rather than needing a mode of its own — each band butts against its own copy along the scroll axis
 * and must show no join where it does. What it is *not* is BUILDING's kind of tile set: nothing here
 * repeats on two axes, nothing here is walked on, and the pieces are stacked front to back rather
 * than laid edge to edge. The vocabulary below is this category's own for that reason.
 *
 * **It is also this category's default**, because the parallax band is what "a background" means as
 * a deliverable far more often than a single painted panel does. The layer library is the answer for
 * the screens that do not scroll — a title card, a cutscene backdrop, a boss chamber — where the
 * repeat length is irrelevant and what is wanted instead is one panel plus the loose pieces that
 * dress it.
 *
 * **The landmark rule is why the loose pieces exist at all.** A band meant to repeat can carry
 * nothing a player would recognise twice, which rules out exactly the things that make scenery
 * memorable — a castle, a wreck, a great tree. Drawing those as separate pieces placed once is what
 * lets a repeating field hold a landmark without the landmark repeating with it, and it is the same
 * split `TERRAIN_FEATURE_LIBRARY` makes between its tiled edge and its focal outcrop.
 */

export const BACKGROUND_PARALLAX_SET: SheetPlan = {
  name: 'Parallax set',
  facings: 'run',
  assembly:
    'a scene of any width scrolling behind the playfield — each band looping against its own copy with no visible join, the bands stacked front to back with no gap showing between them, and the loose pieces placed over whichever band they belong to.',
  targetQuantity: 'COMPONENT',
  // The cell, and this plan is why the frame is the sheet's answer rather than the category's. Its
  // `Depth bands` group draws nine bands, so nine copies of the scale unit are on the page — and a
  // share of the *sheet* height is a rule the component count then contradicts, which is what left
  // this entry settled by the lesser of two wrong answers until issue #216. A share of a band's own
  // cell cannot be contradicted that way: cells tile the page by construction, so N of them spend
  // the same fraction of it whatever N is.
  //
  // It is also the only frame a band can be stated in at all. A cell is `SHEET_CELL_PITCH` times its
  // component on each axis, so it carries that component's aspect — where turning a share of the
  // sheet into an area needs the unit to be about as square as the page, and a band is full-bleed
  // wide and short by definition.
  scaleUnitFrame: 'CELL',
  groups: [
    {
      heading: 'Depth bands',
      intro: `One band per depth tier, each drawn to loop along the scroll axis. They are drawn as a set rather
than one at a time because their palettes have to agree: each band further back is pulled closer to
the sky’s own value, and a band drawn in isolation arrives at full contrast and sits in front of the
one it is meant to be behind.`,
      entries: [
        {
          label: 'sky-plane',
          text: 'Sky plane ×1 — the furthest band, unbroken and fixed',
          count: 1,
          kind: 'tile',
        },
        {
          label: 'far-band',
          text: 'Far band ×2: the primary, and one variant differing only in its profile',
          count: 2,
          kind: 'tile',
        },
        {
          label: 'mid-band',
          text: 'Mid band ×2: the primary, and one variant',
          count: 2,
          kind: 'tile',
        },
        {
          label: 'near-band',
          text: 'Near band ×2: the primary, and one variant',
          count: 2,
          kind: 'tile',
        },
        {
          label: 'foreground-strip',
          text: 'Foreground strip ×1 — the band that passes in front of the playfield',
          count: 1,
          kind: 'tile',
        },
        {
          label: 'ground-meeting-strip',
          text: 'Ground meeting strip ×1, where the nearest band lands on the playfield',
          count: 1,
          kind: 'tile',
        },
      ],
      outro: `Looping here is an agreement a band makes with itself: its left edge and its right edge carry the
same profile, the same materials and the same values at the same heights, so a run of any length
shows no join. Nothing on a band is distinctive enough to be recognised a second time — no landmark,
no bright single mark, no shape that reads as a signature — because a player who spots one will spot
it on every screen. Each band is also full-bleed top and bottom within its own strip: a band that
stops short leaves a gap the sky shows through when it is scrolled against the next.`,
    },
    {
      heading: 'Loose pieces',
      intro: `Placed once rather than looped, and the only pieces in the set allowed to be distinctive. Each is
drawn clear of any band so it can be laid over whichever one it belongs to and scrolled at that
band’s own rate:`,
      entries: [
        {
          label: 'focal-landmark',
          text: 'Focal landmark ×1 — the one piece the scene is composed around',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'cloud-wisp',
          parts: ['cloud-wisp-large', 'cloud-wisp-medium', 'cloud-wisp-small'],
          text: 'Cloud or drift wisp ×3: large, medium and small',
          count: 3,
          kind: 'structure',
        },
        // No `parts`, and the sibling above it has them: `large, medium and small` assigns a
        // description to each of three pieces, where `a mast, a chimney, a snag` illustrates what
        // sort of shape is wanted. Naming these three would fix an order the prompt never asked the
        // generator for, which is what `ComponentEntry.parts` forbids.
        {
          label: 'silhouette-detail',
          text: 'Silhouette detail ×3: the small shapes that break a band’s outline — a mast, a chimney, a snag',
          count: 3,
          kind: 'structure',
        },
      ],
    },
    {
      heading: 'Atmosphere',
      intro: 'Drawn as its own layer so the engine can fade it or scroll it apart from the bands beneath:',
      entries: [
        {
          label: 'atmosphere-veil',
          text: 'Atmosphere veil ×1 — the fog, rain or haze the scene is seen through',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'light-shaft',
          parts: ['light-shaft-broad', 'light-shaft-narrow'],
          text: 'Light shaft ×2: one broad, one narrow',
          count: 2,
          kind: 'structure',
        },
        {
          label: 'drifting-particle',
          parts: ['drifting-particle-near', 'drifting-particle-far'],
          text: 'Drifting particle ×2: one near, one far',
          count: 2,
          kind: 'structure',
        },
      ],
    },
  ],
};

export const BACKGROUND_LAYER_LIBRARY: SheetPlan = {
  name: 'Layer library',
  facings: 'run',
  assembly:
    'one finished backdrop at screen size, with the dressing pieces placed over it and the edge pieces closing the frame at either side — nothing repeating, and nothing the player could mistake for something they can stand on.',
  // The one library on this side of the line whose whole is a screen rather than a subject. Its
  // entries run from a full-width sky to a piece of ground clutter, so there is no one component
  // size to state — and the assembly above names a definite one, the backdrop at screen size, which
  // is what a reader typing `640 × 360 px` here is describing. The parallax set above answers
  // `'COMPONENT'` instead: a band loops against its own copy, so the scene it builds has no width.
  targetQuantity: 'ASSEMBLED',
  // The sheet, where the parallax set above takes the cell, and the pair is the split that made the
  // frame per sheet. No band is drawn here — the scene panel is a sky plane, three masses and two
  // edge occluders, with dressing and atmosphere over them, and the assembly sentence says outright
  // that nothing repeats — so there is no cell in this grid for one to be a share of. Claiming one
  // would state a rule for a component the page does not hold, one line above the target-size line
  // saying no component is the assembled size.
  scaleUnitFrame: 'SHEET',
  groups: [
    {
      heading: 'Scene panel',
      intro: `The panel itself, cut into the few pieces a non-scrolling backdrop is actually rebuilt from. A screen
that never scrolls still wants its distance separated, because a camera that pans even slightly needs
the far mass to move less than the near one:`,
      entries: [
        {
          label: 'sky-and-horizon',
          text: 'Sky and horizon ×1 — the full width, with nothing standing on it',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'far-mass',
          text: 'Far mass ×1 — the distant profile that stands against the sky',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'mid-mass',
          parts: ['mid-mass-left', 'mid-mass-right'],
          text: 'Mid mass ×2: the left half of the scene, and the right',
          count: 2,
          kind: 'structure',
        },
        {
          label: 'edge-occluder',
          parts: ['edge-occluder-left', 'edge-occluder-right'],
          text: 'Edge occluder ×2: the piece closing the left of the frame, and the right',
          count: 2,
          kind: 'structure',
        },
      ],
      outro: `The pieces overlap where they meet rather than butting: a backdrop is stacked front to back, not laid
edge to edge, and a piece cut exactly to its neighbour shows a hairline the moment the camera moves.
Each is drawn full-height within its own bounds so nothing shows through beneath it.`,
    },
    {
      heading: 'Set dressing',
      intro: 'Placed once, over whichever mass they belong to, and drawn clear of it so they can be moved:',
      entries: [
        {
          label: 'focal-landmark',
          text: 'Focal landmark ×1 — the one piece the scene is composed around',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'standing-feature',
          parts: ['standing-feature-large', 'standing-feature-medium', 'standing-feature-small'],
          text: 'Standing feature ×3: large, medium and small — what the scene is furnished with',
          count: 3,
          kind: 'structure',
        },
        {
          label: 'hanging-feature',
          text: 'Hanging feature ×2: what comes down from above the frame',
          count: 2,
          kind: 'structure',
        },
        {
          label: 'ground-clutter',
          text: 'Ground clutter ×2: what lies at the foot of the scene',
          count: 2,
          kind: 'structure',
        },
      ],
    },
    {
      heading: 'Atmosphere',
      entries: [
        {
          label: 'atmosphere-veil',
          text: 'Atmosphere veil ×1 — the fog, rain or haze the scene is seen through',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'light-shaft',
          parts: ['light-shaft-broad', 'light-shaft-narrow'],
          text: 'Light shaft ×2: one broad, one narrow',
          count: 2,
          kind: 'structure',
        },
        {
          label: 'drifting-particle',
          parts: ['drifting-particle-near', 'drifting-particle-far'],
          text: 'Drifting particle ×2: one near, one far',
          count: 2,
          kind: 'structure',
        },
      ],
    },
  ],
};
