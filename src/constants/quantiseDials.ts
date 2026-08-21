import type { QuantiseDials } from '../types/quantisePreset.ts';
import {
  DEFAULT_CLEANUP_PASSES,
  DEFAULT_COLOR_MERGE,
  DEFAULT_DITHER,
  DEFAULT_FILL_CLEANUP,
  DEFAULT_INK_THRESHOLD,
  DEFAULT_KEY_TOLERANCE,
  DEFAULT_LINE_STRENGTH,
  DEFAULT_OUTLINE_EXPANSION,
  DEFAULT_PALETTE_SNAP,
  DEFAULT_SPRITE_GAP,
  DEFAULT_TRIM_STRENGTH,
} from './quantiser.ts';

/**
 * Every dial's opening position, as one value.
 *
 * The `DEFAULT_*` constants in `quantiser.ts` each say what one control opens at and why. This is
 * the set they form, and it exists because three separate things need to name *all* of them at
 * once: what `useQuantiseStore` opens with, what its `clear` puts back, and what
 * `parseQuantiseDials` falls to field by field when stored text cannot be read.
 *
 * Typed as {@link QuantiseDials} rather than inferred, which is the point of writing it down: a
 * dial added to that interface — or to the pipeline's `QuantiseTuning`, which it extends — fails to
 * compile here until it has an opening position, and fails in the parser until it has a check.
 *
 * **In its own file rather than beside the constants it is built from**, and the reason is a
 * program boundary rather than a filing preference. `constants/quantiser.ts` is imported by
 * `tests/select-option-labels.test.ts`, which belongs to `tsconfig.node.json` — a program with no
 * DOM library, deliberately. `QuantiseDials` reaches `types/quantiser.ts`, which is written in
 * terms of `ImageData`, so importing the type there would put a DOM-free program on a chain that
 * ends in a DOM type and fail the build with an error naming neither file.
 */
export const QUANTISE_DEFAULT_DIALS: QuantiseDials = {
  keyingEnabled: false,
  keyTolerance: DEFAULT_KEY_TOLERANCE,
  vote: 'DOMINANT',
  outlineExpansion: DEFAULT_OUTLINE_EXPANSION,
  lineStrength: DEFAULT_LINE_STRENGTH,
  trimStrength: DEFAULT_TRIM_STRENGTH,
  inkThreshold: DEFAULT_INK_THRESHOLD,
  fillCleanup: DEFAULT_FILL_CLEANUP,
  colorMerge: DEFAULT_COLOR_MERGE,
  cleanupPasses: DEFAULT_CLEANUP_PASSES,
  dither: DEFAULT_DITHER,
  paletteSnap: DEFAULT_PALETTE_SNAP,
  spriteGap: DEFAULT_SPRITE_GAP,
};
