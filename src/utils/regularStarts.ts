import type { PixelGrid } from '../types/quantiser.ts';
import { boundEndCells } from './boundEndCells.ts';

/**
 * Cell starts for one axis at a regular pitch and phase — the exact case, and the fallback.
 *
 * A module of its own because both `regularMesh` and `meshAxis` build it. Filed in `gridMesh.ts`, it
 * would make that module and `meshAxis.ts` import each other, since `boundaryMesh` asks `meshAxis`
 * for its walked axes; filed in `meshAxis.ts`, it would be a second export there.
 */
export function regularStarts(extent: number, grid: PixelGrid, offset: number): number[] {
  const starts: number[] = [];
  for (let start = offset; start < extent; start += grid) starts.push(start);
  // An offset at or past the extent puts no cut on the axis at all, and an axis of no cells is a
  // zero-dimension result rather than a small one — `ImageData` throws on it. The image's own edge
  // bounds one cell whatever the phase, so that is the floor.
  return starts.length === 0 ? [0] : boundEndCells(starts, extent, grid);
}
