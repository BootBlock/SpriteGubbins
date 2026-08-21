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
 * - **The sprite gap, the three symmetry dials and the two duplicate dials.** Four of those six
 *   change no pixel of the result at all — they shape what the tab *reports* — and the two that do
 *   act, the symmetry snap and the duplicate snap, are acting on a reading a score cannot check.
 *   There is nothing here for fidelity to rank.
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
 * Every swept dial's name as a value, written as a record whose value is its own key.
 *
 * The shape is what makes it safe, and it is `QUANTISE_DIAL_KEYS`' own trick: a mapped type over
 * `keyof TunedDials` has no optional members, so a dial added to that subset fails to compile here
 * until it is named, and each value has to be the literal its key is. `Object.values` of it is the
 * key list, typed as the keys, with no cast and no hand-written array to fall behind.
 */
const TUNED_DIAL_NAMES: { readonly [K in keyof TunedDials]: K } = {
  vote: 'vote',
  outlineExpansion: 'outlineExpansion',
  lineStrength: 'lineStrength',
  trimStrength: 'trimStrength',
  inkThreshold: 'inkThreshold',
  colorMerge: 'colorMerge',
  fillCleanup: 'fillCleanup',
  cleanupPasses: 'cleanupPasses',
};

/**
 * Every swept dial's name, for the one job that has to walk the set rather than name a member of
 * it: deciding whether two positions are the same.
 *
 * A name missing from this list would fail nothing — it would quietly make two different positions
 * compare equal, and the stage that could not tell them apart would move a dial it was promising to
 * leave alone. Hence the record above rather than an array.
 */
export const TUNED_DIAL_KEYS = Object.values(TUNED_DIAL_NAMES);

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
  /**
   * How many candidate positions were run, across every stage plus the one the reader arrived with.
   *
   * Positions, not runs of the pipeline: each one is read on every crop, so the pipeline ran this
   * many times {@link crops}. The chip the panel draws states both figures side by side for that
   * reason.
   */
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
