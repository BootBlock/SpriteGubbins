import type { ComponentEntry, SheetPlan } from '../../types/components.ts';
import type { IconLook } from '../../types/iconRoster.ts';

/** What one look writes into the overlay sheet; the entries' labels, parts and counts never change. */
interface OverlayWording {
  readonly assembly: string;
  readonly scaleExample: string;
  readonly veil: string;
  readonly halo: string;
  readonly ring: string;
  readonly sweep: string;
  readonly rarityGlow: string;
  readonly marksIntro: string;
  /** The outro's opening sentence: where a piece sits in the cell of the icon it marks. */
  readonly placement: string;
}

/**
 * Each look's wording for the overlay sheet.
 *
 * **Over a full-bleed tile, the pieces that cover an icon are squares.** An MMORPG's action bar dims a
 * whole button, rings and lights its square edge, and sweeps its cooldown as a wedge clipped to that
 * square; the overlays have to be drawn that shape, or the engine lays a round halo over a square icon.
 * Over an isolated mark there is no square to follow, so the pieces follow the mark, as they always have.
 */
const WORDING: Readonly<Record<IconLook, OverlayWording>> = {
  FULL_BLEED_TILE: {
    assembly:
      'a library of state and overlay pieces at one tile size — each drawn to the square of one tile of the set, at that tile’s own weight, so the engine can lay any piece over any tile without either looking borrowed.',
    scaleExample:
      'one overlay piece and the overlay piece beside it are drawn to the same weight, each drawn to the square of one icon',
    veil: 'Disabled veil ×1 — a flat dark square the size of a whole tile, laid over an icon to read as unavailable',
    halo: 'Highlight halo ×1 — a glow running round the inside of the tile’s square edge, marking the icon under the pointer',
    ring: 'Selected ring ×1 — a square ring just inside the tile’s edge, marking the icon currently chosen',
    sweep:
      'Cooldown sweep ×2: a dark wedge clipped to the tile’s square and swept clockwise from the top edge — a quarter elapsed, and three quarters',
    rarityGlow: 'Rarity glow ×1 — the aura the highest tier carries, hugging the tile’s square edge',
    marksIntro: `Small pieces laid over a finished tile to say something about it. Each is drawn within a square
the size of one tile and clear of any icon, so it can be placed on any of them:`,
    placement: `Every piece is drawn to the square of one tile, so it lands on the tile it marks without being
scaled, and keeps clear of the middle of that square, where the subject sits, wherever it can — a mark
that covers the thing it is describing tells the player nothing about which icon they are looking at.`,
  },
  ISOLATED_MARK: {
    assembly:
      'a library of state and overlay pieces at one cell size — each drawn to sit over any icon of the set at that icon’s own margin and weight, so the engine can lay any piece over any icon without either looking borrowed.',
    scaleExample:
      'one overlay piece and the overlay piece beside it are drawn to the same weight, each sitting in a cell the size of one icon',
    veil: 'Disabled veil ×1 — what is laid over an icon to read as unavailable',
    halo: 'Highlight halo ×1 — what marks the icon under the pointer',
    ring: 'Selected ring ×1 — what marks the icon currently chosen',
    sweep: 'Cooldown sweep ×2: a quarter elapsed, and three quarters',
    rarityGlow: 'Rarity glow ×1 — the aura the highest tier carries',
    marksIntro: `Small pieces laid over a finished icon to say something about it. Each is drawn clear of any icon, so
it can be placed on any of them:`,
    placement: `An overlay is drawn to sit inside the same cell as the icon it marks, clear of the icon’s own
silhouette wherever it can be — a mark that covers the thing it is describing tells the player
nothing about which icon they are looking at.`,
  },
};

/**
 * The first sheet of every ICON series, once per look: the state and overlay pieces the engine lays over
 * any icon of the set, drawn once for the whole set.
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
 * **One plan per look, and the same slots under both.** The entries, labels, parts and counts do not
 * change with the look, so a manifest names the same files whichever look the set takes; only the shape
 * each piece is drawn to does. Neither plan declares `backdrop`: a piece the engine lays over an icon has
 * to stay open around its own shape, or it hides the icon it marks.
 *
 * **Nothing here carries lettering**, for the reason `CATEGORY_EXCLUSION_TEXT` gives: a stack count, a
 * cooldown and a keybind are drawn by the engine at runtime over the top of the sprite.
 */
export const ICON_OVERLAY_PLANS: Readonly<Record<IconLook, SheetPlan>> = {
  FULL_BLEED_TILE: overlaySheet(WORDING.FULL_BLEED_TILE),
  ISOLATED_MARK: overlaySheet(WORDING.ISOLATED_MARK),
};

function overlaySheet(wording: OverlayWording): SheetPlan {
  return {
    name: 'Overlay pieces',
    facings: 'run',
    assembly: wording.assembly,
    targetQuantity: 'COMPONENT',
    extent: 'WHOLE',
    // The cooldown sweep is drawn at two stages.
    posing: 'PER_POSITION',
    // The agreement shape: these pieces are not parts of one another, so what has to hold is that no
    // piece arrives at half the weight of the one beside it.
    scaleExample: wording.scaleExample,
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
          overlay('disabled-veil', wording.veil),
          overlay('highlight-halo', wording.halo),
          overlay('selected-ring', wording.ring),
          {
            ...overlay('cooldown-sweep', wording.sweep, 2),
            parts: ['cooldown-sweep-quarter', 'cooldown-sweep-three-quarters'],
          },
        ],
      },
      {
        heading: 'Tier and overlay marks',
        intro: wording.marksIntro,
        entries: [
          overlay('tier-mark', 'Tier marks ×4: one per rarity step above the common one', 4),
          overlay('rarity-glow', wording.rarityGlow),
          overlay('locked-mark', 'Locked mark ×1'),
          overlay('new-item-flare', 'New item flare ×1'),
          overlay('broken-overlay', 'Broken or damaged overlay ×1'),
          {
            label: 'empty-mark',
            text: 'Empty or absent mark ×1 — what is shown where the set has nothing to show',
            count: 1,
            kind: 'structure',
          },
        ],
        outro: `${wording.placement}
No piece carries a letter, a numeral, a stack count or a key name: those are drawn by the engine at
runtime over the top of the sprite.`,
      },
    ],
  };
}

/** One overlay piece, which draws the *Applied Overlay* the sheet is built around. */
function overlay(label: string, text: string, count = 1): ComponentEntry {
  return { label, text, count, kind: 'structure', attribute: { field: 'clothing', role: 'DRAWS_IT' } };
}
