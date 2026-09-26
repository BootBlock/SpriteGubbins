import type { GridMesh, MeshPatch, PixelGrid } from '../types/quantiser.ts';
import { cropImage } from './cropImage.ts';
import { patchAxis } from './patchAxis.ts';
import type { PatchSpan } from './patchSpans.ts';
import { stepProfile } from './stepProfile.ts';

/**
 * One span of the mesh's cells, re-cut on the boundaries of the sprite inside it.
 *
 * The span's source rectangle runs from the mesh's cuts at its first column and row to its cuts
 * after the last, the sheet's own edge closing a span that reaches it. Its step profile is taken
 * over that rectangle alone, so no other sprite's lines are in it, and `patchAxis` places each
 * axis's cuts from it. A module of its own because `meshPatches` and the figure suite that argues
 * its constants both re-cut spans, and the suite must re-cut them exactly as the app does: a copy
 * would keep describing the copy after the app had changed.
 */
export function recutSpan(
  image: ImageData,
  mesh: Pick<GridMesh, 'x' | 'y'>,
  grid: PixelGrid,
  span: PatchSpan,
): MeshPatch {
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
}
