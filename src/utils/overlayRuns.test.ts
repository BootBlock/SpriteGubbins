import { describe, expect, it } from 'vitest';
import type { ComponentGroup } from '../types/components.ts';
import type { OverlayLine } from '../types/overlayLine.ts';
import { overlayRuns } from './overlayRuns.ts';

const LIBRARY: ComponentGroup = { heading: 'Library', entries: [] };
const YOURS: ComponentGroup = { heading: 'Yours', entries: [], additional: true };

function library(label: string, count: number): OverlayLine {
  return {
    group: LIBRARY,
    entry: { label, text: `${label} ×${String(count)}`, count, kind: 'structure' },
    count,
  };
}

function yours(name: string, count: number): OverlayLine {
  const label = name.toLowerCase();
  return {
    group: YOURS,
    entry: { label, text: `${name} ×${String(count)}`, count, kind: 'structure' },
    count,
    piece: { name, count },
  };
}

/** Each run as its lines' texts. */
function textsOf(runs: readonly (readonly OverlayLine[])[]) {
  return runs.map((run) => run.map((line) => line.entry.text));
}

describe('overlayRuns', () => {
  it('keeps every line whole where whole lines fill the fewest runs', () => {
    const runs = overlayRuns([library('Veil', 3), yours('Star', 1), yours('Chevron', 2)], 4);
    expect(textsOf(runs)).toEqual([['Veil ×3'], ['Star ×1', 'Chevron ×2']]);
  });

  it('lays a reader’s piece across two runs where whole lines would take a third', () => {
    // Eight drawings fill two runs of four, but whole lines cut them three, three and two.
    const runs = overlayRuns([library('Veil', 3), yours('Star', 3), yours('Moon', 2)], 4);
    expect(textsOf(runs)).toEqual([
      ['Veil ×3', 'Star ×1: drawing 1 of the 3'],
      ['Star ×2: drawings 2 to 3 of the 3', 'Moon ×2'],
    ]);
  });

  it('lays a reader’s piece worth more than a run across runs, naming its drawings in turn', () => {
    const runs = overlayRuns([library('Veil', 3), yours('Mark', 5)], 4);
    expect(textsOf(runs)).toEqual([
      ['Veil ×3', 'Mark ×1: drawing 1 of the 5'],
      ['Mark ×4: drawings 2 to 5 of the 5'],
    ]);
    expect(runs.flat().flatMap((line) => line.entry.parts ?? [])).toEqual([
      'mark-1',
      'mark-2',
      'mark-3',
      'mark-4',
      'mark-5',
    ]);
  });

  it('never splits a line of the library, even where splitting it would save a run', () => {
    const runs = overlayRuns([library('Tier', 3), library('Sweep', 3), library('Halo', 2)], 4);
    expect(textsOf(runs)).toEqual([['Tier ×3'], ['Sweep ×3'], ['Halo ×2']]);
  });

  it('keeps a split piece’s count, so the runs together hold every drawing once', () => {
    const runs = overlayRuns([library('Veil', 2), yours('Mark', 9)], 4);
    expect(runs).toHaveLength(3);
    for (const run of runs) expect(run.reduce((sum, line) => sum + line.count, 0)).toBeLessThanOrEqual(4);
    expect(runs.flat().reduce((sum, line) => sum + line.count, 0)).toBe(11);
  });
});
