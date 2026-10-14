import { loadCorpusSheet, type PlacementSheetName } from './sheetCorpus.ts';
import { TILE_SHARE } from '../src/constants/promptText/tileShare.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { iconOverlaySheets } from '../src/constants/sheetPlans/iconOverlaySheets.ts';
import { DEFAULT_SPRITE_CELL_CHOICE } from '../src/constants/spriteCell.ts';
import type { CellLattice } from '../src/types/cellLattice.ts';
import type { IconLook } from '../src/types/iconRoster.ts';
import type { SpriteBox } from '../src/types/quantiser.ts';
import type { SpriteCell } from '../src/types/spriteCell.ts';
import { cellLattice } from '../src/utils/cellLattice.ts';
import { planSlots } from '../src/utils/componentSlots.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { resolveSpriteCell } from '../src/utils/spriteCell.ts';
import { resolveAssignment } from '../src/utils/spriteAssignment.ts';
import { tileCellsOf } from '../src/utils/tileCellsOf.ts';

/** One overlay sheet as the Quantise tab reads it, with the cells it found and the pieces it writes. */
export interface OverlayReading {
  readonly sheet: ImageData;
  /** The segmentation's boxes, in its own order. */
  readonly boxes: readonly SpriteBox[];
  readonly lattice: Extract<CellLattice, { kind: 'CELLS' }>;
  /** The slot names of the overlay sheet's plan, one per piece, in cell order. */
  readonly names: readonly string[];
  /** The box of each piece, the fragments of one cell joined, in cell order, as `Keep place` cuts them. */
  readonly pieces: readonly SpriteBox[];
}

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 } as const;

/**
 * An overlay sheet in `test_sprites/`, read the way the Quantise tab reads it with the studio's overlay
 * sheet in force: quantised at a grid of 1 on the magenta key with no colour reduction, its cells read
 * against the look's plan at the high-resolution tile share (`useCellLattice`), and its fragments joined
 * into pieces cell by cell (`resolveAssignment`). Throws where the sheet does not segment or its cells
 * cannot be read, which every overlay sheet test begins by asserting.
 */
export async function readOverlaySheet(name: PlacementSheetName, look: IconLook): Promise<OverlayReading> {
  const sheet = await loadCorpusSheet(name);
  const [plan] = iconOverlaySheets(look, []);
  const result = quantiseImage(sheet, {
    ...QUANTISE_DEFAULT_DIALS,
    grid: 1,
    key: { color: MAGENTA, tolerance: DEFAULT_KEY_TOLERANCE },
    reduction: null,
  });
  if (result.sprites.kind !== 'SEGMENTED') throw new Error(`${name} did not segment: ${result.sprites.kind}`);
  if (plan.placement === undefined || plan.cellGrid === undefined) {
    throw new Error('unreachable: a placement sheet');
  }
  const { boxes } = result.sprites;
  const lattice = cellLattice(boxes, {
    width: result.sprites.width,
    columns: plan.cellGrid,
    placement: plan.placement,
    share: TILE_SHARE.HIGH_RESOLUTION / 100,
    tileCells: tileCellsOf(plan),
  });
  if (lattice.kind !== 'CELLS') throw new Error(`${name}: expected cells, got: ${lattice.reason}`);
  const names = planSlots(plan);
  const pieces = resolveAssignment(boxes, [], names, lattice).pieces.map((piece) => piece.box);
  return { sheet, boxes, lattice, names, pieces };
}

/** The `Keep place` cut into a square file of `side`, the studio's target, resampling at a grid of 1. */
export function keepPlace(reading: OverlayReading, side = 128): SpriteCell {
  const choice = { ...DEFAULT_SPRITE_CELL_CHOICE, source: 'TARGET', fit: 'SCALE_SET' } as const;
  const cell = resolveSpriteCell(choice, { width: side, height: side }, 1, null, reading.lattice);
  if (cell === null) throw new Error('unreachable: a target cell resolves');
  return cell;
}
