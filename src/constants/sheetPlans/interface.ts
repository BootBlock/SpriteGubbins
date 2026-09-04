import type { SheetPlan } from '../../types/components.ts';

/**
 * What an INTERFACE sheet asks for, per sheet mode.
 *
 * **Two of the four modes are declined, and the absence is the answer.** `CORE_DIRECTIONAL_VARIANTS`
 * draws one piece of geometry at five object yaws, and a button has no facings to turn to — the
 * sheet it would produce is five drawings of the same flat rectangle, and the directional
 * audit would then fail it for exactly that. `CUTOUT_RIG_SINGLE_DIRECTION` asks for rest-pose
 * segments carrying matched pivot caps at the joints they rotate about, which is a description of an
 * articulated limb rather than of a widget: a slider handle travels along a track and a bar fill
 * grows, and neither turns about a pivot. `Partial` in the plan table is what lets both stay unsaid
 * rather than be filled with something that fits badly.
 *
 * The two that remain are the two axes an interface atlas is actually built along. The state library
 * is the general one — every widget of a kit, each drawn once per interaction state it has — and the
 * nine-slice is the specific one, where the deliverable is a set of pieces that butt together and
 * repeat so the engine can resize a panel to any shape the screen needs.
 *
 * **A nine-slice is a tile set in the strict sense**, which is why it lands on `TILESET_MODULAR`
 * rather than needing a mode of its own: its corners are fixed, its edges tile along one axis, its
 * centre tiles along both, and "no visible join where pieces meet" is the same requirement a floor
 * field has. What it is *not* is an environment, so the pieces below carry the interface's own
 * vocabulary and none of BUILDING's — `sheetPlans.test.ts` checks that from the category's own
 * exclusions, which ban floors and walls here exactly as they do for the other five.
 */

export const INTERFACE_STATE_LIBRARY: SheetPlan = {
  name: 'State library',
  facings: 'run',
  assembly:
    'the complete interface in each state a player can put it in — a resting screen, a button under the pointer and again pressed, a bar part-filled, a toggle switched, a slot occupied — without redrawing any piece that does not change between them.',
  targetQuantity: 'COMPONENT',
  // A button body in four states, a toggle in three, a slider handle at rest and held.
  posing: 'PER_POSITION',
  // The sheet, although this is the one plan in the app that draws its own scale unit *and* takes
  // this frame. One panel frame is on the page among twenty-odd widgets, and one of anything cannot
  // argue with a count — so the shipped reading stays true here, and every other widget is drawn at
  // its share of that frame, which is the proportion section 0's example for this category names.
  // BACKGROUND's parallax set is the case this is not: nine bands, where the count does argue.
  scaleUnitFrame: 'SHEET',
  groups: [
    {
      heading: null,
      intro: 'One theme’s worth of widgets, with a separate component for each state a widget has:',
      entries: [
        // Four states rather than the three a button obviously has: `disabled` is the one every
        // generated kit omits and every real interface needs, because it is the only state that has
        // to read as unavailable while still reading as the same button.
        {
          label: 'button-body',
          parts: ['button-body-normal', 'button-body-hover', 'button-body-pressed', 'button-body-disabled'],
          text: 'Button body: normal, hover, pressed, disabled',
          count: 4,
          kind: 'structure',
        },
        { label: 'panel-or-window-frame', text: 'Panel or window frame ×1', count: 1, kind: 'structure' },
        {
          label: 'title-bar-or-header-strip',
          text: 'Title bar or header strip ×1',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'bar-track-and-fill',
          parts: ['bar-track', 'bar-fill'],
          text: 'Bar track ×1, bar fill ×1',
          count: 2,
          kind: 'structure',
        },
        {
          label: 'toggle-or-checkbox',
          parts: ['toggle-off', 'toggle-on', 'toggle-disabled'],
          text: 'Toggle or checkbox: off, on, disabled',
          count: 3,
          kind: 'structure',
        },
        {
          label: 'slider',
          parts: ['slider-track', 'slider-handle-rest', 'slider-handle-held'],
          text: 'Slider track ×1, slider handle: at rest, held',
          count: 3,
          kind: 'structure',
        },
        {
          label: 'icon-plate-or-slot',
          parts: ['icon-plate-empty', 'icon-plate-filled', 'icon-plate-highlighted'],
          text: 'Icon plate or slot: empty, filled, highlighted',
          count: 3,
          kind: 'structure',
        },
        {
          label: 'cursor',
          parts: ['cursor-pointing', 'cursor-held', 'cursor-refused'],
          text: 'Cursor: pointing, held, refused',
          count: 3,
          kind: 'structure',
        },
        // Split from the corner ornament below rather than bundled with it, because the pool this
        // category's `clothing` field offers includes `Plain Untrimmed Edge` — a reader who chooses
        // it has said the widget carries no trim, and a bundled line could only be dropped by
        // taking a divider rule and a resize grip with it. Neither of those is trim: a rule between
        // two sections and the grip a window is resized by are furniture the widget has whatever
        // its edge is treated with. See `ComponentEntry.drawsClothing`.
        {
          label: 'divider-and-grip',
          parts: ['divider-rule', 'resize-grip'],
          text: 'Divider rule ×1, scroll or resize grip ×1',
          count: 2,
          kind: 'structure',
        },
        {
          label: 'corner-ornament',
          text: 'Corner ornament ×1',
          count: 1,
          kind: 'structure',
          drawsClothing: 'entirely',
        },
      ],
      outro: `Every state of a widget is that same widget changed, never a second design of it: the silhouette,
the proportions and the position of every feature hold across its states, and only what the state
itself alters — the relief, the fill, the accent — is redrawn. A pressed button that is a different
shape from its resting one cannot be swapped for it at runtime.`,
    },
  ],
};

export const INTERFACE_NINE_SLICE: SheetPlan = {
  name: 'Nine-slice set',
  facings: 'run',
  assembly:
    'a panel at any width and height, a button at any width, and a divider run at any length — each of them with no visible join, no stretched corner and no seam where a repeat begins.',
  // Cut into corners, edges and a centre, and still a component size: what the nine assemble into is
  // “a panel at any width and height”, so there is no assembled figure for a reader to price.
  targetQuantity: 'COMPONENT',
  // The end caps and the stretching middle are each drawn again in the pressed state.
  posing: 'PER_POSITION',
  // The sheet, and here for the plainer of the two reasons: the panel frame is what these twenty
  // pieces *assemble into*, named as such by the assembly sentence above, so no cell in this grid
  // holds one. Pricing a corner's cell as a share of a panel frame would ask for a corner several
  // times its own size.
  scaleUnitFrame: 'SHEET',
  groups: [
    {
      heading: 'Panel nine-slice',
      intro: `The four corners are drawn at their finished size and never stretch; the four edges repeat along
their own run; the centre repeats in both directions. Each corner is drawn for the position it
occupies rather than one corner reused at four rotations, so trim that reads a particular way round
still does at every corner of the assembled panel.`,
      entries: [
        {
          label: 'frame-corners',
          parts: [
            'frame-corner-top-left',
            'frame-corner-top-right',
            'frame-corner-bottom-right',
            'frame-corner-bottom-left',
          ],
          text: 'Frame corners ×4: top-left, top-right, bottom-right, bottom-left',
          count: 4,
          kind: 'tile',
        },
        {
          label: 'frame-edges',
          parts: ['frame-edge-top', 'frame-edge-right', 'frame-edge-bottom', 'frame-edge-left'],
          text: 'Frame edges ×4: top, right, bottom, left',
          count: 4,
          kind: 'tile',
        },
        { label: 'frame-centre-fill', text: 'Frame centre fill ×1', count: 1, kind: 'tile' },
      ],
      outro: `Opposite ends of every repeating piece match, so a run of any length shows no join: an edge butts
against another copy of itself, and the centre fill butts against copies of itself on all four
sides. The two edges of a pair are also the same thickness as each other, and each corner is the
same thickness as the two edges it meets — a panel assembled from pieces that disagree steps at
every join.`,
    },
    {
      heading: 'Button three-slice',
      intro: `A button stretches on one axis only, so it takes two fixed end caps and a middle that repeats
between them. Both of its states are drawn, because a pressed button that is not the same width as
its resting one shifts on the screen when it is pressed.`,
      entries: [
        {
          label: 'button-end-caps',
          parts: ['button-end-cap-left', 'button-end-cap-right'],
          text: 'Button end caps ×2: left, right',
          count: 2,
          kind: 'tile',
        },
        { label: 'button-stretching-middle', text: 'Button stretching middle ×1', count: 1, kind: 'tile' },
        {
          label: 'pressed-button-end-caps',
          parts: ['pressed-button-end-cap-left', 'pressed-button-end-cap-right'],
          text: 'Pressed button end caps ×2: left, right',
          count: 2,
          kind: 'tile',
        },
        {
          label: 'pressed-button-stretching-middle',
          text: 'Pressed button stretching middle ×1',
          count: 1,
          kind: 'tile',
        },
      ],
    },
    {
      heading: 'Trim and joins',
      entries: [
        {
          label: 'divider-rail',
          parts: ['divider-rail-horizontal', 'divider-rail-vertical'],
          text: 'Divider rail: horizontal ×1, vertical ×1',
          count: 2,
          kind: 'tile',
        },
        {
          label: 'divider-end-caps',
          parts: ['divider-end-cap-start', 'divider-end-cap-end'],
          text: 'Divider end caps ×2: start, end',
          count: 2,
          kind: 'tile',
        },
        // Not a tile: an ornament is laid over a corner the frame has already drawn, so it neither
        // repeats nor has to butt against anything.
        {
          label: 'corner-ornament',
          text: 'Corner ornament ×1',
          count: 1,
          kind: 'structure',
          drawsClothing: 'entirely',
        },
      ],
    },
  ],
};
