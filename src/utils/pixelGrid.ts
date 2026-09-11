import { measurableGridCeiling } from '../constants/quantiser.ts';
import type { PixelGrid, SheetScale } from '../types/quantiser.ts';
import { edgeLattice, exactGridOffset } from './edgeLattice.ts';
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
 * counts transitions through `edgeLattice` and shares nothing with it — so a crisp sheet pays for
 * one walk exactly as it did before, and never for this one.
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
 * The pixel scale the image was drawn at, or `null` when it has none.
 *
 * **Scored on where the image changes, not on how much of it is flat.** The two sound equivalent and
 * are not: a sheet is a grid of `g` precisely when every colour transition in it lands on one phase
 * class of `g`, and asking the question that way weights the evidence by how much detail is at stake
 * rather than by how much canvas is. Counting *uniform blocks* instead — the obvious reading, and
 * what this did first — lets empty space vote. A 2048 × 2048 sheet holding a few small sprites drawn
 * at 4 on a flat key field is over 99% background, so at a candidate of 32 more than 90% of its
 * blocks are uniform and detection confidently answered 32: a scale that would reduce the art to a
 * smear. Measured on exactly that image, the block count returns 32 and this returns 4. The question
 * itself is `exactGridOffset` in `edgeLattice.ts`, asked of each candidate in turn.
 *
 * **Each axis takes the best of its phase classes**, because a generator puts its art wherever
 * composition does and the canvas corner is nowhere special: art drawn at 8 and delivered three
 * pixels in from the edge changes on the lines `3, 11, 19, …`, which is the same grid at a
 * different phase and not a different grid. The original, corner-anchored reading answered `null`
 * for every such sheet, and the guidance told the user to crop the margin off and bring the image
 * back — an instruction this measurement now makes unnecessary. **The mesh cuts on the phase found
 * here**, because `boundaryMesh` asks `exactGridOffset` the same question of whatever grid is in
 * force — measured, clicked or typed — and where the sheet is exact at that grid it takes that
 * lattice rather than walking one of its own.
 *
 * **A line no mesh of a scale can cut on counts against that scale and never for it.** The phase
 * class says where cells *could* begin and the mesh decides where they do, and `boundEndCells` merges
 * an end band narrower than three source pixels into the cell beside it — so a transition on a line
 * inside such a band is change no reduction at that scale keeps, whichever phase holds it. Counted in
 * a scale's favour, it let a sheet whose only change sits in a band like that read as exact at a
 * scale that deleted it: a one-pixel frame round a flat 256-pixel sheet changes on lines 1 and 255,
 * one phase class of 127 holds both, and the mesh of 127 folded the frame into the interior and
 * reduced the sheet to one colour — which the tab adopted without offering it, because the reading
 * was exact. So the phase count skips every line `meshCanCutAt` refuses, while the total the share is
 * read against still holds every transition in the image. That frame reads as 2, the coarsest grid
 * whose mesh keeps a band of one pixel.
 *
 * **Dropping those lines from the total as well would be the worse half of the same mistake.** A
 * one-pixel line two columns in changes on lines 2 and 3, and the stray-feature guard below rests on
 * no phase class holding both: with line 2 gone from the total, line 3 alone is a perfect share at
 * every coarse scale, and the reduction deletes the line. A frame round interior art would likewise
 * stop outvoting the few lines a coarse lattice holds. Counted only against a scale, a folded line
 * leaves every share at most what it would be without this rule, so the rule can move a reading to a
 * finer scale or to `null` and never to a coarser one. The cost falls on small art inset by a sliver
 * at *both* ends of an axis: sixteen cells at 8 with a margin of one pixel in front and two behind
 * fold two lines in seventeen, more than the threshold lets a scale discard, and read as 2 — too
 * fine, which a reader can see and finish, where a coarse reading drops change nobody is shown.
 *
 * **What the reduction at an exact scale keeps is the lattice, not every pixel.** It is not
 * lossless: a margin too thin to be a cell is still folded, as `boundEndCells` argues it should be,
 * wherever a scale can afford to discard it, and a stray pixel inside a cell is outvoted by the
 * cell's own colour. But every interior cut is a line of the lattice this read, because the mesh
 * asks the same question before it walks anything. For a while it did not ask: the walk reads lines
 * by the *magnitude* of their change where this counts them, so crisp art whose stray pixels
 * outweighed its faint cell boundaries was read as exactly 4 here and then cut two pixels beside
 * every boundary, losing a column of cells.
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
 * would fit equally.
 */
export function detectPixelGrid(image: ImageData): PixelGrid | null {
  const lattice = edgeLattice(image);
  for (let grid = measurableGridCeiling(image.width, image.height); grid >= 2; grid -= 1) {
    if (exactGridOffset(lattice, grid) !== null) return grid;
  }
  return null;
}
