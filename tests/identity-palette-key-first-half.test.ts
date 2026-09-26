import { CORPUS_HALVES } from './sheetCorpus.ts';
import { identityPaletteKeySuite } from './identityPaletteKeySuite.ts';

// The first half of the corpus. The suite, and what it asserts, is in `identityPaletteKeySuite.ts`.
identityPaletteKeySuite(CORPUS_HALVES[0]);
