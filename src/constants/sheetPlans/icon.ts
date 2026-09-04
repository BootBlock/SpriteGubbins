import type { ComponentEntry, SheetPlan } from '../../types/components.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { spellNumber, spellNumberCapitalised } from '../../utils/numberWords.ts';

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
 *
 * **The overlay library is unconditional, and the field that offered a way out of it no longer
 * does.** *Applied Overlay* used to open with `No Overlay`, which is what a reader who never touched
 * the control got: section 1 then stated the set carried no overlay while the nine entries below
 * ordered a disabled veil, a cooldown sweep, four tier marks and a flare, and section 4's closing
 * rule forbade dropping any of them. The other three categories that offered such a value answer it
 * by taking the entries away — see `ComponentEntry.drawsClothing` — and that answer is wrong here:
 * these thirteen components are the state and overlay half of the sheet, and a reader who left the
 * default alone would have lost a highlight, a selection and a disabled state they never declined.
 * So the value went instead, and the field now names the overlay the set is designed around rather
 * than promising that none is drawn. It is ITEM's resolution reached from the other side: there the
 * guidance promised a component no plan carried, here it promised the absence of components every
 * plan carries, and in both the inventory is the half that could not move.
 */

/**
 * The icons themselves, as one line drawing the whole family.
 *
 * Hoisted because two sentences on this sheet count it, and neither is beside it: its own group's
 * intro opens on the figure, and the state group's intro two groups down prices a redrawn state
 * against it — “costs one component here and twelve if it is redrawn”, which is an argument that
 * stops being true the moment the family grows and nothing carries the change down to it.
 */
const CORE_ICON_ENTRIES: readonly ComponentEntry[] = [
  {
    label: 'core-icon',
    text: 'Core icons ×12: twelve distinct subjects from the stated family, each drawn once',
    count: 12,
    kind: 'structure',
  },
];

const CORE_ICON_COUNT = componentTotal(CORE_ICON_ENTRIES);

export const ICON_SYMBOL_SET: SheetPlan = {
  name: 'Symbol set',
  facings: 'run',
  assembly:
    'a full grid of icons at one cell size — every member filling the same margin at the same visual weight, readable from its silhouette alone at the smallest size the game shows it, and swappable one for another without the grid changing character.',
  targetQuantity: 'COMPONENT',
  // The cooldown sweep is drawn at two stages, and the changed-state pair active and inactive.
  posing: 'PER_POSITION',
  scaleUnitFrame: 'CELL',
  groups: [
    {
      heading: null,
      intro: `${spellNumberCapitalised(CORE_ICON_COUNT)} members of the one family, each a different subject and none a restyling of another. They are
drawn as a set because what makes an icon grid work is the agreement between its members, not the
quality of any one of them:`,
      entries: CORE_ICON_ENTRIES,
      outro: `Every icon fills the same cell to the same margin, carries the same outline weight, and is lit from
the same direction — an icon that is heavier, larger or lit differently from the rest reads as
belonging to another pack, which is the failure this sheet has. No icon carries a letter, a numeral,
a stack count or a key name: those are drawn by the engine at runtime over the top of the sprite.`,
    },
    {
      heading: 'State pieces',
      intro: `Drawn once and applied by the engine over any icon above, rather than as greyed or brightened copies
of each of them. A state that is a treatment of the same drawing costs one component here and ${spellNumber(CORE_ICON_COUNT)}
if it is redrawn:`,
      entries: [
        {
          label: 'disabled-veil',
          text: 'Disabled veil ×1 — what is laid over an icon to read as unavailable',
          count: 1,
          kind: 'structure',
          drawsClothing: 'entirely',
        },
        {
          label: 'highlight-halo',
          text: 'Highlight halo ×1 — what marks the icon under the pointer',
          count: 1,
          kind: 'structure',
          drawsClothing: 'entirely',
        },
        {
          label: 'selected-ring',
          text: 'Selected ring ×1 — what marks the icon currently chosen',
          count: 1,
          kind: 'structure',
          drawsClothing: 'entirely',
        },
        {
          label: 'cooldown-sweep',
          parts: ['cooldown-sweep-quarter', 'cooldown-sweep-three-quarters'],
          text: 'Cooldown sweep ×2: a quarter elapsed, and three quarters',
          count: 2,
          kind: 'structure',
          drawsClothing: 'entirely',
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
          drawsClothing: 'entirely',
        },
        {
          label: 'rarity-glow',
          text: 'Rarity glow ×1 — the aura the highest tier carries',
          count: 1,
          kind: 'structure',
          drawsClothing: 'entirely',
        },
        {
          label: 'locked-mark',
          text: 'Locked mark ×1',
          count: 1,
          kind: 'structure',
          drawsClothing: 'entirely',
        },
        {
          label: 'new-item-flare',
          text: 'New item flare ×1',
          count: 1,
          kind: 'structure',
          drawsClothing: 'entirely',
        },
        {
          label: 'broken-overlay',
          text: 'Broken or damaged overlay ×1',
          count: 1,
          kind: 'structure',
          drawsClothing: 'entirely',
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
