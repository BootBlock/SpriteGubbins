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
import { CORPUS_SHEETS, loadCorpusSheet, type CorpusSheetName } from './sheetCorpus.ts';

/**
 * What the anti-aliasing pass does to the eight reference sheets at the positions its dials open at.
 *
 * **The calibration record for `DEFAULT_ANTI_ALIAS_THRESHOLD`, and the sheet-by-sheet statement
 * CLAUDE.md asks a recalibration to make.** `armour.png` is the reference the figure was chosen on;
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
 * **`SILHOUETTE` is not tabulated**, and its absence is a fact rather than an omission: what it
 * softens is the boundary between the artwork and the keyed field, so the share it touches is the
 * difference between the two columns that are here. Reporting it as a third would be reporting a
 * subtraction as a measurement.
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
    both: 9.13,
    interior: 7.6,
    refused: 36.1,
    note: 'The reference. Fifteen gear pieces at a pixel scale of 3, so contour is a large share of a small sheet.',
  },
  'cyborg_black_red.png': {
    both: 7.93,
    interior: 6.55,
    refused: 51.9,
    note: 'The same layout in a darker palette, whose emissive green puts half its boundaries under the floor.',
  },
  'character_space_marine_blue.png': {
    both: 6.13,
    interior: 5.56,
    refused: 65.3,
    note: 'Large soft cloth areas, which a budget renders as many near-identical shades the floor then refuses.',
  },
  'cyborg_monk.png': {
    both: 4.78,
    interior: 3.73,
    refused: 56.3,
    note: 'A whole character in parts, at no measurable pixel scale — so the pass runs on the sheet’s own pixels.',
  },
  'cyborg_healer.png': {
    both: 8.2,
    interior: 6.17,
    refused: 37.8,
    note: 'The widest gap between the two columns: loose accessories are mostly silhouette and little interior.',
  },
  'three-quarter-view_tiles1.png': {
    both: 2.78,
    interior: 2.07,
    refused: 74.6,
    note: 'Flat colour with hard edges, so three quarters of its boundaries are a budget’s own shading steps.',
  },
  'ui_elements1.png': {
    both: 2.53,
    interior: 1.67,
    refused: 65.3,
    note: 'Thin strokes over wide empty margins — the least contour of the eight, and the sheet a loose floor mushes.',
  },
  'vehicles_and_props.png': {
    both: 4.35,
    interior: 3.55,
    refused: 57.3,
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

describe('anti-aliasing over the reference sheets', () => {
  const sheets = new Map<CorpusSheetName, ImageData>();

  beforeAll(async () => {
    for (const name of CORPUS_SHEETS) sheets.set(name, quantised(await loadCorpusSheet(name)));
  }, 300_000);

  const sheetFor = (name: CorpusSheetName): ImageData => {
    const sheet = sheets.get(name);
    if (sheet === undefined) throw new Error(`${name} was not loaded`);
    return sheet;
  };

  it.each(CORPUS_SHEETS)('moves the recorded share of %s', (name) => {
    const expected = EXPECTED[name];
    const sheet = sheetFor(name);
    expect(movedShare(sheet, 'BOTH', DEFAULT_ANTI_ALIAS_THRESHOLD), expected.note).toBeCloseTo(
      expected.both,
      1,
    );
    expect(movedShare(sheet, 'INTERIOR', DEFAULT_ANTI_ALIAS_THRESHOLD), expected.note).toBeCloseTo(
      expected.interior,
      1,
    );
    // The silhouette is the difference between the two, so `INTERIOR` is always the smaller — and on
    // every one of these sheets it is strictly smaller, because all eight arrive with a field to key.
    expect(expected.interior).toBeLessThan(expected.both);
  });

  it.each(CORPUS_SHEETS)('refuses the recorded share of %s’s boundaries', (name) => {
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
    for (const name of CORPUS_SHEETS) {
      const sheet = sheetFor(name);
      let previous = Infinity;
      for (const threshold of [DEFAULT_ANTI_ALIAS_THRESHOLD, 32, 48, 64, ANTI_ALIAS_THRESHOLD_RANGE.max]) {
        const share = movedShare(sheet, 'BOTH', threshold);
        expect(share, `${name} at ${String(threshold)}`).toBeLessThan(previous);
        previous = share;
      }
    }
  }, 180_000);

  it('softens no more of most sheets at a floor of nothing than at a floor of 8', () => {
    // The response is **not** monotone at the loose end, and it is worth pinning because it reads as
    // a defect and is not. At a floor of nothing every neighbouring difference is a contour, so a run
    // very often finds a crossing edge on *both* sides of an end — which is the ambiguous pattern
    // `walkEdgeRuns` refuses to reconstruct from. Six of the eight sheets therefore soften less at 0
    // than at 8. The two that do not are the flattest of the corpus, where a boundary is either a
    // full palette step or nothing at all.
    const looser = CORPUS_SHEETS.filter(
      (name) => movedShare(sheetFor(name), 'BOTH', 0) < movedShare(sheetFor(name), 'BOTH', 8),
    );
    expect(looser).toEqual([
      'armour.png',
      'cyborg_black_red.png',
      'character_space_marine_blue.png',
      'cyborg_monk.png',
      'cyborg_healer.png',
      'vehicles_and_props.png',
    ]);
  }, 180_000);
});
