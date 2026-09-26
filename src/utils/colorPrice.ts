import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import type { TunePrice, TuneReading, TunedDials } from '../types/autoTune.ts';
import type { QuantiseSettings } from '../types/quantiser.ts';
import { candidateReader } from './candidateReader.ts';
import { TUNE_READING_STAGE } from './tuneCellStages.ts';
import type { TuneCrop } from './tuneCrop.ts';
import { tunedDialsOf } from './tuneStage.ts';

/**
 * What one colour is worth on this sheet, in likeness: the one price every stage of the sweep ranks
 * its candidates at.
 *
 * **Why one price rather than an elbow per stage.** Each stage used to normalise its own candidates
 * into a unit square and take the knee, so the price of a colour was set by that stage's own cheapest
 * and dearest candidates. Two stages of one sweep then disagreed about what a colour was worth, and a
 * candidate nobody would pick moved the answer by moving an end of the square. A sweep that charges
 * every stage the same price is the constant-slope rule of rate–distortion optimisation (Ortega and
 * Ramchandran, 1998): at the answer, no dial can buy likeness with colours more cheaply than any
 * other, which is the only sense in which a set of dials chosen one stage at a time can be the best
 * trade the sweep saw.
 *
 * **Read once, from the reading stage at the tab's opening dials.** That ladder is the three readings
 * at every outline-expansion width — the two dials' whole ranges — so it asks the same fifteen
 * questions of every sheet, and it asks them at the positions every reader first sees. The price is
 * the slope of the chord between the cheapest and the most faithful of the candidates no other one
 * beats on both counts, which is the price at which the chord construction's knee is the best trade
 * on that frontier: `fidelity − price × colors` is highest exactly at the point standing furthest
 * above the chord. So on that ladder the rule reproduces the elbow it replaces, and every later stage
 * is charged what the elbow charged there rather than what its own ladder's ends would say.
 *
 * **At the tab's opening dials rather than the reader's**, so the price is a fact about the sheet and
 * the settings the sweep may not move, and not about where the reader happened to leave the dials.
 * That is what makes a second press answer the same as the first: the sweep ends on a round that
 * moves nothing at this price, and the second press is charged the same price from there. Where the
 * reader's dials are the opening ones the fifteen positions are the descent's own first stage, and
 * `candidateReader` runs each of them once.
 *
 * **With no colour reduction, whatever the reader has set.** A budget or a pinned palette holds every
 * candidate to the same few colours, so a chord read under one has no colour span to divide by:
 * measured on `test_sprites/armour.png` at a grid of 6 with a budget of 16, every one of the fifteen
 * positions spends exactly 16 colours across the crops, and the chord prices a colour at nothing.
 * Pricing colours at nothing under a budget is wrong: on `test_sprites/cyborg_monk.png` at a grid of
 * 4, a budget of 16 and the anti-aliasing at `BOTH`, the blended shades then cost nothing and the
 * sweep spent 67 colours against the reader's 16. Read without the reduction, the price is what a colour is worth to this artwork, and a stage
 * under a budget spends or saves colours at that rate like any other. Where no reduction is in force
 * the sweep's own reader is used, so nothing is read twice.
 *
 * **`0` where the frontier offers no trade** — one candidate beats every other on both counts, or
 * every candidate spends the same colours. Then the readings say nothing about what a colour is
 * worth, and the sweep ranks on likeness alone.
 */
export function colorPrice(
  crops: readonly TuneCrop[],
  settings: QuantiseSettings,
  read: (dials: TunedDials) => TuneReading,
): TunePrice {
  const unreduced =
    settings.reduction === null ? read : candidateReader(crops, { ...settings, reduction: null });
  const plan = TUNE_READING_STAGE.plan(tunedDialsOf(QUANTISE_DEFAULT_DIALS), settings);
  // The reading stage never skips; the branch is what the plan's union asks of a caller.
  const positions = 'skipped' in plan ? [] : plan.candidates;
  return { perColor: chordSlope(positions.map(unreduced)), positions: positions.length };
}

/** The likeness per colour between the two ends of the readings' Pareto frontier, or `0` with no trade. */
function chordSlope(readings: readonly TuneReading[]): number {
  const frontier = paretoFrontier(readings);
  const first = frontier[0];
  const last = frontier[frontier.length - 1];
  if (first === undefined || last === undefined) return 0;
  const colorSpan = last.colors - first.colors;
  const claritySpan = last.fidelity - first.fidelity;
  return colorSpan > 0 && claritySpan > 0 ? claritySpan / colorSpan : 0;
}

/**
 * The readings nothing else beats on both counts, cheapest first.
 *
 * Sorted by colour count and then by fidelity, so one sweep answers it: a reading joins the frontier
 * when it is more faithful than everything cheaper. Strictly more, so two readings that reproduce the
 * crop equally well leave only the cheaper of them. The frontier therefore rises as it spends, and its
 * last member is the most faithful reading of the set.
 */
function paretoFrontier(readings: readonly TuneReading[]): readonly TuneReading[] {
  const order = [...readings].sort((a, b) => a.colors - b.colors || b.fidelity - a.fidelity);
  const frontier: TuneReading[] = [];
  let best = -Infinity;
  for (const reading of order) {
    if (reading.fidelity <= best) continue;
    best = reading.fidelity;
    frontier.push(reading);
  }
  return frontier;
}
