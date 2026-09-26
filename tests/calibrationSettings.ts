import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import type { QuantiseSettings } from '../src/types/quantiser.ts';

/**
 * The conditions every calibration figure the quantiser's docblocks state is measured at, bar the
 * dial each one varies.
 *
 * Shared by the `quantiser-figures-*.test.ts` suites, which re-derive those figures from the sheets
 * they name. The figures are read as evidence — a maintainer deciding whether a dial's default is
 * right consults them instead of re-measuring — and four docblocks had drifted silently, each by a
 * different amount, because passes upstream of them changed and nothing recomputed them. All four
 * were stating cell counts through a mesh no version of this app produces. That is what the suites
 * exist to stop: a change to the mesh, the vote, the palette or the cleanup passes fails one of them,
 * and the suite's name says which docblock's figure it moved.
 *
 * **They pin the figures, not the prose.** Whoever makes one fail has to go and restate the
 * docblock, which is the step that was being skipped. A conclusion drawn from a figure — the knee at
 * 1, the unrestricted column being the worst — is still a judgement no assertion can hold.
 *
 * Slow, deliberately: nearly every figure is the real pipeline over a 1.57-megapixel generator
 * sheet, because a synthetic fixture carries none of the resampling being measured through. That is
 * why they are one suite per docblock rather than one file: Vitest schedules by file, so a single
 * file holding every figure was the longest-running job in the gate however many workers ran it.
 *
 * `test_sprites/armour.png` is where most of them are stated. A figure measured somewhere other than
 * the reference sheet says which sheet it came from, in the suite that pins it.
 */
export const calibrationSettings = (over: Partial<QuantiseSettings> = {}): QuantiseSettings => ({
  ...QUANTISE_DEFAULT_DIALS,
  grid: 6,
  key: null,
  reduction: { kind: 'MAX_COLORS', maxColors: 64 },
  ...over,
});
