import { TUNE_SCORE_MARGIN } from '../constants/autoTune.ts';
import type { TuneReading } from '../types/autoTune.ts';

/**
 * Which of a stage's candidates to take: the best score at the sweep's price of a colour, if it
 * beats the dials in force by more than {@link TUNE_SCORE_MARGIN}.
 *
 * **The score is `fidelity − price × colors`**, one number for every stage — see `colorPrice` for
 * where the price comes from and why there is only one. A candidate that spends more colours has to
 * buy at least the price in likeness for each of them, and one that saves colours is credited the
 * price for each.
 *
 * **The first reading is the dials in force, and they stay unless beaten by the margin.** That is
 * `withIncumbent`'s contract: it puts the incumbent at the head of every stage's list. Without the
 * margin, a stage moves a dial for any gain at all: on `test_sprites/armour.png` the cleanup passes
 * go from 1 to 2 for a gain below 0.00005. Kneedle asks the same of a knee before it declares one
 * (Satopää et al., 2011): a difference has to clear a stated threshold before it counts as one.
 *
 * Ties among the challengers are settled by the earliest, so the answer does not depend on how a
 * sort left them. Takes a non-empty list in the type rather than checking for one.
 */
export function chooseByPrice(readings: readonly [TuneReading, ...TuneReading[]], price: number): number {
  const score = (reading: TuneReading) => reading.fidelity - price * reading.colors;
  const incumbent = score(readings[0]);
  let best = 0;
  let top = incumbent;
  readings.forEach((reading, index) => {
    if (score(reading) > top) {
      top = score(reading);
      best = index;
    }
  });
  return top - incumbent > TUNE_SCORE_MARGIN ? best : 0;
}
