import { describe, expect, it } from 'vitest';
import type { Rgba } from '../types/quantiser.ts';
import { packColor, unpackColor } from './imageData.ts';
import { lloydRefine } from './lloydRefine.ts';
import { srgbToOklab } from './oklab.ts';

const grey = (level: number, alpha = 255): Rgba => ({ r: level, g: level, b: level, a: alpha });
const WHITE = grey(255);

/** The weighted distance from every colour to its nearest entry, in the space the rounds work in. */
function weightedError(histogram: ReadonlyMap<number, number>, palette: readonly Rgba[]): number {
  const place = (color: Rgba): readonly number[] => {
    const lab = srgbToOklab(color.r, color.g, color.b);
    return [lab.L, lab.a, lab.b, color.a];
  };
  const entries = palette.map(place);
  let total = 0;
  for (const [key, weight] of histogram) {
    const point = place(unpackColor(key));
    const nearest = Math.min(
      ...entries.map((entry) => Math.hypot(...entry.map((value, axis) => value - (point[axis] ?? 0)))),
    );
    total += nearest * weight;
  }
  return total;
}

/** A histogram from colours and their weights, in the order given. */
function histogramOf(entries: readonly (readonly [Rgba, number])[]): ReadonlyMap<number, number> {
  return new Map(entries.map(([color, weight]) => [packColor(color), weight]));
}

describe('lloydRefine', () => {
  // Three greys two steps apart and a white far from them. The first grey is the heaviest, so it is
  // the entry a "most weight" pick hands over, and the middle grey is the one nearest the cell's mean.
  const RAMP = histogramOf([
    [grey(98), 2],
    [grey(100), 1.5],
    [grey(102), 1.5],
    [WHITE, 1],
  ]);

  it('moves an entry to the member nearest its cell’s mean', () => {
    expect(lloydRefine(RAMP, [grey(98), WHITE], 4)).toEqual([grey(100), WHITE]);
  });

  it('returns the palette unchanged after no rounds', () => {
    expect(lloydRefine(RAMP, [grey(98), WHITE], 0)).toEqual([grey(98), WHITE]);
  });

  it('keeps each entry in the position it was handed in', () => {
    // A caller reads the order: `identityPalette` re-sorts it, and a tie in `nearestColorSearch`
    // goes to the earlier entry.
    expect(lloydRefine(RAMP, [WHITE, grey(98)], 4)).toEqual([WHITE, grey(100)]);
  });

  it('never returns a colour the histogram does not hold', () => {
    // The mean of 98 and 104 at equal weight is 101, which the histogram does not hold.
    const gapped = histogramOf([
      [grey(98), 1],
      [grey(104), 1],
      [WHITE, 1],
    ]);
    const [refined] = lloydRefine(gapped, [grey(98), WHITE], 4);
    expect([grey(98), grey(104)]).toContainEqual(refined);
  });

  it('keeps entries distinct when two of them start in one cluster', () => {
    const cluster = histogramOf([
      [grey(60), 1],
      [grey(61), 1],
      [grey(62), 1],
      [grey(63), 1],
      [WHITE, 1],
    ]);
    const refined = lloydRefine(cluster, [grey(60), grey(61), WHITE], 8);
    expect(new Set(refined.map(packColor)).size).toBe(3);
  });

  it('measures coverage as a fourth axis, so a soft edge joins the soft entry', () => {
    // The heavy soft-edge colour is two levels from the opaque grey and eighteen from the soft one
    // in colour alone, so without coverage it would join the opaque grey's cell and pull that entry
    // onto itself. With coverage it is 205 from the opaque grey and joins the soft entry instead.
    const edge = histogramOf([
      [grey(100), 1],
      [grey(120, 40), 1],
      [grey(102, 50), 10],
    ]);
    expect(lloydRefine(edge, [grey(100), grey(120, 40)], 4)).toEqual([grey(100), grey(102, 50)]);
  });

  it('refuses an entry the histogram does not hold', () => {
    expect(() => lloydRefine(RAMP, [grey(99)], 1)).toThrow('does not hold');
  });

  it('never returns a palette worse than the one it was handed', () => {
    // A snapped round can raise the error, so this holds only because the best palette is kept.
    let state = 472;
    const next = (): number => {
      state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
      return state >>> 24;
    };
    for (let trial = 0; trial < 20; trial += 1) {
      const colors = Array.from({ length: 120 }, (): Rgba => ({ r: next(), g: next(), b: next(), a: 255 }));
      const histogram = histogramOf(colors.map((color) => [color, 1 + (next() % 7)]));
      const seed = [...histogram.keys()].slice(0, 6).map(unpackColor);
      const refined = lloydRefine(histogram, seed, 16);
      expect(weightedError(histogram, refined)).toBeLessThanOrEqual(weightedError(histogram, seed));
    }
  });
});
