import { beforeAll, describe, expect, it } from 'vitest';
import { calibrationSettings } from './calibrationSettings.ts';
import { loadCorpusSheet } from './sheetCorpus.ts';
import {
  DEFAULT_KEY_TOLERANCE,
  DEFAULT_SYMMETRY_CONFIDENCE,
  DEFAULT_SYMMETRY_TOLERANCE,
} from '../src/constants/quantiser.ts';
import { fromHex } from '../src/utils/imageData.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import type { QuantiseSettings, SpriteSymmetry } from '../src/types/quantiser.ts';

/**
 * The reduced-sheet figures the two symmetry dials' docblocks state: `SYMMETRY_TOLERANCE_RANGE`'s
 * flat run and `SYMMETRY_CONFIDENCE_RANGE`'s shares. See `calibrationSettings.ts` for why the
 * docblock-figure suites exist.
 *
 * **Measured through the colour budget**, so a change to the palette moves them — the k-means rounds
 * `buildPalette` runs after the Wu cut moved every one, with nothing pinning them. The unreduced
 * sweep beside them in the same docblock reads no budget, and is not asserted here.
 */
describe('the symmetry dials — the reduced reference sheet', () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  /**
   * The conditions `SYMMETRY_TOLERANCE_RANGE` states: grid 6, the ink-weighted reading at its
   * opening dials, the magenta key at 24, a budget of 64 with the colour merge at 24, and every
   * other dial where it opens. `CHECK` unless a case asks for the snap.
   */
  const REDUCED = (over: Partial<QuantiseSettings> = {}): QuantiseSettings => {
    const magenta = fromHex('#FF00FF');
    if (magenta === null) throw new Error('the key colour no longer parses');
    return calibrationSettings({
      key: { color: magenta, tolerance: DEFAULT_KEY_TOLERANCE },
      vote: 'INK_WEIGHTED',
      symmetry: 'CHECK',
      colorMerge: 24,
      ...over,
    });
  };

  const readingsAt = (over: Partial<QuantiseSettings>): readonly SpriteSymmetry[] => {
    const readings = quantiseImage(sheet, REDUCED(over)).symmetry;
    if (readings === null) throw new Error('the symmetry pass did not run');
    return readings;
  };

  const meanShare = (readings: readonly SpriteSymmetry[]): number =>
    readings.reduce((total, reading) => total + reading.confidence, 0) / readings.length;

  it('settles to 11 colours and reads 38.8% at every tolerance from exact to 24, first moving at 25', () => {
    expect(quantiseImage(sheet, REDUCED()).colors).toBe(11);

    const exact = readingsAt({ symmetryTolerance: 0 });
    expect(exact).toHaveLength(15);
    expect(Number((meanShare(exact) * 100).toFixed(1))).toBe(38.8);
    // Every rung, not a sample of them: the claim is that none of them moves, and the merge at 24 is
    // what makes it exactly true, so a rung in the middle moving is the failure to catch.
    for (let tolerance = 1; tolerance <= 24; tolerance += 1) {
      expect(meanShare(readingsAt({ symmetryTolerance: tolerance }))).toBe(meanShare(exact));
    }
    expect(Number((meanShare(readingsAt({ symmetryTolerance: 25 })) * 100).toFixed(1))).toBe(40);
  }, 600_000);

  it('reports 21% to 70% at the default tolerance, and settles two at 65, two at 60 and four at 55', () => {
    expect(DEFAULT_SYMMETRY_TOLERANCE).toBe(8);
    const shares = readingsAt({ symmetryTolerance: DEFAULT_SYMMETRY_TOLERANCE }).map(
      (reading) => reading.confidence,
    );
    expect(Math.round(Math.min(...shares) * 100)).toBe(21);
    expect(Math.round(Math.max(...shares) * 100)).toBe(70);

    // Counted from the snap itself rather than from the shares, because whether a sprite is settled
    // is the pass's decision and a share at the floor is only half of it.
    const settledAt = (floor: number) =>
      readingsAt({ symmetry: 'SNAP', symmetryConfidence: floor }).filter((reading) => reading.snapped);
    expect([DEFAULT_SYMMETRY_CONFIDENCE, 75, 65, 60].map((floor) => settledAt(floor).length)).toEqual([
      0, 0, 2, 2,
    ]);

    // The four at 55 each place their best axis within a pixel of their own box's centre.
    const four = settledAt(55);
    expect(four).toHaveLength(4);
    for (const { axis, box } of four) {
      expect(Math.abs(axis - (box.left + (box.width - 1) / 2))).toBeLessThanOrEqual(1);
    }
  }, 600_000);
});
