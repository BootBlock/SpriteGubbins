/**
 * How far the tile square measured on a placement sheet may sit from the share the prompt states before
 * the Quantise tab refuses the sheet, as a fraction of the stated side (`cellLattice`).
 *
 * **A quarter either way, measured.** The first overlay sheet a generator drew from the cell prompt,
 * `test_sprites/game_overlay_test.png`, was asked for a tile square of 60% of the cell and drew its veil
 * at 217 of a 311-pixel cell: 16% over. A fifth would have passed it with four points to spare, so the
 * next sheet drawn a little larger would have been refused for a square the tab measures anyway. A
 * quarter still refuses what the figure is for: a veil drawn to the whole cell, 67% over, or a cell
 * holding some other piece where the veil should be.
 */
export const TILE_TOLERANCE = 0.25;

/**
 * How far a piece kept in place may reach past its file before the Quantise tab refuses it rather than
 * clip it, as a fraction of the tile square's side in the file (`oversizedSprites`).
 *
 * **A sixteenth**, one displayed pixel of an icon shown at 16 × 16, the smallest *Smallest Display Size*
 * lists, so a clip there never takes more than the player could see; a smaller size typed into the field
 * makes a displayed pixel a larger share of the side, and the clip a smaller one. Measured on
 * `test_sprites/game_overlay_test.png`, whose 217-pixel squares the pieces that keep a place of their own
 * reach past by up to ten pixels (the broken overlay, a twenty-second) and the fourth tier mark by
 * twenty-five (a ninth): the first is a generator's slack, which the clip absorbs, and the second a mark
 * drawn wider than the tile, which a clip would cut a pip from and is refused by name.
 */
export const PLACE_OVERSHOOT = 1 / 16;
