import type { SheetPlan } from '../../types/components.ts';

/**
 * The first sheet of every ICON series: the state and overlay pieces the engine lays over any icon of the
 * set, drawn once for the whole set.
 *
 * **Its own sheet, once per set, and first.** The pieces used to share a sheet with twelve icons, which
 * capped a set at twelve and spent a third of every grid on pieces that do not change between grids. The
 * maintainer asked for them once per set, so they are a sheet of their own, and it opens the series
 * because a run series draws the reader's *Extra Overlay Pieces* on its first sheet only
 * (`anatomyFacingsFor`) — the overlay library is where those belong.
 *
 * **The state pieces are pieces rather than redrawn icons**, and that is the distinction worth holding:
 * a disabled icon is the same drawing under a veil the engine applies, so the veil is what the set owes,
 * and a greyed copy of every icon is not. An icon whose second state genuinely differs in shape — a sound
 * toggle, a ready check — is a catalogue entry with two `states`, drawn as a pair on an icon sheet.
 *
 * **Unconditional, and *Applied Overlay* steers it rather than declining it.** The other categories whose
 * `clothing` names a separate piece answer a reader who wants none by taking the entries away; these
 * pieces are the overlay library itself, so a reader who left the field alone would lose a highlight and
 * a disabled state they never declined. So the field offers no “none”.
 *
 * **Nothing here carries lettering**, for the reason `CATEGORY_EXCLUSION_TEXT` gives: a stack count, a
 * cooldown and a keybind are drawn by the engine at runtime over the top of the sprite.
 */
export const ICON_OVERLAY_SHEET: SheetPlan = {
  name: 'Overlay pieces',
  facings: 'run',
  assembly:
    'a library of state and overlay pieces at one cell size — each drawn to sit over any icon of the set at that icon’s own margin and weight, so the engine can lay any piece over any icon without either looking borrowed.',
  targetQuantity: 'COMPONENT',
  extent: 'WHOLE',
  // The cooldown sweep is drawn at two stages.
  posing: 'PER_POSITION',
  // The agreement shape: these pieces are not parts of one another, so what has to hold is that no piece
  // arrives at half the weight of the one beside it.
  scaleExample:
    'one overlay piece and the overlay piece beside it are drawn to the same weight, each sitting in a cell the size of one icon',
  scaleUnit: 'one icon',
  componentClass: 'one overlay piece the engine lays over an icon of this one set',
  assemblyFailure: {
    instruction:
      'Do not draw any piece already laid over an icon, or the pieces placed on a hotbar or a finished screen, anywhere on the sheet, including as a reference or key.',
    exclusion:
      'Any overlay piece shown laid over an icon or placed on a hotbar or other finished screen, and any picture of the pieces in use.',
    audit:
      'no piece arrives already laid over an icon, and nothing on the sheet is a hotbar or a finished screen',
  },
  groups: [
    {
      heading: 'State pieces',
      intro: `Drawn once and applied by the engine over any icon of the set, rather than as greyed or brightened
copies of each of them:`,
      entries: [
        {
          label: 'disabled-veil',
          text: 'Disabled veil ×1 — what is laid over an icon to read as unavailable',
          count: 1,
          kind: 'structure',
          attribute: { field: 'clothing', role: 'DRAWS_IT' },
        },
        {
          label: 'highlight-halo',
          text: 'Highlight halo ×1 — what marks the icon under the pointer',
          count: 1,
          kind: 'structure',
          attribute: { field: 'clothing', role: 'DRAWS_IT' },
        },
        {
          label: 'selected-ring',
          text: 'Selected ring ×1 — what marks the icon currently chosen',
          count: 1,
          kind: 'structure',
          attribute: { field: 'clothing', role: 'DRAWS_IT' },
        },
        {
          label: 'cooldown-sweep',
          parts: ['cooldown-sweep-quarter', 'cooldown-sweep-three-quarters'],
          text: 'Cooldown sweep ×2: a quarter elapsed, and three quarters',
          count: 2,
          kind: 'structure',
          attribute: { field: 'clothing', role: 'DRAWS_IT' },
        },
      ],
    },
    {
      heading: 'Tier and overlay marks',
      intro: `Small pieces laid over a finished icon to say something about it. Each is drawn clear of any icon, so
it can be placed on any of them:`,
      entries: [
        {
          label: 'tier-mark',
          text: 'Tier marks ×4: one per rarity step above the common one',
          count: 4,
          kind: 'structure',
          attribute: { field: 'clothing', role: 'DRAWS_IT' },
        },
        {
          label: 'rarity-glow',
          text: 'Rarity glow ×1 — the aura the highest tier carries',
          count: 1,
          kind: 'structure',
          attribute: { field: 'clothing', role: 'DRAWS_IT' },
        },
        {
          label: 'locked-mark',
          text: 'Locked mark ×1',
          count: 1,
          kind: 'structure',
          attribute: { field: 'clothing', role: 'DRAWS_IT' },
        },
        {
          label: 'new-item-flare',
          text: 'New item flare ×1',
          count: 1,
          kind: 'structure',
          attribute: { field: 'clothing', role: 'DRAWS_IT' },
        },
        {
          label: 'broken-overlay',
          text: 'Broken or damaged overlay ×1',
          count: 1,
          kind: 'structure',
          attribute: { field: 'clothing', role: 'DRAWS_IT' },
        },
        {
          label: 'empty-mark',
          text: 'Empty or absent mark ×1 — what is shown where the set has nothing to show',
          count: 1,
          kind: 'structure',
        },
      ],
      outro: `An overlay is drawn to sit inside the same cell as the icon it marks, clear of the icon’s own
silhouette wherever it can be — a mark that covers the thing it is describing tells the player
nothing about which icon they are looking at. No piece carries a letter, a numeral, a stack count or a
key name: those are drawn by the engine at runtime over the top of the sprite.`,
    },
  ],
};
