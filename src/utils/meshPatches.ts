import { PATCH_MARGIN_CELLS, SMALLEST_PATCHED_GRID } from '../constants/quantiser.ts';
import type { GridMesh, MeshPatch, PixelGrid } from '../types/quantiser.ts';
import { cropImage } from './cropImage.ts';
import { patchAxis } from './patchAxis.ts';
import { patchSpans } from './patchSpans.ts';
import { stepProfile } from './stepProfile.ts';

/**
 * The cells over each sprite, re-cut on that sprite's own boundaries.
 *
 * **A generated sheet is resampled sprite by sprite, so its sprites do not share a phase**, and one
 * list of cuts per axis agrees with some of them and straddles the rest. A cell that straddles a
 * boundary of the art resolves to one colour where the art has two. Measured on the keyed corpus in
 * `test_sprites/`, the within-cell deviation (each opaque pixel's distance from its cell's mean) fell
 * on all eight sheet-and-grid pairs measured from grid 3 to 8 once each sprite's cells were cut on
 * its own boundaries: `armour.png` at 3, 6; `ui_elements1.png` at 4, 5;
 * `three-quarter-view_tiles1.png` and `cyborg_black_red.png` at 4; `cyborg_monk.png` at 6 and
 * `cyborg_healer.png` at 8. It fell by 18% on `ui_elements1.png` at grid 5 and by 1% on
 * `cyborg_healer.png` at grid 8. On synthetic sheets whose sprites each have their own phase, the
 * share of pixels that resolve to the colour they were drawn in (`phasedSpriteSheet`, pitches 3 to
 * 8) rose from between 52% and 59% to between 62% and 88%. `docs/todo/done/sprite-mesh-patches.md`
 * holds the measurements in full, and `tests/quantiser-figures-mesh-patches.test.ts` pins these.
 *
 * **Why patches rather than a mesh per sprite.** Cut freely, each sprite would reduce to its own
 * count of cells, and the result would stop being one pixel per cell of one mesh — which is what
 * lets every later pass, the comparison view and the difference map place a result pixel over the
 * source it came from. A patch keeps the mesh's count and its outer edges, and moves only the cuts
 * inside: {@link patchSpans} decides which cells each patch covers and `patchAxis` where their cuts
 * go, one axis at a time, from the patch's own step profile.
 *
 * Nothing is re-cut below `SMALLEST_PATCHED_GRID`, where a sprite's phase cannot be read.
 *
 * `mesh` is the sheet's own mesh, which a patch never contradicts at its edges. An exact sheet never
 * reaches this — `boundaryMesh` answers it with its lattice first, because a sheet drawn exactly on
 * one lattice has one phase and nothing for a patch to find.
 */
export function meshPatches(image: ImageData, mesh: Pick<GridMesh, 'x' | 'y'>, grid: PixelGrid): MeshPatch[] {
  if (grid < SMALLEST_PATCHED_GRID) return [];
  return patchSpans(image, mesh, PATCH_MARGIN_CELLS).map((span) => {
    const left = mesh.x[span.column] ?? 0;
    const top = mesh.y[span.row] ?? 0;
    const right = mesh.x[span.columnEnd] ?? image.width;
    const bottom = mesh.y[span.rowEnd] ?? image.height;
    const profile = stepProfile(cropImage(image, left, top, right - left, bottom - top));
    return {
      column: span.column,
      row: span.row,
      x: patchAxis(mesh.x.slice(span.column, span.columnEnd), right, profile.columnEvidence, grid),
      y: patchAxis(mesh.y.slice(span.row, span.rowEnd), bottom, profile.rowEvidence, grid),
    };
  });
}
