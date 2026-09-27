import { describe, expect, it, vi } from 'vitest';
import { CORPUS_TUNE_FIGURES, expectTuneFigure, sweepCorpusSheet } from './autoTuneFigures.ts';
import type { CorpusSheetName } from './sheetCorpus.ts';

/**
 * Where the sweep settles on three of the seven sheets the reference sheet is checked against, unkeyed — the first half of the table under `TUNE_ROUNDS`. See `autoTuneFigures.ts` for why the auto-tune figure suites exist, and
 * `auto-tune-figures-reference.test.ts` for the reference sheet.
 *
 * `readCandidate` is counted rather than replaced, so every figure is the real pipeline's, and the
 * count is the positions the sweep *ran* where `TuneOutcome.candidates` is the positions it ranked.
 */
const runs = vi.hoisted(() => ({ count: 0 }));

vi.mock('../src/utils/tuneCandidate.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/utils/tuneCandidate.ts')>();
  return {
    ...actual,
    readCandidate: (...args: Parameters<typeof actual.readCandidate>) => {
      runs.count += 1;
      return actual.readCandidate(...args);
    },
  };
});

const SHEETS: readonly CorpusSheetName[] = [
  'three-quarter-view_tiles1.png',
  'cyborg_black_red.png',
  'cyborg_healer.png',
];

describe('constants/autoTune.ts — where the sweep settles, unkeyed', () => {
  it.each(SHEETS)(
    'settles %s where TUNE_ROUNDS says, in the positions it says',
    async (name) => {
      runs.count = 0;
      const outcome = await sweepCorpusSheet(name, false);
      expectTuneFigure(outcome, CORPUS_TUNE_FIGURES[name].unkeyed);
      expect(runs.count).toBe(CORPUS_TUNE_FIGURES[name].unkeyed.runs);
    },
    300_000,
  );
});
