import { TUNED_DIAL_KEYS } from '../types/autoTune.ts';
import type { TuneStageName, TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings, QuantiseTuning } from '../types/quantiser.ts';

/** A stage's positions to try, or the reason it has none. */
export type TuneStagePlan =
  { readonly candidates: readonly [TunedDials, ...TunedDials[]] } | { readonly skipped: string };

/**
 * One step of the sweep: what it varies, and how to read back where it left things.
 *
 * **The plan is a function of the settings as well as the dials**, because three of the nine stages
 * sweep dials the pipeline only reads under a setting the sweep is not allowed to move. The
 * anti-aliasing dials reach nothing while that control is `OFF`, and the blended-shades dial reaches
 * nothing with no colour reduction in force — both facts about the ask rather than about the dials
 * being settled, so neither can be read off {@link TunedDials}.
 */
export interface TuneStage {
  readonly name: TuneStageName;
  /** The positions to try from the dials settled so far, or why there are none. */
  plan(settled: TunedDials, settings: QuantiseSettings): TuneStagePlan;
  /** This stage's own dials as a phrase, for the report the panel shows. */
  describe(settled: TunedDials): string;
}

/**
 * A ladder's positions as the non-empty list {@link TuneStagePlan} promises.
 *
 * Every ladder in `constants/autoTune.ts` has entries, so the guard is what
 * `noUncheckedIndexedAccess` asks for rather than a case that arises — and throwing is the honest
 * answer to a stage that has been given an empty ladder, since choosing among nothing is not
 * something a fallback can do.
 */
export function ladder(candidates: readonly TunedDials[]): readonly [TunedDials, ...TunedDials[]] {
  const first = candidates[0];
  if (first === undefined) throw new Error('A sweep stage was given no positions to try');
  return [first, ...candidates.slice(1)];
}

/**
 * A stage's candidates with the dials already in force at the head of them, and no duplicate of it.
 *
 * **This is what makes a stage unable to move a dial it cannot justify moving.** `chooseByElbow`
 * settles a tie on the earliest candidate, so putting the incumbent first means a stage whose
 * candidates it genuinely cannot separate leaves every dial exactly where the reader had it. Without
 * it that guarantee rested on each ladder happening to open at the dial's own resting position — and
 * two did not: the line strength opens at the range floor of 1 against a dial that opens at 1.5, and
 * the ink threshold's ladder did not contain the dial's opening value of 64 at all, so a tie there
 * moved a reader's 64 to 16.
 *
 * It also makes the descent honest about its own starting point: the position the reader arrived at
 * is *in* the set being ranked at every stage rather than only at the first, so a stage can never
 * report a choice that was never compared with the one it replaced.
 *
 * The filter is what keeps it from costing anything on the stages whose ladder already holds the
 * incumbent — which is every reading stage, since the vote and expansion ladders are complete, and
 * every stage at all from the second round onwards, since a stage that moved a dial moved it onto its
 * own ladder.
 */
export function withIncumbent(
  candidates: readonly TunedDials[],
  settled: TunedDials,
): readonly [TunedDials, ...TunedDials[]] {
  return [settled, ...candidates.filter((candidate) => !sameTunedDials(candidate, settled))];
}

/**
 * Whether two positions are the same dial for dial — walked, never listed. See `TUNED_DIAL_KEYS`.
 *
 * Exported because the descent asks the same question of a whole round that {@link withIncumbent}
 * asks of one candidate: a round that ends where it began is the round that ends the sweep.
 */
export function sameTunedDials(a: TunedDials, b: TunedDials): boolean {
  return TUNED_DIAL_KEYS.every((key) => a[key] === b[key]);
}

/**
 * The swept dials, read off any full set of the pipeline's own.
 *
 * Written out rather than spread, because {@link TunedDials} is a deliberate subset: a `...tuning`
 * here would carry the keying, the dither and the six readings the sweep must not move into the value
 * the stages then vary. Taking {@link QuantiseTuning} rather than the settings object is what lets
 * the tests build a starting position from `QUANTISE_DEFAULT_DIALS` through this same function rather
 * than through a hand-written copy of the list that is free to fall behind it.
 */
export function tunedDialsOf(tuning: QuantiseTuning): TunedDials {
  return {
    vote: tuning.vote,
    outlineExpansion: tuning.outlineExpansion,
    lineStrength: tuning.lineStrength,
    trimStrength: tuning.trimStrength,
    inkThreshold: tuning.inkThreshold,
    colorMerge: tuning.colorMerge,
    fillCleanup: tuning.fillCleanup,
    cleanupPasses: tuning.cleanupPasses,
    antiAliasThreshold: tuning.antiAliasThreshold,
    antiAliasStrength: tuning.antiAliasStrength,
    antiAliasRun: tuning.antiAliasRun,
    antiAliasPalette: tuning.antiAliasPalette,
  };
}
