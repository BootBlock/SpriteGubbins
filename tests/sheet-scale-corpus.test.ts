import { beforeAll, describe, expect, it } from 'vitest';
import { CORPUS_SHEETS, loadCorpus, type CorpusSheetName } from './sheetCorpus.ts';
import { detectPixelGrid, measureSheetScale } from '../src/utils/pixelGrid.ts';
import { estimateMeshPeriod } from '../src/utils/meshPeriod.ts';
import { estimatePixelGrid } from '../src/utils/pixelPeriod.ts';
import { estimateProfilePeriod } from '../src/utils/profilePeriod.ts';
import type { SheetScale } from '../src/types/quantiser.ts';

/**
 * What each of the four scale readings answers on the eight sheets in `test_sprites/`.
 *
 * **The hit rate, written down.** Every calibrated figure these readings carry was measured on
 * hand-built fixtures — softened art at 4, 6, 8, 12 and 16, a small sprite on a large key field —
 * and each of their docblocks says so. What nothing recorded was what the readings do on the only
 * real generator output this project has, so a change that halved the hit rate would have passed
 * every test in the suite. This file is that record: the answer each reading gives on each sheet,
 * pinned exactly, so the next recalibration has to state what it did to all eight.
 *
 * **The true pitch of each sheet is measured, not assumed.** It is read off the correlation of each
 * axis's differenced step profile — the comb a pixel grid puts at multiples of its own pitch — with
 * a decode and a correlation written outside the app, so the ground truth does not come from the
 * code being judged. Where the app answers, the answer is that pitch or the integer below it.
 *
 * **No sheet in this corpus carries a global integer lattice**, which is the fact the two silent
 * readings turn on. Measured across all eight, both axes and every candidate from 3 to 24: the best
 * phase class of any candidate holds within one per cent of chance, and the lattice share
 * `estimatePixelGrid` scores — corrected for chance, as it corrects it — never exceeds 0.16 against
 * a threshold of 0.9. Re-measured with the phase searched *afresh in every 64-pixel window*, so
 * drift cannot decohere it, the best any sheet reaches is 0.35. The pitch of real generator output
 * drifts, so there is no lattice to find at any phase, and no threshold that would find one.
 */

/** The pitch each sheet's art was actually drawn at, measured outside the app — see above. */
const NATIVE_PITCH: Record<CorpusSheetName, string> = {
  'armour.png': '3 — a clean comb at 3, 6, 9, 12, 15, 18 with troughs between, on both axes',
  'cyborg_black_red.png': '≈3.4 — peaks at 3, 7, 10, 14, 17, 20, 24, 27, 31, 34 and 38 on both axes',
  'character_space_marine_blue.png': '≈2, weakly — r(2) reaches only +0.14 across and +0.19 down',
  'cyborg_monk.png': 'none discernible — no lag clears +0.16 on either axis',
  'cyborg_healer.png': '2 — every even lag a peak and every odd lag a trough, out past lag 20',
  'three-quarter-view_tiles1.png': '4 — +0.38 across and +0.43 down, with little beyond the fundamental',
  'ui_elements1.png': '≈4.7 — the rows comb runs 5, 9, 14, and the columns split their peak over 4 and 5',
  'vehicles_and_props.png': '≈2, weakly — r(2) reaches +0.18 across and +0.39 down',
};

/**
 * What each reading answers, per sheet.
 *
 * `null` is a refusal, and on this corpus most of them are the honest answer rather than a miss.
 * Each sheet's `note` says which gate produced its refusal, so lowering that gate is a decision
 * somebody has to take deliberately rather than discover.
 */
interface CorpusReadings {
  readonly detected: number | null;
  readonly estimated: number | null;
  readonly correlated: number | null;
  readonly drifting: number | null;
  /** What the tab actually offers, and how it labels it. */
  readonly offered: SheetScale | null;
  /** Why this sheet answers as it does, in one line. */
  readonly note: string;
}

const estimatedScale = (grid: number): SheetScale => ({ grid, measurement: 'ESTIMATED' });

const EXPECTED: Record<CorpusSheetName, CorpusReadings> = {
  'armour.png': {
    detected: null,
    estimated: null,
    correlated: 3,
    drifting: null,
    offered: estimatedScale(3),
    note: 'The reference sheet. Both axes settle on 3 and both can vouch for it.',
  },
  'cyborg_black_red.png': {
    detected: null,
    estimated: null,
    correlated: 3,
    drifting: null,
    offered: estimatedScale(3),
    note: 'A fractional pitch answered at its finer neighbour, which under-reduces rather than merging cells.',
  },
  'character_space_marine_blue.png': {
    detected: null,
    estimated: null,
    correlated: null,
    drifting: null,
    offered: null,
    note: 'No lag on either axis clears the prominence a candidate needs. Nothing to offer, and nothing missed.',
  },
  'cyborg_monk.png': {
    detected: null,
    estimated: null,
    correlated: null,
    drifting: null,
    offered: null,
    note: 'The same, on the weakest structure in the corpus: uneven rows of parts, with no pitch a reading can see.',
  },
  'cyborg_healer.png': {
    detected: null,
    estimated: null,
    correlated: 2,
    drifting: null,
    offered: estimatedScale(2),
    note: 'A period-2 comb, read at 2 on both axes.',
  },
  'three-quarter-view_tiles1.png': {
    detected: null,
    estimated: null,
    correlated: null,
    drifting: null,
    offered: null,
    note: 'Both axes settle on the true 4, and neither can vouch for it: the double carries 0.055 across and 0.156 down, against a floor of 0.3.',
  },
  'ui_elements1.png': {
    detected: null,
    estimated: null,
    correlated: null,
    drifting: null,
    offered: null,
    note: 'The rows settle on the true 5 with 0.448 of support against a floor of 0.5, and the columns find no peak to corroborate it.',
  },
  'vehicles_and_props.png': {
    detected: null,
    estimated: null,
    correlated: null,
    drifting: null,
    offered: null,
    note: 'The rows settle on 2 with no correlation at its double (0.063), and the columns find no peak.',
  },
};

/**
 * The sheets the tab reads a scale on, and the readings that answer at all.
 *
 * Stated as its own assertion rather than left to be counted off the table above, because the hit
 * rate is the number this file exists to hold still — and because a change that moves an answer
 * from one reading to another leaves the count untouched while changing what the tab relies on.
 */
const EXPECTED_HIT_RATE = {
  detected: 0,
  estimated: 0,
  correlated: 3,
  drifting: 0,
  offered: 3,
} as const;

describe('the scale readings, over the eight reference sheets', () => {
  let corpus: ReadonlyMap<CorpusSheetName, ImageData>;

  beforeAll(async () => {
    corpus = await loadCorpus();
  }, 600_000);

  it.each(CORPUS_SHEETS)(
    'reads %s as recorded',
    (name) => {
      const image = corpus.get(name);
      expect(image, `${name} did not decode`).toBeDefined();
      if (image === undefined) return;

      const expected = EXPECTED[name];
      const actual = {
        detected: detectPixelGrid(image),
        estimated: estimatePixelGrid(image),
        correlated: estimateProfilePeriod(image),
        drifting: estimateMeshPeriod(image),
        offered: measureSheetScale(image),
      };

      expect(actual, `${name}: ${expected.note} Native pitch: ${NATIVE_PITCH[name]}.`).toStrictEqual({
        detected: expected.detected,
        estimated: expected.estimated,
        correlated: expected.correlated,
        drifting: expected.drifting,
        offered: expected.offered,
      });
    },
    600_000,
  );

  it('answers on the recorded share of the corpus', () => {
    const answered = (pick: (readings: CorpusReadings) => unknown): number =>
      CORPUS_SHEETS.filter((name) => pick(EXPECTED[name]) !== null).length;

    expect({
      detected: answered((readings) => readings.detected),
      estimated: answered((readings) => readings.estimated),
      correlated: answered((readings) => readings.correlated),
      drifting: answered((readings) => readings.drifting),
      offered: answered((readings) => readings.offered),
    }).toStrictEqual(EXPECTED_HIT_RATE);
  });

  it('offers only pitches the sheet was drawn at', () => {
    // Every offered grid is the measured native pitch or the integer below it — never above it, and
    // never a multiple of it. Offering too fine leaves the reader a sheet to finish reducing, which
    // they can see; offering too coarse merges the art's own cells, which nothing can undo.
    const offered = CORPUS_SHEETS.map((name) => [name, EXPECTED[name].offered?.grid ?? null] as const);

    expect(offered).toStrictEqual([
      ['armour.png', 3],
      ['cyborg_black_red.png', 3],
      ['character_space_marine_blue.png', null],
      ['cyborg_monk.png', null],
      ['cyborg_healer.png', 2],
      ['three-quarter-view_tiles1.png', null],
      ['ui_elements1.png', null],
      ['vehicles_and_props.png', null],
    ]);
  });
});
