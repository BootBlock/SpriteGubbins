import { describe, expect, it } from 'vitest';
import { TUNE_SCORE_MARGIN } from '../constants/autoTune.ts';
import type { TuneReading } from '../types/autoTune.ts';
import { chooseByPrice } from './chooseByPrice.ts';

/** A reading, written the short way round so a candidate set reads as a curve. */
const at = (colors: number, fidelity: number): TuneReading => ({ colors, fidelity });

describe('chooseByPrice', () => {
  it('takes the only candidate there is', () => {
    expect(chooseByPrice([at(12, 0.8)], 0.001)).toBe(0);
  });

  it('takes the candidate with the best score at the price', () => {
    // At a thousandth a colour, 16 colours at 0.93 scores 0.914, which beats 0.746 at 4 colours
    // and 0.896 at 64.
    const readings: [TuneReading, ...TuneReading[]] = [at(4, 0.75), at(16, 0.93), at(64, 0.96)];

    expect(chooseByPrice(readings, 0.001)).toBe(1);
  });

  it('does not take a dearer point for a gain its colours do not pay for', () => {
    // The two-point case the elbow got wrong: it took the dearer point of any pair, so 400 colours
    // at 0.90001 beat 12 at 0.9. At any real price the cheaper point is the better trade.
    expect(chooseByPrice([at(12, 0.9), at(400, 0.90001)], 0.0001)).toBe(0);
    expect(chooseByPrice([at(400, 0.90001), at(12, 0.9)], 0.0001)).toBe(1);
  });

  it('keeps the dials in force against a gain inside the margin', () => {
    // Where candidates tie on colours the elbow took the highest likeness by any margin at all, and
    // moved dials for gains of 0.00001.
    expect(chooseByPrice([at(48, 0.8), at(48, 0.8 + TUNE_SCORE_MARGIN / 2)], 0.001)).toBe(0);
    expect(chooseByPrice([at(48, 0.8), at(48, 0.8 + 2 * TUNE_SCORE_MARGIN)], 0.001)).toBe(1);
  });

  it('counts the colours a candidate saves toward the margin', () => {
    // Twenty colours fewer at a thousandth each is 0.02, so a small loss of likeness still clears it.
    expect(chooseByPrice([at(40, 0.9), at(20, 0.895)], 0.001)).toBe(1);
    // At no price the same saving earns nothing, and the loss decides.
    expect(chooseByPrice([at(40, 0.9), at(20, 0.895)], 0)).toBe(0);
  });

  it('ranks on likeness alone where colours are free', () => {
    expect(chooseByPrice([at(32, 0.6), at(32, 0.9), at(64, 0.95)], 0)).toBe(2);
  });

  it('settles a tie among challengers that spend alike on the earliest', () => {
    expect(chooseByPrice([at(16, 0.5), at(16, 0.9), at(16, 0.9)], 0.001)).toBe(1);
  });

  it('settles a tie the price makes on the more faithful candidate, however the scores rounded', () => {
    // The two ends of the chord the price is read from score alike by construction: at the slope
    // between them, 0.3 for 3000 colours and 0.75 for 4500 both score exactly 0. Computed, the two
    // scores differ in the last bits, and which way depends on the platform's `**` — so the same
    // pair is nudged a few units in the last place each way, and the answer must not move.
    const price = (0.75 - 0.3) / (4500 - 3000);
    for (const nudge of [-4, -1, 0, 1, 4]) {
      const cheap = at(3000, 0.3 + nudge * Number.EPSILON);
      const faithful = at(4500, 0.75);
      const opening = at(4000, 0.4);
      const inOrder: [TuneReading, ...TuneReading[]] = [opening, cheap, faithful];
      const reversed: [TuneReading, ...TuneReading[]] = [opening, faithful, cheap];
      expect(inOrder[chooseByPrice(inOrder, price)]).toBe(faithful);
      expect(reversed[chooseByPrice(reversed, price)]).toBe(faithful);
    }
  });

  it('keeps a real difference far smaller than the margin a difference rather than a tie', () => {
    // The smallest gap between two best candidates the corpus shows is 0.0000009; it is ranked on
    // its score, and the more faithful candidate does not win it. At a thousandth a colour, 0.9 for
    // 20 colours scores 0.88, and 0.9000991 for 20.1 scores 0.8799991.
    const readings: [TuneReading, ...TuneReading[]] = [at(64, 0.5), at(20, 0.9), at(20.1, 0.9000991)];
    expect(chooseByPrice(readings, 0.001)).toBe(1);
    expect(chooseByPrice([at(64, 0.5), at(20.1, 0.9000991), at(20, 0.9)], 0.001)).toBe(2);
  });

  it('is not swayed by the order the challengers arrive in', () => {
    const curve = [at(4, 0.75), at(16, 0.93), at(64, 0.96), at(8, 0.8)];

    for (const order of [curve, [...curve].reverse()]) {
      const readings: [TuneReading, ...TuneReading[]] = [at(100, 0.5), ...order];
      expect(readings[chooseByPrice(readings, 0.001)]).toEqual(at(16, 0.93));
    }
  });
});
