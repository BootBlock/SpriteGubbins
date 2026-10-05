/**
 * How far the tile square measured on a placement sheet may sit from the share the prompt states before
 * the Quantise tab refuses the sheet, as a fraction of the stated side (`cellLattice`).
 *
 * **A fifth either way**, because a generator draws the square it is told to only roughly, and an
 * overlay piece placed against a square a fifth too large still lands inside the file, where one placed
 * against a square half the size lands across its edge. The figure is set by reasoning rather than by
 * measurement: no generated overlay sheet drawn from the cell prompt is in `test_sprites/` yet, and the
 * first one that is should calibrate it.
 */
export const TILE_TOLERANCE = 0.2;
