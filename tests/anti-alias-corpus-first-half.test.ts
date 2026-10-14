import { CORPUS_HALVES } from './sheetCorpus.ts';
import { antiAliasCorpusSuite } from './antiAliasCorpusSuite.ts';

// The first half of the corpus. The suite, and what it asserts, is in `antiAliasCorpusSuite.ts`.
antiAliasCorpusSuite(CORPUS_HALVES[0]);
