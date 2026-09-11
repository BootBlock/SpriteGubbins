import { GRID_DETECTION_THRESHOLD, measurableGridCeiling } from '../constants/quantiser.ts';
import type { PixelGrid, SheetScale } from '../types/quantiser.ts';
import { meshCanCutAt } from './gridMesh.ts';
import { CHANNELS_PER_PIXEL, packedColorAt } from './imageData.ts';
import { estimateMeshPeriod } from './meshPeriod.ts';
import { estimatePixelGrid } from './pixelPeriod.ts';
import { estimateProfilePeriod } from './profilePeriod.ts';
import { stepProfile } from './stepProfile.ts';

/**
 * Finding the scale a returned sheet's art was actually drawn at.
 *
 * A question about an image, not a transform of one — cutting to the answer and reducing to it are
 * `alignToGrid` and `downscaleNearest` in ./gridAlignment.ts, walking the mesh `boundaryMesh`
 * measures for whatever scale is in force, and `quantiseImage` is what runs the whole of it.
 */

/**
 * The scale in a sheet: read exactly where the sheet allows it, estimated as a period where
 * resampling has softened the edges, and estimated from the boundary spacings where the art
 * *drifts* — each reading tried only where the one before found nothing.
 *
 * {@link detectPixelGrid} is exact and has no tolerance in it, so where it answers there is nothing
 * an estimate could add and a second opinion could only disagree. `estimatePixelGrid` covers
 * artwork drawn at a scale and then resampled *about a lattice it kept* — softened edges, but a
 * true period at a fixed phase underneath. `estimateProfilePeriod` covers what generators actually
 * return: drifting blocks *with interior detail* — straps and markings whose edges are what a line
 * list has to tell the boundaries apart from, where autocorrelation of the whole profile needs no
 * such separation and reads straight through them. `estimateMeshPeriod` stays behind it for *small*
 * sheets: a handful of drifting cells across a few dozen pixels sits under the correlation's repeat
 * floor, and a clean median of the boundary spacings still speaks there —
 * `meshPeriod.test.ts` holds the sheet that proves the path. Every estimated answer is offered
 * under the same hedge: a candidate to click and judge, never adopted on its own. **Which of them
 * answered is carried out with the number** rather than pooled into one `ESTIMATED`, because the
 * copy beside it names the reading — see {@link ScaleMeasurement}, and the wording each reading
 * takes in `ESTIMATED_SCALE_READING`.
 *
 * **Which reading serves which sheet is measured, not asserted.** `tests/sheet-scale-corpus.test.ts`
 * runs all four over the eight sheets in `test_sprites/` and pins what each one answers, against the
 * pitch each sheet was independently measured to have been drawn at. Only `estimateProfilePeriod`
 * answers on any of it — the other three answer on none — and the file records for each sheet which
 * gate refused it, because a docblock claiming a reading serves real generator output is exactly
 * what went unchecked before.
 *
 * Running each reading only on the one before's refusal is also what keeps the survey cheap where
 * it can be: a crisp sheet pays for one pass, and only the sheets each later reading exists for
 * pay for it.
 *
 * **The three estimated readings share one walk of the image**, which is why this function computes
 * the `StepProfile` and they take it rather than an image. Each of them derived it for itself, so a
 * sheet answering on the correlation walked the image twice over and a sheet refusing every reading
 * walked it three times — and that one pass was 82–88% of the whole survey. Measured over the eight
 * sheets in `test_sprites/`, sharing it takes the survey from 311–464ms to 176–213ms, a saving of
 * 97–279ms or 31–61% per sheet. The walk is linear in the pixel count and every one of those sheets
 * is about 1.6 megapixels against the 16.8 `MAX_IMAGE_PIXELS` admits, so what it saves on the
 * largest sheet the app accepts is of the order of seconds.
 *
 * **The profile is still computed lazily**, after the exact detector has refused, because that one
 * counts transitions through its own `edgeLattice` and shares nothing with it — so a crisp sheet
 * pays for one walk exactly as it did before, and never for this one.
 */
export function measureSheetScale(image: ImageData): SheetScale | null {
  const detected = detectPixelGrid(image);
  if (detected !== null) return { grid: detected, measurement: 'EXACT' };

  const profile = stepProfile(image);

  const estimated = estimatePixelGrid(profile);
  if (estimated !== null) return { grid: estimated, measurement: 'EDGE_PERIOD' };

  const correlated = estimateProfilePeriod(profile);
  if (correlated !== null) return { grid: correlated, measurement: 'REPEAT_DISTANCE' };

  const drifting = estimateMeshPeriod(profile);
  return drifting === null ? null : { grid: drifting, measurement: 'BOUNDARY_SPACING' };
}

/**
 * Where one pixel differs from the neighbour above it or to its left, totalled by position.
 *
 * The whole of what detection needs to know about an image, and the reason it needs only one pass to
 * learn it: a grid of `g` is exactly the claim that **no colour changes anywhere except on one of
 * `g`'s phase classes** — the lines `p, p + g, p + 2g, …` for some offset `p` — so once the
 * transitions are counted by the row and column they fall on, every candidate scale is scored by
 * summing the entries on each of its classes rather than by walking the image again.
 */
interface EdgeLattice {
  /** `columnEdges[x]` — rows in which pixel `x` differs from pixel `x - 1`. Index 0 is unused. */
  readonly columnEdges: Uint32Array;
  /** `rowEdges[y]` — columns in which row `y` differs from row `y - 1`. Index 0 is unused. */
  readonly rowEdges: Uint32Array;
}

/**
 * The pixel scale the image was drawn at, or `null` when it has none.
 *
 * **Scored on where the image changes, not on how much of it is flat.** The two sound equivalent and
 * are not: a sheet is a grid of `g` precisely when every colour transition in it lands on one phase
 * class of `g`, and asking the question that way weights the evidence by how much detail is at stake
 * rather than by how much canvas is. Counting *uniform blocks* instead — the obvious reading, and
 * what this did first — lets empty space vote. A 2048 × 2048 sheet holding a few small sprites drawn
 * at 4 on a flat key field is over 99% background, so at a candidate of 32 more than 90% of its
 * blocks are uniform and detection confidently answered 32: a scale that would reduce the art to a
 * smear. Measured on exactly that image, the block count returns 32 and this returns 4.
 *
 * **Each axis takes the best of its phase classes**, because a generator puts its art wherever
 * composition does and the canvas corner is nowhere special: art drawn at 8 and delivered three
 * pixels in from the edge changes on the lines `3, 11, 19, …`, which is the same grid at a
 * different phase and not a different grid. The original, corner-anchored reading answered `null`
 * for every such sheet, and the guidance told the user to crop the margin off and bring the image
 * back — an instruction this measurement now makes unnecessary. The alignment does not need the
 * phase found here: `boundaryMesh` measures where the cells sit for whatever grid ends up in
 * force, which is the one mechanism serving measured, clicked and typed grids alike.
 *
 * **A line no mesh of a scale can cut on is not evidence for that scale, either way.** The phase
 * class says where cells *could* begin and the mesh decides where they do, and `boundEndCells` merges
 * an end band narrower than three source pixels into the cell beside it — so a line inside such a
 * band is one no reduction at that scale keeps, whichever phase holds it. Counted, it let a sheet
 * whose only change sits in a band like that read as exact at a scale that deleted it: a one-pixel
 * frame round a flat 256-pixel sheet changes on lines 1 and 255, one phase class of 127 holds both,
 * and the mesh of 127 folded the frame into the interior and reduced the sheet to one colour — which
 * the tab adopted without offering it, because the reading was exact. So a candidate is scored only
 * on the lines `meshCanCutAt` admits, in the share and in the total alike, and one left with nothing
 * to score is passed over. That frame reads as 2, the coarsest grid whose mesh keeps a band of one.
 *
 * **That makes the reading agree with the mesh about the ends, and claims nothing more.** A margin
 * narrower than the band is still folded, as `boundEndCells` argues it should be, so a reduction at
 * an exact scale is not lossless; what changed is that a reading can no longer rest on the lines the
 * fold removes. Where the mesh puts its *interior* cuts is its own measurement, and nothing here
 * re-checks it — a gap rather than a guarantee, which issue #276 carries: on crisp art whose stray
 * pixels outweigh its cell boundaries the line reader takes the strays for boundaries, and the walk
 * can cut beside the lattice this scored. A cut one pixel off still leaves a four-pixel cell its
 * majority and one two pixels off does not, so counting the transitions that sit exactly on the
 * cuts is not the answer to it either.
 *
 * Largest candidate first, because a true grid of 8 also scores perfectly at 4, 2 and 1 — the
 * coarsest grid that holds is the real one. Where the count starts is a property of the image
 * rather than a constant — see `measurableGridCeiling` — and candidates stop at 2 because every
 * image is trivially uniform at 1, so a detector that considered it could never answer `null`.
 *
 * A stray feature in the sheet's interior still defeats every candidate, phase search or none: it
 * is *two* transition columns — where it starts and where it ends, one pixel apart — and no scale
 * of 2 or more has a phase class holding both. `null` is likewise still the honest answer for
 * genuinely smooth artwork, which changes everywhere and gives no class more than a fraction of the
 * total; that is where {@link measureSheetScale} hands the sheet to the estimator, whose question —
 * period rather than membership — is the one resampling leaves answerable. An image with **no**
 * transitions at all answers `null` too: there is no scale in it to measure, and every candidate
 * would fit equally — the reason a single candidate with nothing to score is passed over.
 */
export function detectPixelGrid(image: ImageData): PixelGrid | null {
  const lattice = edgeLattice(image);

  for (let grid = measurableGridCeiling(image.width, image.height); grid >= 2; grid -= 1) {
    const scored = cuttableCount(lattice.columnEdges, grid) + cuttableCount(lattice.rowEdges, grid);
    if (scored === 0) continue;
    const aligned = bestPhaseCount(lattice.columnEdges, grid) + bestPhaseCount(lattice.rowEdges, grid);
    if (aligned / scored >= GRID_DETECTION_THRESHOLD) return grid;
  }
  return null;
}

/**
 * One pass over the image, counting every colour transition by the row or column it falls on.
 *
 * Each pixel is packed once and compared with the two neighbours that have already been packed — the
 * one to its left, carried in a variable, and the one above it, carried in a row of the previous
 * scanline's values. So the cost is one pack and two integer comparisons per pixel, whatever the
 * image, rather than the up-to-31 full passes counting uniform blocks took.
 *
 * Alpha is part of the comparison, because a silhouette edge against transparency is a transition
 * like any other and is often the only one a keyed sheet has left.
 */
function edgeLattice(image: ImageData): EdgeLattice {
  const { width, height, data } = image;
  const columnEdges = new Uint32Array(width);
  const rowEdges = new Uint32Array(height);
  const above = new Uint32Array(width);

  for (let y = 0; y < height; y += 1) {
    let left = 0;
    for (let x = 0; x < width; x += 1) {
      const packed = packedColorAt(data, (y * width + x) * CHANNELS_PER_PIXEL);

      if (x > 0 && packed !== left) columnEdges[x] = (columnEdges[x] ?? 0) + 1;
      if (y > 0 && packed !== above[x]) rowEdges[y] = (rowEdges[y] ?? 0) + 1;

      left = packed;
      above[x] = packed;
    }
  }

  return { columnEdges, rowEdges };
}

/**
 * The transitions on one axis that a mesh of this scale could keep — the total a candidate's share
 * is read against. See {@link detectPixelGrid} for why a line inside an end band is left out.
 */
function cuttableCount(edges: Uint32Array, grid: PixelGrid): number {
  let count = 0;
  for (let position = 1; position < edges.length; position += 1) {
    if (meshCanCutAt(position, edges.length, grid)) count += edges[position] ?? 0;
  }
  return count;
}

/**
 * The most transitions any one phase class of this scale accounts for on one axis.
 *
 * Read against {@link cuttableCount}, the summed best of the two axes degrades in proportion to how
 * much of the detail the scale would destroy: a grid twice as coarse as the truth misses every
 * other line of the art's own lattice whatever phase it takes, and scores about a half — which is
 * why the threshold has room to allow a stray pixel without ever allowing a doubled scale.
 *
 * Position 0 is skipped in every class: the first pixel has nothing before it to differ from, so
 * index 0 is unused and a lattice line at the image's own edge is not evidence. A line inside an end
 * band the mesh folds is skipped too, for the same reason it is left out of the total.
 */
function bestPhaseCount(edges: Uint32Array, grid: PixelGrid): number {
  let best = 0;
  for (let phase = 0; phase < grid; phase += 1) {
    let aligned = 0;
    for (let position = phase === 0 ? grid : phase; position < edges.length; position += grid) {
      if (meshCanCutAt(position, edges.length, grid)) aligned += edges[position] ?? 0;
    }
    if (aligned > best) best = aligned;
  }
  return best;
}
