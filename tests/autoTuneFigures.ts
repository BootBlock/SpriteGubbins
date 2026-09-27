import { expect } from 'vitest';
import { loadCorpusSheet, type CorpusSheetName } from './sheetCorpus.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import type { TuneOutcome } from '../src/types/autoTune.ts';
import type { QuantiseSettings, VoteMethod } from '../src/types/quantiser.ts';
import { autoTune } from '../src/utils/autoTune.ts';

/**
 * The figures `constants/autoTune.ts` states about the sweep over the corpus, as one table, and the
 * conditions they are stated at.
 *
 * **Those figures drifted three times with nothing failing.** Each time a change to the sweep moved
 * where it settles, the docblock went on describing the sweep it replaced, and on two of those
 * occasions it named a reading the sweep no longer chooses. The `auto-tune-figures-*.test.ts` suites
 * run the real `autoTune` over each sheet and hold its answer to a row here, and
 * `auto-tune-figures-cost.test.ts` holds the sums and comparisons the docblock draws from the rows.
 * Like the `quantiser-figures-*` suites (see `calibrationSettings.ts`) they pin the figures rather
 * than the prose, so whoever makes one fail has to go and restate the docblock.
 *
 * Every row is measured with no colour budget and every dial at its opening position, at the grid in
 * the row, which is the run's own input rather than a reading of the sheet — see `TUNE_ROUNDS`.
 */
export interface TuneFigure {
  readonly rounds: number;
  /** Positions *ranked*, which counts one the descent ranks twice as two — see `candidateReader`. */
  readonly positions: number;
  readonly vote: VoteMethod;
  readonly colorMerge: number;
  readonly fillCleanup: number;
  readonly cleanupPasses: number;
  /** What the settled position spends across the crops — see `readCandidate`. */
  readonly colors: number;
}

/** Where the sweep settles on each sheet with the anti-aliasing at its own `OFF`, unkeyed and keyed. */
export interface CorpusTuneFigure {
  readonly grid: number;
  readonly unkeyed: TuneFigure & {
    /** Positions *run*: one the descent ranks twice is read once. */
    readonly runs: number;
  };
  readonly keyed: TuneFigure;
}

export const CORPUS_TUNE_FIGURES: Readonly<Record<CorpusSheetName, CorpusTuneFigure>> = {
  'three-quarter-view_tiles1.png': {
    grid: 5,
    unkeyed: {
      rounds: 4,
      positions: 192,
      runs: 136,
      vote: 'K_CENTROID',
      colorMerge: 15,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 36,
    },
    keyed: {
      rounds: 3,
      positions: 145,
      vote: 'K_CENTROID',
      colorMerge: 12,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 44,
    },
  },
  'armour.png': {
    grid: 6,
    unkeyed: {
      rounds: 3,
      positions: 145,
      runs: 80,
      vote: 'K_CENTROID',
      colorMerge: 12,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 58,
    },
    keyed: {
      rounds: 3,
      positions: 145,
      vote: 'K_CENTROID',
      colorMerge: 12,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 50,
    },
  },
  'cyborg_black_red.png': {
    grid: 6,
    unkeyed: {
      rounds: 3,
      positions: 145,
      runs: 93,
      vote: 'K_CENTROID',
      colorMerge: 15,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 37,
    },
    keyed: {
      rounds: 3,
      positions: 145,
      vote: 'K_CENTROID',
      colorMerge: 9,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 71,
    },
  },
  'cyborg_healer.png': {
    grid: 4,
    unkeyed: {
      rounds: 3,
      positions: 145,
      runs: 80,
      vote: 'K_CENTROID',
      colorMerge: 15,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 74,
    },
    keyed: {
      rounds: 3,
      positions: 145,
      vote: 'K_CENTROID',
      colorMerge: 15,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 59,
    },
  },
  'vehicles_and_props.png': {
    grid: 5,
    unkeyed: {
      rounds: 3,
      positions: 145,
      runs: 93,
      vote: 'K_CENTROID',
      colorMerge: 15,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 50,
    },
    keyed: {
      rounds: 2,
      positions: 102,
      vote: 'DOMINANT',
      colorMerge: 18,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 43,
    },
  },
  'character_space_marine_blue.png': {
    grid: 5,
    unkeyed: {
      rounds: 3,
      positions: 145,
      runs: 93,
      vote: 'K_CENTROID',
      colorMerge: 6,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 135,
    },
    keyed: {
      rounds: 3,
      positions: 145,
      vote: 'K_CENTROID',
      colorMerge: 6,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 123,
    },
  },
  'cyborg_monk.png': {
    grid: 4,
    unkeyed: {
      rounds: 2,
      positions: 102,
      runs: 55,
      vote: 'K_CENTROID',
      colorMerge: 15,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 46,
    },
    keyed: {
      rounds: 3,
      positions: 145,
      vote: 'K_CENTROID',
      colorMerge: 12,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 52,
    },
  },
  'ui_elements1.png': {
    grid: 4,
    unkeyed: {
      rounds: 2,
      positions: 102,
      runs: 55,
      vote: 'K_CENTROID',
      colorMerge: 15,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 26,
    },
    keyed: {
      rounds: 3,
      positions: 145,
      vote: 'K_CENTROID',
      colorMerge: 18,
      fillCleanup: 0,
      cleanupPasses: 1,
      colors: 16,
    },
  },
};

/**
 * The run's settings for one sheet: its grid, no colour budget, every other dial where it opens, and
 * where `keyed`, keying at the default tolerance against the sheet's top-left pixel.
 */
export function tuneSettings(
  sheet: ImageData,
  name: CorpusSheetName,
  keyed: boolean,
  over: Partial<QuantiseSettings> = {},
): QuantiseSettings {
  const [r = 0, g = 0, b = 0] = sheet.data;
  return {
    ...QUANTISE_DEFAULT_DIALS,
    grid: CORPUS_TUNE_FIGURES[name].grid,
    key: keyed ? { color: { r, g, b, a: 255 }, tolerance: DEFAULT_KEY_TOLERANCE } : null,
    reduction: null,
    ...over,
  };
}

/** One sheet swept under the stated conditions. */
export async function sweepCorpusSheet(
  name: CorpusSheetName,
  keyed: boolean,
  over: Partial<QuantiseSettings> = {},
): Promise<TuneOutcome> {
  const sheet = await loadCorpusSheet(name);
  return autoTune(sheet, tuneSettings(sheet, name, keyed, over));
}

/** Holds one outcome to its row: how long the descent ran, and every dial the corpus moves. */
export function expectTuneFigure(outcome: TuneOutcome, figure: TuneFigure): void {
  expect({
    rounds: outcome.rounds,
    positions: outcome.candidates,
    vote: outcome.dials.vote,
    colorMerge: outcome.dials.colorMerge,
    fillCleanup: outcome.dials.fillCleanup,
    cleanupPasses: outcome.dials.cleanupPasses,
    colors: outcome.reading.colors,
  }).toEqual({
    rounds: figure.rounds,
    positions: figure.positions,
    vote: figure.vote,
    colorMerge: figure.colorMerge,
    fillCleanup: figure.fillCleanup,
    cleanupPasses: figure.cleanupPasses,
    colors: figure.colors,
  });
}
