import { describe, expect, it } from 'vitest';
import type { TuneReading } from '../types/autoTune.ts';
import { chooseByElbow } from './tuneScore.ts';

/** A reading, written the short way round so a candidate set reads as a curve. */
const at = (colors: number, fidelity: number): TuneReading => ({ colors, fidelity });

describe('chooseByElbow', () => {
  it('takes the only candidate there is', () => {
    expect(chooseByElbow([at(12, 0.8)])).toBe(0);
  });

  it('takes the more faithful of two, whatever it costs', () => {
    // Two points are a chord and nothing else, so there is no interior for a knee to be in.
    expect(chooseByElbow([at(8, 0.7), at(40, 0.95)])).toBe(1);
    expect(chooseByElbow([at(40, 0.95), at(8, 0.7)])).toBe(0);
  });

  it('takes the knee of a curve that flattens', () => {
    // Fidelity climbs steeply to 16 colours and barely moves after it, so 16 is where one more
    // colour starts buying least.
    const readings: [TuneReading, ...TuneReading[]] = [
      at(4, 0.5),
      at(8, 0.75),
      at(16, 0.93),
      at(32, 0.95),
      at(64, 0.96),
    ];

    expect(chooseByElbow(readings)).toBe(2);
  });

  it('takes the most faithful where every extra colour buys more than the last', () => {
    // A curve bending the other way has no point of diminishing returns, so the answer is to spend.
    const readings: [TuneReading, ...TuneReading[]] = [
      at(4, 0.5),
      at(8, 0.505),
      at(16, 0.52),
      at(32, 0.6),
      at(64, 0.99),
    ];

    expect(chooseByElbow(readings)).toBe(4);
  });

  it('falls back to fidelity where every candidate spends the same colours', () => {
    // Which is every sheet with the studio's palette budget in force: the reduction pins the count,
    // so there is no trade for an elbow to find.
    const readings: [TuneReading, ...TuneReading[]] = [at(32, 0.6), at(32, 0.9), at(32, 0.75)];

    expect(chooseByElbow(readings)).toBe(1);
  });

  it('ignores a candidate another candidate beats on both counts', () => {
    // The dominated middle point sits above the chord in raw coordinates and must still not win.
    const readings: [TuneReading, ...TuneReading[]] = [at(4, 0.5), at(20, 0.6), at(16, 0.93), at(64, 0.96)];

    expect(chooseByElbow(readings)).toBe(2);
  });

  it('settles a tie on the earliest candidate, which is where every ladder opens', () => {
    // Two candidates alike in both figures are one answer, and taking the first is what leaves an
    // off dial off rather than moving it to an equal position further along.
    const readings: [TuneReading, ...TuneReading[]] = [at(16, 0.9), at(16, 0.9), at(16, 0.9)];

    expect(chooseByElbow(readings)).toBe(0);
  });

  it('takes the cheaper of two candidates that reproduce the crop equally well', () => {
    const readings: [TuneReading, ...TuneReading[]] = [at(48, 0.9), at(12, 0.9)];

    expect(chooseByElbow(readings)).toBe(1);
  });

  it('is not swayed by the order the candidates arrive in', () => {
    const curve = [at(4, 0.5), at(8, 0.75), at(16, 0.93), at(32, 0.95), at(64, 0.96)];
    const shuffled: [TuneReading, ...TuneReading[]] = [
      curve[3] ?? at(0, 0),
      curve[0] ?? at(0, 0),
      curve[4] ?? at(0, 0),
      curve[2] ?? at(0, 0),
      curve[1] ?? at(0, 0),
    ];

    expect(shuffled[chooseByElbow(shuffled)]).toEqual(curve[2]);
  });
});
