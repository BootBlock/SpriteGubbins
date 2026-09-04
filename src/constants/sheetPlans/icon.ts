import type { SheetPlan } from '../../types/components.ts';

/**
 * What an ICON sheet asks for.
 *
 * **One mode, and the other three are declined.** An icon is a mark drawn into a fixed cell: it has
 * no yaw to be turned to, so `CORE_DIRECTIONAL_VARIANTS` would return five drawings of one flat
 * symbol; it has no joints, so `CUTOUT_RIG_SINGLE_DIRECTION` has nothing to cap; and it never butts
 * against a copy of itself, so `TILESET_MODULAR` describes something an icon grid deliberately is
 * not — the cells sit apart with clear margin between them, which is the whole point of the padding.
 *
 * **The axis that earns a sheet here is the set itself.** A single icon is not a deliverable; a
 * *family* is, and the reason to generate one in a single pass is that the only thing holding an
 * icon grid together is agreement between its members about weight, margin, outline and light. A
 * generator asked for twelve icons one at a time returns twelve competent icons from twelve
 * different packs, which is this sheet's characteristic failure and what the outro is written
 * against.
 *
 * **The state and overlay groups are separate pieces rather than redrawn icons**, and that is the
 * distinction worth holding: a disabled icon is the same drawing under a veil the engine applies, so
 * the veil is what the sheet owes and twelve greyed copies are not. The one exception is the pair —
 * an icon whose disabled state genuinely differs in shape, a lit torch against an unlit one — and
 * the entry for it says so.
 *
 * **Nothing here carries lettering**, and the sheet says it twice for the reason
 * `CATEGORY_EXCLUSION_TEXT` gives: a stack count, a cooldown and a keybind are drawn by the engine at
 * runtime over the top of the sprite, and every real icon appears to carry them.
 */

export const ICON_SYMBOL_SET: SheetPlan = {
  name: 'Symbol set',
  facings: 'run',
  assembly:
    'a full grid of icons at one cell size — every member filling the same margin at the same visual weight, readable from its silhouette alone at the smallest size the game shows it, and swappable one for another without the grid changing character.',
  targetQuantity: 'COMPONENT',
  scaleUnitFrame: 'CELL',
  groups: [
    {
      heading: null,
      intro: `Twelve members of the one family, each a different subject and none a restyling of another. They are
drawn as a set because what makes an icon grid work is the agreement between its members, not the
quality of any one of them:`,
      entries: [
        {
          label: 'core-icon',
          text: 'Core icons ×12: twelve distinct subjects from the stated family, each drawn once',
          count: 12,
          kind: 'structure',
        },
      ],
      outro: `Every icon fills the same cell to the same margin, carries the same outline weight, and is lit from
the same direction — an icon that is heavier, larger or lit differently from the rest reads as
belonging to another pack, which is the failure this sheet has. No icon carries a letter, a numeral,
a stack count or a key name: those are drawn by the engine at runtime over the top of the sprite.`,
    },
    {
      heading: 'State pieces',
      intro: `Drawn once and applied by the engine over any icon above, rather than as greyed or brightened copies
of each of them. A state that is a treatment of the same drawing costs one component here and twelve
if it is redrawn:`,
      entries: [
        {
          label: 'disabled-veil',
          text: 'Disabled veil ×1 — what is laid over an icon to read as unavailable',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'highlight-halo',
          text: 'Highlight halo ×1 — what marks the icon under the pointer',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'selected-ring',
          text: 'Selected ring ×1 — what marks the icon currently chosen',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'cooldown-sweep',
          parts: ['cooldown-sweep-quarter', 'cooldown-sweep-three-quarters'],
          text: 'Cooldown sweep ×2: a quarter elapsed, and three quarters',
          count: 2,
          kind: 'structure',
        },
        {
          label: 'changed-state-pair',
          parts: ['changed-state-active', 'changed-state-inactive'],
          text: 'Changed-state pair ×2: one subject drawn active and inactive, where the state changes the shape rather than the treatment',
          count: 2,
          kind: 'structure',
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
        },
        {
          label: 'rarity-glow',
          text: 'Rarity glow ×1 — the aura the highest tier carries',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'locked-mark',
          text: 'Locked mark ×1',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'new-item-flare',
          text: 'New item flare ×1',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'broken-overlay',
          text: 'Broken or damaged overlay ×1',
          count: 1,
          kind: 'structure',
        },
        {
          label: 'empty-mark',
          text: 'Empty or absent mark ×1 — what is shown where the family has nothing to show',
          count: 1,
          kind: 'structure',
        },
      ],
      outro: `An overlay is drawn to sit inside the same cell as the icon it marks, clear of the icon’s own
silhouette wherever it can be — a mark that covers the thing it is describing tells the player
nothing about which icon they are looking at.`,
    },
  ],
};
