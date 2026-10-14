import { CORPUS_HALVES } from './sheetCorpus.ts';
import { paletteRefineCorpusSuite } from './paletteRefineCorpusSuite.ts';

// The first half of the corpus. The suite, and what it asserts, is in `paletteRefineCorpusSuite.ts`.
paletteRefineCorpusSuite(CORPUS_HALVES[0]);
