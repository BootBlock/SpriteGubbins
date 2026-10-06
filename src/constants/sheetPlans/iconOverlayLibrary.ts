import type { ComponentEntry, ComponentGroup } from '../../types/components.ts';
import type { IconLook } from '../../types/iconRoster.ts';

/** What one look writes into the overlay sheets; the entries' labels, parts and counts never change. */
interface OverlayWording {
  readonly assembly: string;
  readonly scaleExample: string;
  readonly veil: string;
  readonly halo: string;
  readonly ring: string;
  readonly sweep: string;
  readonly rarityGlow: string;
  readonly tierMarks: string;
  readonly marksIntro: string;
  /** Said after the grid and cell sentences every overlay sheet opens with: where a piece stands in its cell. */
  readonly placement: string;
}

/** One look's overlay library: its wording, its groups, and the labels of the pieces that edge a square. */
interface OverlayLibrary {
  readonly wording: OverlayWording;
  readonly groups: readonly ComponentGroup[];
  readonly framing: ReadonlySet<string>;
}

/** What a tier mark is, under both looks; each look then says where it sits and how large it is. */
const TIER_MARKS =
  'Tier marks ×4: one per rarity step above the common one, each made of its pips alone, one to four in order and set in a shape of their own — one pip, two side by side, three in a triangle, four in two rows of two — so a tier reads by its shape and its pip count and never by its colour alone';

/**
 * How far a tier mark reaches from its corner, and what overrules it: section 2's floors, where the
 * smallest display size needs the pips more room than the corner gives them.
 */
const TIER_MARK_REACH = 'a quarter';
const TIER_MARK_FLOOR = `where section [SEC:STYLE]’s narrowest strokes and gaps need more room than that, it takes the least room they need`;

/**
 * Each look's wording for the overlay sheets.
 *
 * **Over a full-bleed tile, the pieces that cover an icon are squares.** An MMORPG's action bar dims a
 * whole button, rings and lights its square edge, and sweeps its cooldown as a wedge clipped to that
 * square; the overlays have to be drawn that shape, or the engine lays a round halo over a square icon.
 * Over an isolated mark there is no square to follow, so the pieces follow the mark, as they always have.
 *
 * **Each piece stands where it sits over the icon, inside its cell** (`SheetPlan.placement`). The pieces
 * were once told to keep clear of the middle of a square that had no backdrop, so the Quantise tab cut
 * each to its own bounding box and centred it, and a corner mark lost its corner. Under both looks a
 * piece is drawn within the share of the cell section 2 states for every sheet of the set, where the icon
 * it marks sits in its own cell, so section 2's one square and this sentence never disagree. The looks
 * differ in what the Quantise tab maps onto the file: the tile square under the full-bleed look, as the
 * icons' *Fill square* cut does, and the whole cell under the isolated look, as their *Scale evenly* cut
 * does (`SheetPlan.placement`).
 */
const WORDING: Readonly<Record<IconLook, OverlayWording>> = {
  FULL_BLEED_TILE: {
    assembly:
      'a library of state and overlay pieces at one tile size — each drawn to the square of one tile of the set, at that tile’s own weight, so the engine can lay any piece over any tile without either looking borrowed.',
    scaleExample:
      'one overlay piece and the overlay piece beside it are drawn to the same weight, each drawn to the square of one icon',
    veil: 'Disabled veil ×1 — a flat dark square the size of a whole tile, laid over an icon to read as unavailable',
    halo: 'Highlight halo ×1 — a glow running round the inside of the tile’s square edge, marking the icon under the pointer',
    ring: 'Selected ring ×1 — a square ring whose outer edge is the tile’s edge, marking the icon currently chosen',
    sweep:
      'Cooldown sweep ×2: a dark wedge clipped to the tile’s square and swept clockwise from the top edge — a quarter elapsed, and three quarters',
    rarityGlow: 'Rarity glow ×1 — the aura the highest tier carries, hugging the tile’s square edge',
    tierMarks: `${TIER_MARKS}. Each sits in the bottom-left corner of the tile’s square, within ${TIER_MARK_REACH} of the square’s side each way; ${TIER_MARK_FLOOR}`,
    marksIntro: `Small pieces laid over a finished tile to say something about it. Each is drawn clear of any icon,
so it can be placed on any of them:`,
    placement: `Inside its cell, every piece is drawn within the tile square section [SEC:STYLE] states, centred in
the cell, and stands where it sits over the icon: a corner mark in its corner of that square, a ring
along its edge, a veil across the whole of it. Only the piece is drawn, never the square, so a
piece that covers less of the square leaves the rest of its cell empty, and it lands on the tile it
marks without being moved or scaled. A mark stands clear of the middle of the square, where the
subject sits, wherever it can — a mark that covers the thing it is describing tells the player
nothing about which icon they are looking at.`,
  },
  ISOLATED_MARK: {
    assembly:
      'a library of state and overlay pieces at one cell size — each drawn to sit over any icon of the set at that icon’s own margin and weight, so the engine can lay any piece over any icon without either looking borrowed.',
    scaleExample:
      'one overlay piece and the overlay piece beside it are drawn to the same weight, each sitting in a cell the size of one icon',
    veil: 'Disabled veil ×1 — a flat dark shape laid over an icon to read as unavailable',
    halo: 'Highlight halo ×1 — what marks the icon under the pointer',
    ring: 'Selected ring ×1 — what marks the icon currently chosen',
    sweep:
      'Cooldown sweep ×2: a dark wedge swept clockwise from the top — a quarter elapsed, and three quarters',
    rarityGlow: 'Rarity glow ×1 — the aura the highest tier carries',
    tierMarks: `${TIER_MARKS}. Each sits at the bottom-left corner of the place the icon takes, within ${TIER_MARK_REACH} of that place’s width across and ${TIER_MARK_REACH} of its height up; ${TIER_MARK_FLOOR}`,
    marksIntro: `Small pieces laid over a finished icon to say something about it. Each is drawn clear of any icon, so
it can be placed on any of them:`,
    placement: `Inside its cell, every piece is drawn within the share of the cell section [SEC:STYLE] states, centred
in the cell — the place an icon of this set takes in its own cell — and stands where it sits over
that icon: a corner mark at a corner of that place, a ring round it, a veil over it. Only the piece is
drawn, never the cell, so it lands in the icon’s cell without being moved or scaled. A mark stands
clear of the icon’s own silhouette wherever it can — a mark that covers the thing it is describing
tells the player nothing about which icon they are looking at.`,
  },
};

/**
 * The overlay library of an ICON set, once per look: the state and overlay pieces the engine lays over
 * any icon of the set, drawn once for the whole set on the overlay sheets that close its series
 * (`iconOverlaySheets`).
 *
 * **The state pieces are pieces rather than redrawn icons**, and that is the distinction worth holding:
 * a disabled icon is the same drawing under a veil the engine applies, so the veil is what the set owes,
 * and a greyed copy of every icon is not. An icon whose second state genuinely differs in shape — a sound
 * toggle, a ready check — is a catalogue entry with two `states`, drawn as a pair on an icon sheet.
 *
 * **Unconditional, and drawn in the *Overlay Style*.** The other categories whose `clothing` names a
 * separate piece answer a reader who wants none by taking the entries away; these pieces are the overlay
 * library itself, so a reader who left the field alone would lose a highlight and a disabled state they
 * never declined. So the field is the style every piece is drawn in rather than one piece of the library
 * (audit finding O1): each entry is `'DRAWN_IN_IT'`, section 1 says so, and it offers no “none”. A piece
 * the library lacks is the reader's to add in *Extra Overlay Pieces*, never a value of the style.
 *
 * **The tier marks are told apart by shape and by a count of pips, never by colour alone** (audit
 * finding M2), so a colour-blind player, and a set the engine tints, still reads each tier. A pip is a
 * dot rather than a numeral, which the lettering ban would remove.
 *
 * **A tier mark has a stated corner and a stated size.** Asked only for a shape carrying its pips, the
 * first real overlay sheet (`test_sprites/game_overlay_test.png`) drew the four marks as chains of
 * diamonds in the middle of their cells, the fourth 263 pixels across a 217-pixel tile, which Keep
 * place refuses rather than cut a pip from. So each look puts the mark in one corner, the bottom left,
 * makes it of its pips alone, their arrangement its shape, and holds it within a quarter of the side
 * each way, which keeps it out of the middle half of the square, where the subject sits. The sheet
 * drawn from this wording (`test_sprites/icons_fullbleed.png`) put all four marks inside the tile, in
 * its bottom-left corner, though the fourth reached seven tenths of the side rather than a quarter.
 *
 * **Section 2's floors overrule the quarter, and the line says so.** Shown at a display size, a pip is
 * an accent at least two displayed pixels wide, the gap beside it the same, and an outline one, so two
 * outlined pips and their gap span ten displayed pixels: 5/8 of the side at 16 × 16, a half at 20, and
 * within a quarter only from 40 up. A fixed fraction would contradict that floor at one display size or
 * another, so the line defers to it by name and takes the least room it needs, and only there does a
 * mark reach into the middle, as the placement sentence's "wherever it can" allows. Below ten displayed
 * pixels four pips cannot keep the floor anywhere in the square.
 *
 * **One library per look, and the same slots under both.** The entries, labels, parts and counts do not
 * change with the look, so a manifest names the same files whichever look the set takes; only the shape
 * each piece is drawn to does, and the square it stands in.
 *
 * `framing` names the pieces that are edges round a square — the halo, the ring and the glow — so a
 * sheet holding one declares `frames` (audit finding T2), and a sheet the cut leaves without one lets
 * Midjourney negate a frame as it does on an icon sheet.
 */
export const ICON_OVERLAY_LIBRARY: Readonly<Record<IconLook, OverlayLibrary>> = {
  FULL_BLEED_TILE: library(WORDING.FULL_BLEED_TILE),
  ISOLATED_MARK: library(WORDING.ISOLATED_MARK),
};

function library(wording: OverlayWording): OverlayLibrary {
  return {
    wording,
    framing: new Set(['highlight-halo', 'selected-ring', 'rarity-glow']),
    groups: [
      {
        heading: 'State pieces',
        intro: `Drawn once and applied by the engine over any icon of the set, rather than as greyed or brightened
copies of each of them:`,
        entries: [
          { ...overlay('disabled-veil', wording.veil), tile: 'MEASURES' },
          { ...overlay('highlight-halo', wording.halo), tile: 'SPANS' },
          { ...overlay('selected-ring', wording.ring), tile: 'SPANS' },
          {
            ...overlay('cooldown-sweep', wording.sweep, 2),
            parts: ['cooldown-sweep-quarter', 'cooldown-sweep-three-quarters'],
            // A quarter fills one quadrant, so it keeps its place; three quarters reach every edge.
            tile: [null, 'SPANS'],
          },
        ],
      },
      {
        heading: 'Tier and overlay marks',
        intro: wording.marksIntro,
        entries: [
          overlay('tier-mark', wording.tierMarks, 4),
          { ...overlay('rarity-glow', wording.rarityGlow), tile: 'SPANS' },
          overlay('locked-mark', 'Locked mark ×1'),
          overlay('new-item-flare', 'New item flare ×1'),
          overlay('broken-overlay', 'Broken or damaged overlay ×1'),
          overlay('empty-mark', 'Empty or absent mark ×1 — what is shown where the set has nothing to show'),
        ],
      },
    ],
  };
}

/** One overlay piece, drawn in the *Overlay Style* every piece of the library shares. */
function overlay(label: string, text: string, count = 1): ComponentEntry {
  return { label, text, count, kind: 'structure', attribute: { field: 'clothing', role: 'DRAWN_IN_IT' } };
}
