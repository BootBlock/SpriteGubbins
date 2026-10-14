import { CORPUS_HALVES } from './sheetCorpus.ts';
import { identityPaletteCorpusSuite } from './identityPaletteCorpusSuite.ts';

// The second half of the corpus. The suite, and what it asserts, is in `identityPaletteCorpusSuite.ts`.
identityPaletteCorpusSuite(CORPUS_HALVES[1]);
