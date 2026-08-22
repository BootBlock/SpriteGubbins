/**
 * What the anti-aliasing panel says about what the pass is doing to this sheet, keyed to the state
 * it is in.
 *
 * Filed here rather than in `constants/tooltips/` for the reason `SYMMETRY_GUIDANCE` is filed beside
 * the segmentation it describes: these paragraphs describe the state of the reader's own sheet,
 * where a *control's* guidance describes the control. The panel's five controls each have their own
 * entry in `QUANTISE_TOOLTIPS`.
 *
 * None of them names a dial position. The controls are on screen directly above the paragraph, so a
 * second statement of where they stand would be one more place for the two to disagree.
 */
export const ANTI_ALIAS_GUIDANCE = {
  /**
   * The pass is not running, which is how the tab opens.
   *
   * The paragraph a first-time reader meets, so it has to say what the control is *for* before
   * anyone turns it on — and say plainly that a hard edge is a legitimate finished result rather
   * than a fault this is here to repair.
   */
  off: 'Every pass above this one works to turn a smooth resampled render back into flat pixels, and what that leaves is contours made entirely of square steps. On a shallow slope those steps read as a staircase rather than as a line. This softens them the way a pixel artist does by hand: it works out where the intended edge really ran, measures how much of each pixel it covered, and writes that much of the colour across. A great deal of pixel art is meant to have hard edges, and the prompts this app writes ask for exactly that — so nothing happens here until you ask for it.',

  /** `INTERIOR` — colour boundaries inside a sprite, and no alpha touched. */
  interior:
    'The colour boundaries inside each sprite are being softened, and the outer edge is not. Nothing that was clear gains coverage and nothing solid is cleared, so every silhouette on the sheet is exactly where it was: the sprite bounds, the atlas cell each one needs and everything measured off them are unchanged, and the colour count holds wherever the blends are kept to the palette. This is the safer half of the pass, because how a soft outer edge reads depends on the background a sprite ends up on, and the sheet does not contain it.',

  /** `SILHOUETTE` — the outer edge alone, written into alpha. */
  silhouette:
    'The outer edge of each sprite is being softened, and the colour boundaries inside are not. Softening an edge against nothing means writing partial transparency, so those pixels are part solid and part clear — which does move the sprite bounds outwards by a pixel wherever a fringe was added, and the panels above are reading the sheet as it now stands. The colour count rises with them, because a shade at a new coverage counts as its own colour however the blends are kept to the palette; past a few hundred of them a PNG or an Aseprite file can no longer carry a palette at all and is written with its colours in full instead. It looks its best over the background you drew it for, and can look like a halo over one you did not.',

  /** `BOTH` — the two together. */
  both: 'The colour boundaries inside each sprite and the outer edges of them are both being softened. That is the fullest form of the pass and the one furthest from the flat result the passes above produce, so it is worth looking at the sheet at 1:1 rather than magnified — anti-aliasing is judged at the size the artwork will actually be seen at, and a fringe that looks careful at 8× can read as a blur at 1×. The outer edge brings what the position above describes with it: soft bounds, a higher colour count, and a download that may carry its colours in full rather than as a palette.',

  /**
   * A blend may be any colour, because no colour setting is constraining the sheet.
   *
   * Its own paragraph rather than a clause on the three above, because it is the one state in which
   * the Blended shades control is not on screen — so without it the panel would simply be missing a
   * control a reader had seen there before, with nothing saying why.
   */
  unconstrained:
    'No colour setting is constraining this sheet, so each blended pixel is written as the mixture it works out to and the sheet gains the shades that produces. Pin a palette or set a colour budget in the studio and a further control appears here, offering to keep every blend to the colours the sheet already holds.',
} as const;
