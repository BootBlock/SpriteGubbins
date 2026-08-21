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

/**
 * Every dial's name as a value, written as a record whose value is its own key.
 *
 * The shape is what makes it safe. A mapped type over `keyof QuantiseDials` has no optional
 * members, so a dial added to the interface fails to compile here until it is named — and each
 * value has to be the literal its key is, so a mistyped name fails too. That is the same
 * compile-time completeness `QUANTISE_DEFAULT_DIALS` above gives the opening positions, arrived at
 * without a cast: `Object.values` of this record is the key list, typed as the keys.
 */
const DIAL_NAMES: { readonly [K in keyof QuantiseDials]: K } = {
  keyingEnabled: 'keyingEnabled',
  keyTolerance: 'keyTolerance',
  vote: 'vote',
  outlineExpansion: 'outlineExpansion',
  lineStrength: 'lineStrength',
  trimStrength: 'trimStrength',
  inkThreshold: 'inkThreshold',
  fillCleanup: 'fillCleanup',
  colorMerge: 'colorMerge',
  cleanupPasses: 'cleanupPasses',
  dither: 'dither',
  paletteSnap: 'paletteSnap',
  spriteGap: 'spriteGap',
};

/**
 * Every dial's name, for the one job that needs to walk the set rather than name a member of it:
 * deciding whether two sets of dial positions are the same.
 *
 * `sameDials` is what the undo stack refuses a duplicate entry on, so a name missing from this list
 * would not fail anything — it would quietly make two different positions compare equal, and the
 * change to that dial would be the one an undo could not get back to. Hence the record above rather
 * than a hand-written array.
 */
export const QUANTISE_DIAL_KEYS = Object.values(DIAL_NAMES);
