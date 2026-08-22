import { describe, expect, it } from 'vitest';
import { walkEdgeRuns, type RunTurn } from './edgeRuns.ts';

/**
 * The reconstructed coverage, per index, for one boundary line described as a string.
 *
 * `separated` reads a mask of `#` and `.`; `turns` reads the crossing edge at each *gap*, so it is
 * one character longer than the mask — `<` for the low side, `>` for the high side and `.` for
 * neither. Writing the fixture this way is what keeps a test about run geometry from being a test
 * about image indexing: every case below is a picture of the boundary it is about.
 */
function coverages(separated: string, turns: string, shortestRun = 2): Map<number, number> {
  const found = new Map<number, number>();
  const turnAt = (index: number): RunTurn => {
    const mark = turns[index];
    if (mark === '<') return 'LOW';
    return mark === '>' ? 'HIGH' : 'NONE';
  };
  walkEdgeRuns(
    separated.length,
    shortestRun,
    (index) => separated[index] === '#',
    turnAt,
    (index, coverage) => found.set(index, coverage),
  );
  return found;
}

describe('walkEdgeRuns', () => {
  it('finds nothing along a boundary that never separates', () => {
    expect(coverages('......', '.......').size).toBe(0);
  });

  it('leaves a run alone when neither end turns', () => {
    // A contour that runs off both edges of the image has no crossing edge to reconstruct a slope
    // from, so there is no direction the intended line could have taken.
    expect(coverages('######', '.......').size).toBe(0);
  });

  it('reproduces the analytic coverage of a straight slope across a Z-shaped run', () => {
    // The staircase case: the run's two ends turn opposite ways, so the reconstruction crosses the
    // discontinuity at the run's centre and the areas are those of a straight line of slope 1/6.
    // Column centres sit 2.5, 1.5, 0.5, 0.5, 1.5 and 2.5 from that crossing and each half is three
    // pixels long, so the areas run 0.5 × d / 3 — positive on the side the low end claims, negative
    // on the other.
    const found = coverages('######', '<.....>');
    expect([...found.keys()].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(found.get(0)).toBeCloseTo(2.5 / 6, 10);
    expect(found.get(1)).toBeCloseTo(1.5 / 6, 10);
    expect(found.get(2)).toBeCloseTo(0.5 / 6, 10);
    // Past the crossing the sign flips, because the reconstructed line is now on the other side.
    expect(found.get(3)).toBeCloseTo(-0.5 / 6, 10);
    expect(found.get(4)).toBeCloseTo(-1.5 / 6, 10);
    expect(found.get(5)).toBeCloseTo(-2.5 / 6, 10);
  });

  it('keeps both halves on the same side of the boundary for a U-shaped run', () => {
    // Both ends turn the same way, so both halves claim the same side of the discontinuity and the
    // reconstruction bulges rather than crossing — a one-pixel notch, whose intended shape is a
    // shallow curve and not a straight line. The signs are what separate this from the Z above.
    const found = coverages('####', '<...<');
    expect(found.get(0)).toBeCloseTo(0.5 * (1.5 / 2), 10);
    expect(found.get(1)).toBeCloseTo(0.5 * (0.5 / 2), 10);
    expect(found.get(2)).toBeCloseTo(0.5 * (0.5 / 2), 10);
    expect(found.get(3)).toBeCloseTo(0.5 * (1.5 / 2), 10);
  });

  it('blends only the half whose end turns, where the other end runs off the image', () => {
    const found = coverages('####', '....>');
    expect([...found.keys()].sort((a, b) => a - b)).toEqual([2, 3]);
    expect(found.get(2)).toBeCloseTo(-0.5 * (0.5 / 2), 10);
    expect(found.get(3)).toBeCloseTo(-0.5 * (1.5 / 2), 10);
  });

  it('blends nothing along a 45° staircase, whatever the shortest run allows', () => {
    // Every run is one pixel, so its only centre sits exactly where the reconstructed line crosses
    // the discontinuity and the areas either side of the crossing cancel. This is the behaviour that
    // lets a clean diagonal through untouched, and it is the geometry rather than a special case —
    // which is why the floor is set to 1 here, admitting runs it will still blend to nothing.
    expect(coverages('#.#.#.#', '<>.<>.<>', 1).size).toBe(0);
  });

  it('drops a run shorter than the floor', () => {
    expect(coverages('####', '<...>', 5).size).toBe(0);
    expect(coverages('####', '<...>', 4).size).toBe(4);
  });

  it('reads each run of a broken boundary separately', () => {
    const found = coverages('##.###', '<.><..>');
    expect([...found.keys()].sort((a, b) => a - b)).toEqual([0, 1, 3, 5]);
    // The two-pixel run either side of its own centre, and the three-pixel run with its middle
    // column sitting on the crossing and taking nothing.
    expect(found.get(0)).toBeCloseTo(0.25, 10);
    expect(found.get(1)).toBeCloseTo(-0.25, 10);
    expect(found.get(3)).toBeCloseTo(1 / 3, 10);
    expect(found.get(5)).toBeCloseTo(-1 / 3, 10);
  });

  it('never reaches half a pixel, however long the run', () => {
    const found = coverages('#'.repeat(64), '<' + '.'.repeat(63) + '>');
    for (const coverage of found.values()) expect(Math.abs(coverage)).toBeLessThan(0.5);
    // And it approaches it: the outermost column of a long run is very nearly a half-blend.
    expect(Math.abs(found.get(0) ?? 0)).toBeCloseTo(0.5 - 0.5 / 64, 10);
  });
});
