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

/**
 * The pitch each sheet's art was actually drawn at, measured outside the app — see above.
 *
 * `pitch` is `null` where the correlation shows no comb to read one off. `evidence` is what the
 * figure was read from, so a later measurement can be compared with this one rather than replacing
 * it silently.
 */
interface NativePitch {
  readonly pitch: number | null;
  readonly evidence: string;
}

const NATIVE_PITCH: Record<CorpusSheetName, NativePitch> = {
  'armour.png': {
    pitch: 3,
    evidence: 'a clean comb at 3, 6, 9, 12, 15 and 18 with troughs between, on both axes',
  },
  'cyborg_black_red.png': {
    pitch: 3.4,
    evidence: 'peaks at 3, 7, 10, 14, 17, 20, 24, 27, 31, 34 and 38 on both axes',
  },
  'character_space_marine_blue.png': {
    pitch: 2,
    evidence: 'weakly — r(2) reaches only +0.14 across and +0.19 down',
  },
  'cyborg_monk.png': { pitch: null, evidence: 'nothing discernible — no lag clears +0.16 on either axis' },
  'cyborg_healer.png': {
    pitch: 2,
    evidence: 'every even lag a peak and every odd lag a trough, out past lag 20',
  },
  'three-quarter-view_tiles1.png': {
    pitch: 4,
    evidence: '+0.38 across and +0.43 down, with little beyond the fundamental',
  },
  'ui_elements1.png': {
    pitch: 4.7,
    evidence: 'the rows comb runs 5, 9 and 14, and the columns split their peak over 4 and 5',
  },
  'vehicles_and_props.png': { pitch: 2, evidence: 'weakly — r(2) reaches +0.18 across and +0.39 down' },
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

/** The five answers one sheet produces — the readings' own output, with nothing expected about it. */
type CorpusAnswers = Omit<CorpusReadings, 'note'>;

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
  /**
   * What the readings actually answer, computed once.
   *
   * Every assertion below reads this rather than the {@link EXPECTED} table, which is the whole
   * point of the file: a test that compares the table with a second copy of the table passes
   * whatever the readings do.
   */
  const actual = new Map<CorpusSheetName, CorpusAnswers>();

  beforeAll(async () => {
    const corpus = await loadCorpus();
    for (const name of CORPUS_SHEETS) {
      const image = corpus.get(name);
      if (image === undefined) throw new Error(`${name} did not decode`);
      actual.set(name, {
        detected: detectPixelGrid(image),
        estimated: estimatePixelGrid(image),
        correlated: estimateProfilePeriod(image),
        drifting: estimateMeshPeriod(image),
        offered: measureSheetScale(image),
      });
    }
  }, 600_000);

  it.each(CORPUS_SHEETS)('reads %s as recorded', (name) => {
    const expected = EXPECTED[name];
    const native = NATIVE_PITCH[name];

    expect(
      actual.get(name),
      `${name}: ${expected.note} Native pitch: ${String(native.pitch)} — ${native.evidence}.`,
    ).toStrictEqual({
      detected: expected.detected,
      estimated: expected.estimated,
      correlated: expected.correlated,
      drifting: expected.drifting,
      offered: expected.offered,
    });
  });

  it('answers on the recorded share of the corpus', () => {
    const answered = (pick: (answers: CorpusAnswers) => unknown): number =>
      CORPUS_SHEETS.filter((name) => pick(answers(name)) !== null).length;

    expect({
      detected: answered((a) => a.detected),
      estimated: answered((a) => a.estimated),
      correlated: answered((a) => a.correlated),
      drifting: answered((a) => a.drifting),
      offered: answered((a) => a.offered),
    }).toStrictEqual(EXPECTED_HIT_RATE);
  });

  it('offers only pitches the sheet was drawn at, and never a coarser one', () => {
    // Offering too fine leaves the reader a sheet to finish reducing, which they can see; offering
    // too coarse merges the art's own cells, which nothing can undo. So an offer has to be the
    // measured pitch or the integer below it — never above it, and never a multiple of it. A sheet
    // with no measurable pitch may not be offered one at all.
    for (const name of CORPUS_SHEETS) {
      const offered = answers(name).offered;
      if (offered === null) continue;
      const { pitch, evidence } = NATIVE_PITCH[name];

      expect(pitch, `${name} was offered ${String(offered.grid)} with no pitch to justify it`).not.toBeNull();
      if (pitch === null) continue;

      expect(
        offered.grid,
        `${name}: offered ${String(offered.grid)} against a pitch of ${String(pitch)} — ${evidence}`,
      ).toBeLessThanOrEqual(pitch);
      expect(
        offered.grid,
        `${name}: offered ${String(offered.grid)}, more than a pixel under its pitch of ${String(pitch)}`,
      ).toBeGreaterThan(pitch - 1);
    }
  });

  /** One sheet's answers, or a failure naming the sheet — `beforeAll` fills every entry. */
  function answers(name: CorpusSheetName): CorpusAnswers {
    const found = actual.get(name);
    if (found === undefined) throw new Error(`${name} was never read`);
    return found;
  }
});
