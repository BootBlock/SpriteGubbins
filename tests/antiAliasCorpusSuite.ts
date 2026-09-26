import { beforeAll, describe, expect, it } from 'vitest';
import { BACKGROUND_KEY_COLORS } from '../src/constants/backgroundKeyColors.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import {
  ANTI_ALIAS_THRESHOLD_RANGE,
  DEFAULT_ANTI_ALIAS_RUN,
  DEFAULT_ANTI_ALIAS_STRENGTH,
  DEFAULT_ANTI_ALIAS_THRESHOLD,
} from '../src/constants/quantiser.ts';
import type { AntiAliasMode, QuantiseSettings } from '../src/types/quantiser.ts';
import { antiAlias } from '../src/utils/antiAlias.ts';
import { CHANNELS_PER_PIXEL, packedColorAt, unpackColor } from '../src/utils/imageData.ts';
import { srgbToOklab } from '../src/utils/oklab.ts';
import { pixelDistanceOf } from '../src/utils/pixelDistance.ts';
import { measureSheetScale } from '../src/utils/pixelGrid.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { loadCorpusSheet, type CorpusSheetName } from './sheetCorpus.ts';

/**
 * What the anti-aliasing pass does to the eight reference sheets at the positions its dials open at.
 *
 * **The calibration record for `DEFAULT_ANTI_ALIAS_THRESHOLD`, and the sheet-by-sheet statement a
 * recalibration makes.** `armour.png` is the reference the figure was chosen on;
 * the other seven are the check that it was not fitted to one layout — the terrain tiles are flat
 * colour with long shallow contours, the UI sheet is thin strokes, and the vehicles are dense
 * texture. A later change to the floor states what it did to all eight here, in this table.
 *
 * **Each sheet is quantised first**, because that is the only state the pass ever sees one in: it is
 * the last thing to run in `quantiseImage`, over a sheet the readings, the merge and the cleanup have
 * already flattened. The dials are the ones the tab opens at, with two additions the tab does not
 * open at and which are stated rather than assumed — the magenta key, since every one of these sheets
 * arrives with its field still on it, and a 64-colour budget, since a floor stated in colour distance
 * means something quite different on a sheet whose colours were never reduced.
 *
 * **`SILHOUETTE` is not tabulated**, and the two columns that are here do not let it be recovered by
 * subtraction. `BOTH` takes the *union* of the two kinds of boundary, and a pixel reached by one of
 * each keeps only the stronger claim — which on a keyed sheet's outer contour is a common
 * configuration — so `both − interior` understates it. What the pair does say is the one thing worth
 * recording: how much of each sheet the safe half of the pass reaches, and how much more the whole
 * of it does.
 *
 * Run as two files, `anti-alias-corpus-first-half.test.ts` and `-second-half.test.ts`, each over one
 * of `CORPUS_HALVES`, so the two halves can take two workers.
 */
interface CorpusReading {
  /** The share of the result's pixels the pass moves under `BOTH`, as a percentage. */
  readonly both: number;
  /** The same under `INTERIOR`, which leaves every silhouette where it is. */
  readonly interior: number;
  /**
   * The share of the sheet's differing neighbouring pairs that fall **below** the contrast floor, as
   * a percentage — the boundaries the floor refuses.
   *
   * The figure the default is actually chosen against, and the reason it is measured here rather
   * than asserted in the constant's docblock: it is a property of real generator output, and a
   * sentence stating it beside the number would be free to drift from what the sheets hold. What it
   * counts is the near-duplicate shading steps a colour budget leaves inside a fill, which are
   * exactly what a pass following every boundary would smear together.
   */
  readonly refused: number;
  /** Why this sheet reads as it does, in one line. */
  readonly note: string;
}

const EXPECTED: Record<CorpusSheetName, CorpusReading> = {
  'armour.png': {
    both: 9.3,
    interior: 7.78,
    refused: 40.2,
    note: 'The reference. Fifteen gear pieces at a pixel scale of 3, so contour is a large share of a small sheet.',
  },
  'cyborg_black_red.png': {
    both: 7.71,
    interior: 6.3,
    refused: 56.5,
    note: 'The same layout in a darker palette, whose emissive green puts more than half its boundaries under the floor.',
  },
  'character_space_marine_blue.png': {
    both: 5.22,
    interior: 4.61,
    refused: 69.1,
    note: 'Large soft cloth areas, which a budget renders as many near-identical shades the floor then refuses.',
  },
  'cyborg_monk.png': {
    both: 4.65,
    interior: 3.58,
    refused: 59.5,
    note: 'A whole character in parts, at no measurable pixel scale — so the pass runs on the sheet’s own pixels.',
  },
  'cyborg_healer.png': {
    both: 8.24,
    interior: 6.23,
    refused: 42.2,
    note: 'The widest gap between the two columns: loose accessories are mostly silhouette and little interior.',
  },
  'three-quarter-view_tiles1.png': {
    both: 2.56,
    interior: 1.76,
    refused: 79.4,
    note: 'Flat colour with hard edges, so four fifths of its boundaries are a budget’s own shading steps.',
  },
  'ui_elements1.png': {
    both: 2.51,
    interior: 1.63,
    refused: 68.7,
    note: 'Thin strokes over wide empty margins — the least contour of the eight, and the sheet a loose floor mushes.',
  },
  'vehicles_and_props.png': {
    both: 4.07,
    interior: 3.28,
    refused: 60.2,
    note: 'Dense rust texture, whose boundaries cluster just above the floor rather than far above it.',
  },
};

const KEY = BACKGROUND_KEY_COLORS.MAGENTA_FF00FF;

/** The sheet as the pass actually meets it: quantised, keyed, and reduced to a colour budget. */
function quantised(image: ImageData): ImageData {
  const settings: QuantiseSettings = {
    ...QUANTISE_DEFAULT_DIALS,
    grid: measureSheetScale(image)?.grid ?? 1,
    key: KEY === null ? null : { color: KEY, tolerance: QUANTISE_DEFAULT_DIALS.keyTolerance },
    reduction: { kind: 'MAX_COLORS', maxColors: 64 },
  };
  return quantiseImage(image, settings).image;
}

/** The share of a sheet's pixels the pass moves, as a percentage. */
function movedShare(sheet: ImageData, mode: AntiAliasMode, threshold: number): number {
  const result = antiAlias(sheet, {
    mode,
    threshold,
    strength: DEFAULT_ANTI_ALIAS_STRENGTH / 100,
    shortestRun: DEFAULT_ANTI_ALIAS_RUN,
    snap: true,
  });
  if (result === sheet) return 0;
  let moved = 0;
  for (let offset = 0; offset < sheet.data.length; offset += CHANNELS_PER_PIXEL) {
    if (
      sheet.data[offset] !== result.data[offset] ||
      sheet.data[offset + 1] !== result.data[offset + 1] ||
      sheet.data[offset + 2] !== result.data[offset + 2] ||
      sheet.data[offset + 3] !== result.data[offset + 3]
    ) {
      moved += 1;
    }
  }
  return (moved / (sheet.width * sheet.height)) * 100;
}

/** The share of differing neighbouring pairs that sit below the contrast floor, as a percentage. */
function refusedShare(sheet: ImageData, threshold: number): number {
  const { width, height, data } = sheet;
  const labs = new Map<number, { readonly L: number; readonly a: number; readonly b: number }>();
  const labOf = (packed: number) => {
    let found = labs.get(packed);
    if (found === undefined) {
      const color = unpackColor(packed);
      found = srgbToOklab(color.r, color.g, color.b);
      labs.set(packed, found);
    }
    return found;
  };

  let differing = 0;
  let refused = 0;
  const measure = (left: number, right: number): void => {
    const one = packedColorAt(data, left * CHANNELS_PER_PIXEL);
    const other = packedColorAt(data, right * CHANNELS_PER_PIXEL);
    if (one === other) return;
    differing += 1;
    const a = labOf(one);
    const b = labOf(other);
    if (pixelDistanceOf(a.L, a.a, a.b, one % 256, b.L, b.a, b.b, other % 256) < threshold) refused += 1;
  };
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (x + 1 < width) measure(y * width + x, y * width + x + 1);
      if (y + 1 < height) measure(y * width + x, (y + 1) * width + x);
    }
  }
  return (refused / differing) * 100;
}

/** The six sheets that soften less at a floor of nothing than at a floor of 8, in corpus order. */
const LOOSER_AT_NOTHING: readonly CorpusSheetName[] = [
  'armour.png',
  'cyborg_black_red.png',
  'character_space_marine_blue.png',
  'cyborg_monk.png',
  'cyborg_healer.png',
  'vehicles_and_props.png',
];

export function antiAliasCorpusSuite(sheets: readonly CorpusSheetName[]): void {
  describe('anti-aliasing over the reference sheets', () => {
    const loaded = new Map<CorpusSheetName, ImageData>();

    beforeAll(async () => {
      for (const name of sheets) loaded.set(name, quantised(await loadCorpusSheet(name)));
    }, 300_000);

    const sheetFor = (name: CorpusSheetName): ImageData => {
      const sheet = loaded.get(name);
      if (sheet === undefined) throw new Error(`${name} was not loaded`);
      return sheet;
    };

    /**
     * `movedShare` for one sheet, run once per mode and floor however many cases read it.
     *
     * The default floor under `BOTH` is the reading the recorded share, the rising floor and the loose
     * end all start from, and the pass over a sheet is what this suite spends its time on. It is pure,
     * so a share read twice is the share a second run would measure.
     */
    const shares = new Map<string, number>();
    const shareOf = (name: CorpusSheetName, mode: AntiAliasMode, threshold: number): number => {
      const key = `${name} ${mode} ${String(threshold)}`;
      const cached = shares.get(key);
      if (cached !== undefined) return cached;
      const share = movedShare(sheetFor(name), mode, threshold);
      shares.set(key, share);
      return share;
    };

    it.each(sheets)('moves the recorded share of %s', (name) => {
      const expected = EXPECTED[name];
      const both = shareOf(name, 'BOTH', DEFAULT_ANTI_ALIAS_THRESHOLD);
      const interior = shareOf(name, 'INTERIOR', DEFAULT_ANTI_ALIAS_THRESHOLD);
      expect(both, expected.note).toBeCloseTo(expected.both, 1);
      expect(interior, expected.note).toBeCloseTo(expected.interior, 1);
      // `BOTH` is the union of the two kinds of boundary, so it can only reach more pixels than the
      // interior alone — and on every one of these sheets it reaches strictly more, because all eight
      // arrive with a field to key and therefore have a silhouette to soften. Measured rather than
      // read off the table above, which would be the table asserting something about itself.
      expect(interior, expected.note).toBeLessThan(both);
    });

    it.each(sheets)('refuses the recorded share of %s’s boundaries', (name) => {
      const expected = EXPECTED[name];
      expect(refusedShare(sheetFor(name), DEFAULT_ANTI_ALIAS_THRESHOLD), expected.note).toBeCloseTo(
        expected.refused,
        1,
      );
    });

    it('softens less of every sheet as the floor rises above its default', () => {
      // The property the dial is *for*, checked on real output rather than on a fixture: past the
      // default, each step of the floor admits strictly fewer boundaries. It is deliberately not
      // claimed below the default, where it is false — see the test below.
      for (const name of sheets) {
        let previous = Infinity;
        for (const threshold of [DEFAULT_ANTI_ALIAS_THRESHOLD, 32, 48, 64, ANTI_ALIAS_THRESHOLD_RANGE.max]) {
          const share = shareOf(name, 'BOTH', threshold);
          expect(share, `${name} at ${String(threshold)}`).toBeLessThan(previous);
          previous = share;
        }
      }
    }, 180_000);

    it('softens less at a floor of nothing than at a floor of 8 on exactly the six sheets recorded', () => {
      // The response is **not** monotone at the loose end, and it is worth pinning because it reads as
      // a defect and is not. At a floor of nothing every neighbouring difference is a contour, so a run
      // very often finds a crossing edge on *both* sides of an end — which is the ambiguous pattern
      // `walkEdgeRuns` refuses to reconstruct from. Six of the eight sheets therefore soften less at 0
      // than at 8. The two that do not are the flattest of the corpus, where a boundary is either a
      // full palette step or nothing at all.
      // Each half of the corpus is held to its own part of that list, so the two files together
      // assert the whole of it.
      const looser = sheets.filter((name) => shareOf(name, 'BOTH', 0) < shareOf(name, 'BOTH', 8));
      expect(looser).toEqual(LOOSER_AT_NOTHING.filter((name) => sheets.includes(name)));
    }, 180_000);
  });
}
