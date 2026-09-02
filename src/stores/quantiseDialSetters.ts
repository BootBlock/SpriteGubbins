import type { DialKey } from '../types/quantiseHistory.ts';
import type { QuantiseDials } from '../types/quantisePreset.ts';
import type {
  AntiAliasMode,
  AntiAliasPalette,
  DitherPattern,
  FrameAlignmentMode,
  SymmetryMode,
  VoteMethod,
} from '../types/quantiser.ts';

/** One dial's move, recorded on the history and projected back over the store's flat fields. */
export type DialEdit = (key: DialKey | null, patch: Partial<QuantiseDials>) => void;

/**
 * One setter per dial on the Quantise tab.
 *
 * Every one of them is the same write — record where this dial has moved to, under its own key so
 * a drag coalesces into one undo step — and they are separate functions rather than one
 * `setDial(key, value)` so each control gets a signature naming the type it may pass. A tab that
 * called a single setter would type its argument as the union of every dial's type, and a slider
 * could hand a `DitherPattern` to `spriteGap` without the compiler noticing.
 *
 * Split out of `useQuantiseStore` because they are a different responsibility from the rest of it.
 * That store owns the sheet, the grid, a held palette and the undo stack, and decides what survives
 * a new image and what a clear takes away — real decisions, each argued at the action it belongs
 * to. These are the mechanical half: twenty-six lines of one shape, which were two-thirds of the
 * file and the reason none of those decisions could be read together.
 */
export interface QuantiseDialSetters {
  setKeyingEnabled(keyingEnabled: boolean): void;
  setKeyTolerance(keyTolerance: number): void;
  setSilhouetteThreshold(silhouetteThreshold: number): void;
  setVote(vote: VoteMethod): void;
  setOutlineExpansion(outlineExpansion: number): void;
  setLineStrength(lineStrength: number): void;
  setTrimStrength(trimStrength: number): void;
  setInkThreshold(inkThreshold: number): void;
  setFillCleanup(fillCleanup: number): void;
  setColorMerge(colorMerge: number): void;
  setCleanupPasses(cleanupPasses: number): void;
  setDither(dither: DitherPattern): void;
  setPaletteSnap(paletteSnap: number): void;
  setSpriteGap(spriteGap: number): void;
  setSymmetry(symmetry: SymmetryMode): void;
  setSymmetryTolerance(symmetryTolerance: number): void;
  setSymmetryConfidence(symmetryConfidence: number): void;
  setDuplicateTolerance(duplicateTolerance: number): void;
  setDuplicateSnap(duplicateSnap: boolean): void;
  setFrameAlignment(frameAlignment: FrameAlignmentMode): void;
  setFrameDriftTolerance(frameDriftTolerance: number): void;
  setAntiAlias(antiAlias: AntiAliasMode): void;
  setAntiAliasThreshold(antiAliasThreshold: number): void;
  setAntiAliasStrength(antiAliasStrength: number): void;
  setAntiAliasRun(antiAliasRun: number): void;
  setAntiAliasPalette(antiAliasPalette: AntiAliasPalette): void;
}

/**
 * The setters, bound to the store's own recording write.
 *
 * Takes `edit` rather than the store, so nothing here can reach the sheet, the palette or the
 * history — the one write it is handed is the only thing it can do. That is what keeps the
 * projection `QuantiseState.history` describes true: a setter with `set` in scope could write a
 * flat field directly, and the position it wrote would be the one an undo could not reach.
 */
export function quantiseDialSetters(edit: DialEdit): QuantiseDialSetters {
  return {
    setKeyingEnabled: (keyingEnabled) => {
      edit('keyingEnabled', { keyingEnabled });
    },
    setKeyTolerance: (keyTolerance) => {
      edit('keyTolerance', { keyTolerance });
    },
    setSilhouetteThreshold: (silhouetteThreshold) => {
      edit('silhouetteThreshold', { silhouetteThreshold });
    },
    setVote: (vote) => {
      edit('vote', { vote });
    },
    setOutlineExpansion: (outlineExpansion) => {
      edit('outlineExpansion', { outlineExpansion });
    },
    setLineStrength: (lineStrength) => {
      edit('lineStrength', { lineStrength });
    },
    setTrimStrength: (trimStrength) => {
      edit('trimStrength', { trimStrength });
    },
    setInkThreshold: (inkThreshold) => {
      edit('inkThreshold', { inkThreshold });
    },
    setFillCleanup: (fillCleanup) => {
      edit('fillCleanup', { fillCleanup });
    },
    setColorMerge: (colorMerge) => {
      edit('colorMerge', { colorMerge });
    },
    setCleanupPasses: (cleanupPasses) => {
      edit('cleanupPasses', { cleanupPasses });
    },
    setDither: (dither) => {
      edit('dither', { dither });
    },
    setPaletteSnap: (paletteSnap) => {
      edit('paletteSnap', { paletteSnap });
    },
    setSpriteGap: (spriteGap) => {
      edit('spriteGap', { spriteGap });
    },
    setSymmetry: (symmetry) => {
      edit('symmetry', { symmetry });
    },
    setSymmetryTolerance: (symmetryTolerance) => {
      edit('symmetryTolerance', { symmetryTolerance });
    },
    setSymmetryConfidence: (symmetryConfidence) => {
      edit('symmetryConfidence', { symmetryConfidence });
    },
    setDuplicateTolerance: (duplicateTolerance) => {
      edit('duplicateTolerance', { duplicateTolerance });
    },
    setDuplicateSnap: (duplicateSnap) => {
      edit('duplicateSnap', { duplicateSnap });
    },
    setFrameAlignment: (frameAlignment) => {
      edit('frameAlignment', { frameAlignment });
    },
    setFrameDriftTolerance: (frameDriftTolerance) => {
      edit('frameDriftTolerance', { frameDriftTolerance });
    },
    setAntiAlias: (antiAlias) => {
      edit('antiAlias', { antiAlias });
    },
    setAntiAliasThreshold: (antiAliasThreshold) => {
      edit('antiAliasThreshold', { antiAliasThreshold });
    },
    setAntiAliasStrength: (antiAliasStrength) => {
      edit('antiAliasStrength', { antiAliasStrength });
    },
    setAntiAliasRun: (antiAliasRun) => {
      edit('antiAliasRun', { antiAliasRun });
    },
    setAntiAliasPalette: (antiAliasPalette) => {
      edit('antiAliasPalette', { antiAliasPalette });
    },
  };
}
