import { create } from 'zustand';
import { PREVIEW_ZOOMS } from '../constants/quantiser.ts';
import { DEFAULT_SPRITE_CELL_CHOICE } from '../constants/spriteCell.ts';
import { SHEET_FORMATS } from '../types/sheetFormat.ts';
import type { SheetFormat } from '../types/sheetFormat.ts';
import type { SpriteCellChoice } from '../types/spriteCell.ts';

/**
 * How the Quantise tab writes its result: at what magnification, as which file, and — for the two
 * formats that describe sprites — what each sprite is cut into.
 *
 * A store rather than the preview's own `useState`, for the reason `useQuantiseStore` is one: **the
 * workflow crosses tabs**, and `App` unmounts the view on every trip. The cell exists for a rig
 * workflow — a sprite pack cut to the 64 × 96 slot an importer expects — and the target size a cell
 * can be read from is a studio setting, so going to the studio and back is the ordinary case. Held
 * in the panel, the trip dropped the reader back to a PNG and the bounding-box cut.
 *
 * **What a reader wants of the file, not a fact about the sheet**, so nothing here falls to a new
 * sheet or to `clear`: the next sheet of a series leaves by the same route as the last. Nothing is
 * persisted either, as nothing in `useQuantiseStore` is — this survives navigation, not a reload.
 *
 * The scale is held as asked for rather than as offered: `DownloadControls` derives the rung actually
 * in force from what the current result can afford, so a larger result strands the choice without
 * rewriting it.
 */
export interface QuantiseDownloadState {
  /** How many file pixels one drawn pixel is written as. */
  readonly downloadScale: number;
  /** Which file the sheet leaves as. */
  readonly downloadFormat: SheetFormat;
  /** What a pack's or a manifest's sprites are cut into — see `SpriteCellControls`. */
  readonly cellChoice: SpriteCellChoice;

  setDownloadScale(scale: number): void;
  setDownloadFormat(format: SheetFormat): void;
  setCellChoice(choice: SpriteCellChoice): void;
}

export const useQuantiseDownloadStore = create<QuantiseDownloadState>((set) => ({
  downloadScale: PREVIEW_ZOOMS[0],
  downloadFormat: SHEET_FORMATS[0],
  cellChoice: DEFAULT_SPRITE_CELL_CHOICE,

  setDownloadScale: (downloadScale) => {
    set({ downloadScale });
  },
  setDownloadFormat: (downloadFormat) => {
    set({ downloadFormat });
  },
  setCellChoice: (cellChoice) => {
    set({ cellChoice });
  },
}));
