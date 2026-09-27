import { describe, it } from 'vitest';
import { CORPUS_TUNE_FIGURES, expectTuneFigure, sweepCorpusSheet } from './autoTuneFigures.ts';
import type { CorpusSheetName } from './sheetCorpus.ts';

/**
 * Where the sweep settles on the first four sheets when each is keyed at the default tolerance against its corner colour, which the docblock's paragraph on coverage compares with the unkeyed table. See `autoTuneFigures.ts` for why the auto-tune figure suites exist, and
 * `auto-tune-figures-cost.test.ts` for the comparison with the unkeyed sweep the docblock draws.
 */
const SHEETS: readonly CorpusSheetName[] = [
  'armour.png',
  'three-quarter-view_tiles1.png',
  'cyborg_black_red.png',
  'cyborg_healer.png',
];

describe('constants/autoTune.ts — where the sweep settles, keyed', () => {
  it.each(SHEETS)(
    'settles %s keyed against its corner colour where the docblock says',
    async (name) => {
      expectTuneFigure(await sweepCorpusSheet(name, true), CORPUS_TUNE_FIGURES[name].keyed);
    },
    300_000,
  );
});
