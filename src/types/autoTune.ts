import type { QuantiseTuning } from './quantiser.ts';

/**
 * The dials the sweep is allowed to move, which is deliberately fewer than the tab has.
 *
 * A `Pick` of {@link QuantiseTuning} rather than a list of its own, so the compiler still knows each
 * one's type and a dial renamed on the pipeline's shape fails here rather than quietly dropping out
 * of the sweep.
 *
 * **What is missing is the definition, not an oversight**, and each omission is a rule:
 *
 * - **The two keying dials.** Keying deletes pixels, and it states an intent about a workflow rather
 *   than answering a question about fidelity. A score that rewarded matching the source would never
 *   key anything; a score that rewarded keying would delete artwork nobody asked it to.
 * - **The dither.** A dither trades per-pixel accuracy for a local average on purpose — the figures
 *   under `DITHER_CHOICES` measure exactly that — so a fidelity score answers `NONE` before it has
 *   looked at anything. Sweeping it would dress a foregone conclusion as a measurement.
 * - **The palette snap**, which reaches nothing unless a palette is locked, and whose whole point is
 *   that the reader has decided the previous sheet's colours are the ones they want.
 * - **The sprite gap, the two symmetry dials and the two duplicate dials.** Four of those change no
 *   pixel of the result at all — they shape what the tab *reports* — and the two that do act are
 *   acting on a reading a score cannot check. There is nothing here for fidelity to rank.
 *
 * The pixel grid is not on this shape for a different reason again: it is measured rather than
 * tuned, and the tab already offers what the measurement found.
 */
export type TunedDials = Pick<
  QuantiseTuning,
  | 'vote'
  | 'outlineExpansion'
  | 'lineStrength'
  | 'trimStrength'
  | 'inkThreshold'
  | 'colorMerge'
  | 'fillCleanup'
  | 'cleanupPasses'
>;

/**
 * How one candidate did: how faithfully its result reproduced the crops, and what it spent.
 *
 * Both figures are means over the crops rather than one crop's answer, because a crop is a sample of
 * the sheet and the sweep is choosing dials for the whole of it.
 */
export interface TuneReading {
  /** Mean structural similarity against the crops — see `meanSsim`. Higher is closer. */
  readonly fidelity: number;
  /** Mean colour count of the results. Lower is cheaper, and the two are what the elbow trades. */
  readonly colors: number;
}

/** Which stage of the sweep, in the order they run — see `TUNE_STAGES`. */
export const TUNE_STAGE_NAMES = [
  'READING',
  'INK_BLEND',
  'INK_THRESHOLD',
  'COLOUR_MERGE',
  'FILL_CLEANUP',
  'CLEANUP_PASSES',
] as const;
export type TuneStageName = (typeof TUNE_STAGE_NAMES)[number];

/**
 * What one stage of the sweep did, for the panel to show.
 *
 * A stage that did not run says so rather than being left out of the list, because "the ink dials
 * were not swept" and "the ink dials were swept and left where they were" are different facts about
 * the same sheet, and a reader looking at an unmoved dial needs to know which they are looking at.
 */
export interface TuneStageReport {
  readonly stage: TuneStageName;
  /** How many positions were tried; `0` where the stage was skipped. */
  readonly candidates: number;
  /** Why the stage had nothing to try, or `null` where it ran. */
  readonly skipped: string | null;
  /**
   * Where this stage's own dials stand afterwards, as a phrase — `INK_WEIGHTED, expansion 1`.
   *
   * Filled in for a skipped stage too, because the reader is looking at those dials on screen either
   * way and "where they are" is the question. {@link skipped} is what says whether the sweep put
   * them there.
   */
  readonly settled: string;
}

/** What the sweep settled on, and enough of how it got there for a reader to judge it. */
export interface TuneOutcome {
  readonly dials: TunedDials;
  /** How many crops were read, and the edge each one spans in source pixels. */
  readonly crops: number;
  readonly cropEdge: number;
  /** How many candidate positions were run in total, across every stage and every crop. */
  readonly candidates: number;
  /** The winner's own reading, which is what the stages were ranked by. */
  readonly reading: TuneReading;
  /**
   * The same reading taken at the dials the reader already had, before any stage ran.
   *
   * Reported so the panel can say what the sweep was *worth* rather than only what it chose. A sweep
   * that lands back where it started is a real and useful answer — the dials in force already suit
   * this sheet — and without the baseline it is indistinguishable from one that did nothing.
   */
  readonly baseline: TuneReading;
  readonly stages: readonly TuneStageReport[];
}
