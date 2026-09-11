import type { PixelGrid } from '../types/quantiser.ts';

/**
 * How narrow a cell at either end of a mesh axis may be, and which lines a mesh can therefore cut on.
 *
 * **A module of its own because two readers of a sheet state the same bound**, and each needs it
 * before the other exists. `boundaryMesh` applies it to every axis it produces, measured and regular
 * alike; `exactGridOffset` reads it to decide which transitions a scale's lattice may count, which it
 * has to know before any mesh has been cut — and `boundaryMesh` itself asks `exactGridOffset` whether
 * to walk at all. Filed inside either of the two, the bound would make them import each other.
 *
 * The bound is a property of the grid and the axis's extent alone, which is what lets both ask it.
 */

/**
 * The narrowest an end cell may be: three source pixels, or the whole cell at a grid below that.
 *
 * **An absolute floor rather than a fraction of the grid**, because what is wrong with a one-pixel
 * end band is absolute. `downscaleNearest` gives every cell one output pixel, so a band of one or
 * two source pixels stands in the result exactly as wide as a full cell — and one or two pixels is
 * not a band of anything: it is the backward walk stopping short of the edge, or the extent failing
 * to divide by the pitch.
 *
 * **A proportional floor would take content with it, and that is the mistake this number avoids.** A
 * margin the generator inset deliberately is content the reader paid for, at any width — art three
 * pixels in from the corner at a grid of 8 is a case `quantiseImage.test.ts` states outright — and
 * `grid − tolerance` would be 6 there, folding that margin into the art's own first cell and losing
 * a cell of the sprite. Three is the smallest run that can hold a boundary and an interior, so it is
 * the line below which a band cannot be a cell of artwork at any grid.
 *
 * `grid − 1` caps it, because at a grid of 2 or 3 the floor would otherwise reach a whole cell.
 */
function shortestEndCell(grid: PixelGrid): number {
  return Math.min(SHORTEST_END_BAND, grid - 1);
}

/** See {@link shortestEndCell} — an end band of fewer source pixels than this is not a cell. */
const SHORTEST_END_BAND = 3;

/**
 * Whether a mesh of `grid` can put a cut on this line of an axis `extent` pixels long.
 *
 * Every line but the ones {@link boundEndCells} takes away: a cut nearer than
 * {@link shortestEndCell} to either end of the axis would open a band too narrow to be a cell, and it
 * is merged out of every mesh of that grid however the walk runs — measured and regular alike. So
 * this is a statement about the grid and the extent alone, which is what lets the exact lattice test
 * ask it before any mesh exists: `exactGridOffset` counts a transition in a scale's favour only on
 * the lines a mesh of that scale could keep, so a reading cannot rest on change the reduction folds
 * away.
 */
export function meshCanCutAt(position: number, extent: number, grid: PixelGrid): boolean {
  const shortest = shortestEndCell(grid);
  return position >= shortest && extent - position >= shortest;
}

/**
 * The axis closed off at both ends, with an end cell too narrow to be a cell merged into its
 * neighbour.
 *
 * **A partial cell at either end is content and is never cropped** — the art a generator inset from
 * the corner is no more disposable than the art it cut short at the far edge. But `downscaleNearest`
 * emits **one output pixel per cell**, so a band of one or two source pixels would carry the same
 * weight in the result as a full cell, and the result would no longer be a reduction at one scale.
 * Both ends can produce one: the walk's backward loop stops at a position between 1 and `grid − 1`,
 * and the far edge closes the last cell wherever the extent happens to fall. Measured over the eight
 * sheets in `test_sprites/` at a grid of 6, **thirteen of the sixteen** sheet-and-keying combinations
 * had a band of one or two pixels at one end or the other, and eight of them had one at the *leading*
 * end. `armour.png` shows both ends doing it separately: unkeyed, its x axis ended on a two-pixel
 * band, which is the whole of why a 1254 × 1254 sheet came back 210 × 209; keyed, its y axis carried
 * a one-pixel band at *each* end, which is the 212.
 *
 * So a short end band is **merged** into the cell beside it rather than kept or dropped: its pixels
 * stay in the sheet and vote in that cell's tally, weighted by the area they actually cover. The
 * leading merge moves the first cut down to the image edge; the trailing merge drops the last cut
 * and lets the edge close the cell before it. Nothing is deleted, and no output pixel stands for a
 * band narrower than {@link shortestEndCell} — which is where the line is drawn, and why.
 *
 * **What this buys is an invariant the whole pipeline can be read against**: every interior cell is
 * within tolerance of the grid, and an end cell holds at least {@link shortestEndCell} source pixels
 * — three at every grid from 4 up, and the whole cell at a grid of 2 or 3, where nothing can be
 * merged without swallowing one. Its upper bound is `grid + tolerance + 2 × (shortest − 1)`, because
 * on an axis short enough to hold a single full cell **both** bands merge into that one cell; the
 * corpus never reaches it, and `regularMesh(8, 8, 4, { x: 2, y: 2 })` does.
 *
 * It does *not* make the result's dimensions a function of the source and the grid alone — a mesh
 * that follows drift honestly resolves a different number of cells on a keyed sheet than on the same
 * sheet unkeyed, because each cut may move within tolerance and re-anchor there. That difference is
 * the measurement working; a one-pixel band was not.
 *
 * **The exact lattice test reads the same bound.** {@link meshCanCutAt} states which lines survive
 * this merge, and `exactGridOffset` counts a transition on any other line against a scale and never
 * for it — so a band this folds can no longer be the evidence a scale was measured from. Until it
 * read this bound, a one-pixel frame round a flat 256-pixel sheet read as exactly 127, and the mesh
 * of 127 merged both bands into the interior and reduced the sheet to one colour.
 */
export function boundEndCells(starts: readonly number[], extent: number, grid: PixelGrid): number[] {
  const first = starts[0];
  if (first === undefined) return [];
  const shortest = shortestEndCell(grid);
  const bounded = first === 0 ? [...starts] : first < shortest ? [0, ...starts.slice(1)] : [0, ...starts];

  const last = bounded[bounded.length - 1];
  // A one-cell axis has no neighbour to merge into, and its single cell is the whole extent.
  if (bounded.length > 1 && last !== undefined && extent - last < shortest) bounded.pop();
  return bounded;
}
