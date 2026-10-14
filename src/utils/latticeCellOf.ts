import type { LatticeCell } from '../types/cellLattice.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { SpriteCell } from '../types/spriteCell.ts';

/** The lattice cell whose region holds this box's centre, or `undefined` for none. */
export function latticeCellOf(box: SpriteBox, cell: SpriteCell): LatticeCell | undefined {
  if (cell.lattice?.kind !== 'CELLS') return undefined;
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  return cell.lattice.cells.find(
    ({ region }) =>
      x >= region.left && x < region.left + region.width && y >= region.top && y < region.top + region.height,
  );
}
