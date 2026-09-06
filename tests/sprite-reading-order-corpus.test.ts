import { beforeAll, describe, expect, it, vi } from 'vitest';

import { DEFAULT_KEY_TOLERANCE } from '../src/constants/quantiser.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import type { QuantiseSettings, Rgba, SpriteBox } from '../src/types/quantiser.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { type SheetLayout, sheetLayout } from '../src/utils/sheetLayout.ts';
import { CORPUS_SHEETS, type CorpusSheetName, loadCorpus } from './sheetCorpus.ts';

/**
 * That the sheets a reader actually downloads name their sprites in the order section 4 fixes.
 *
 * **The reading order is a contract between two files, and it was broken on seven of these eight.**
 * A sprite pack's file names, the manifest's `index` and the `.aseprite` document's frame sequence
 * all claim to number a sheet's sprites "screen-left to screen-right, then top to bottom", which is
 * what lets the *n*th entry of a model's component map and the *n*th sprite of a pack describe one
 * component. The ordering behind the first two used to sort on the exact `top` coordinate, which
 * agrees with that only where every sprite of a row shares a top edge — so on `armour.png` five of
 * fifteen cut-out PNGs carried another component's name, and the `.aseprite` file written by the
 * same press-set disagreed with the manifest beside it.
 *
 * **Checked against the rule rather than against a recorded answer.** A list of expected rects would
 * pin today's segmentation as well as today's ordering, so a change to the keying or the merge would
 * fail this file for a reason it is not about. What is asserted instead is the half of section 4's
 * sentence that holds of every pair of sprites however the rows fall: two sprites that pass through
 * any of the same rows of the sheet are in left-to-right order. That is what the old sort broke, and
 * run against it this fails on seven sheets — every one but `three-quarter-view_tiles1.png`, whose
 * tile grid is flush by construction and is therefore the one case where a scan order and a reading
 * order happen to agree.
 *
 * **The other half of the sentence cannot be asserted pairwise, and is asserted of the rows.** A row
 * is a *chained* band: a tall sprite in the middle of one holds the short sprites either side of it
 * together, and those two need share no row of the sheet with each other — so "a later sprite is
 * never above an earlier one" is false within a row, on this corpus as well as in principle. What is
 * true is that the rows themselves are disjoint bands in top-to-bottom order, and `sheetLayout`
 * publishes them as the tags of the Aseprite export, so that is where it is checked.
 *
 * **And that the two files agree**, which is the half no single-writer test can see: the frame order
 * `sheetLayout` derives is compared with the box order everything else names from, box for box.
 *
 * The corpus rather than a fixture, because a hand-built sheet is flush unless it is built not to
 * be, and "flush" is exactly the case in which the defect is invisible — the suite already held two
 * ordering tests and both used flush rows. Real generator output is resampled, so its rows sit a
 * pixel or two apart on their own.
 */

/** The key the studio's prompts ask a generator for — `MAGENTA_FF00FF`, the recommended choice. */
const KEY: Rgba = { r: 255, g: 0, b: 255, a: 255 };

/**
 * The dials a reader lands on with keying switched on, at the grid the calibration record uses.
 *
 * Keying is expressed by the `key` itself rather than by `keyingEnabled`, which is a dial the tab
 * reads and not a field of the settings: a non-null key *is* the pass running. `reduction: null`
 * because the palette pass cannot move a box — segmentation reads alpha alone, and skipping it is
 * what keeps a survey of eight one-to-two-megapixel sheets affordable.
 */
const SETTINGS: QuantiseSettings = {
  ...QUANTISE_DEFAULT_DIALS,
  grid: 6,
  key: { color: KEY, tolerance: DEFAULT_KEY_TOLERANCE },
  reduction: null,
};

/**
 * Eight sheets of one to two megapixels, quantised once in the hook every assertion below reads.
 *
 * The hook timeout as well as the test timeout: the decode and the eight transforms all happen in
 * `beforeAll`, and Vitest's own hook limit is ten seconds — which this clears alone and does not
 * clear under a full run, where every worker is competing for the machine.
 */
vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

/** What one sheet came to: the boxes everything names a sprite by, and the layout the export writes. */
interface SheetReading {
  readonly boxes: readonly SpriteBox[];
  readonly layout: SheetLayout;
}

/** Whether two boxes pass through any of the same rows of the sheet. */
function sharesRow(first: SpriteBox, second: SpriteBox): boolean {
  return first.top < second.top + second.height && second.top < first.top + first.height;
}

/** A box named the way a failure has to name it — by where it sits, since it carries nothing else. */
function at(box: SpriteBox): string {
  return `(${String(box.left)},${String(box.top)})`;
}

/**
 * Every pair the order puts the wrong way round, named so a failure says which sprites and why.
 *
 * Over every pair rather than over consecutive ones, because a single sprite pushed to the end of
 * its row is out of order against each of the ones it passed rather than against its neighbour
 * alone — and the count of those is what the issue's evidence reports.
 */
function outOfOrder(boxes: readonly SpriteBox[]): readonly string[] {
  const broken: string[] = [];
  for (const [index, earlier] of boxes.entries()) {
    for (const later of boxes.slice(index + 1)) {
      if (!sharesRow(earlier, later)) continue;
      if (earlier.left <= later.left) continue;
      broken.push(`${at(earlier)} shares a row with ${at(later)}, is to the right of it, and comes first`);
    }
  }
  return broken;
}

describe('the reading order every download names a sprite by', () => {
  const readings = new Map<CorpusSheetName, SheetReading>();

  beforeAll(async () => {
    const corpus = await loadCorpus();
    for (const name of CORPUS_SHEETS) {
      const sheet = corpus.get(name);
      if (sheet === undefined) throw new Error(`The corpus is missing ${name}`);
      const result = quantiseImage(sheet, SETTINGS);
      if (result.sprites.kind !== 'SEGMENTED') {
        throw new Error(`${name} segmented as ${result.sprites.kind}`);
      }
      readings.set(name, {
        boxes: result.sprites.boxes,
        layout: sheetLayout(result.image, result.sprites.boxes),
      });
    }
  });

  /** One sheet's reading, or a failure naming the sheet rather than an undefined a line later. */
  function readingOf(name: CorpusSheetName): SheetReading {
    const reading = readings.get(name);
    if (reading === undefined) throw new Error(`${name} was never read`);
    return reading;
  }

  it.each(CORPUS_SHEETS)('orders %s screen-left to screen-right within every row', (name) => {
    const { boxes } = readingOf(name);

    // Without this a sheet the keying flattened would satisfy the assertion below by holding nothing.
    expect(boxes.length).toBeGreaterThan(1);
    expect(outOfOrder(boxes)).toEqual([]);
  });

  it.each(CORPUS_SHEETS)('writes the Aseprite frames of %s in that same order', (name) => {
    const { boxes, layout } = readingOf(name);

    expect(layout.frames.map((frame) => [frame.left, frame.top])).toEqual(
      boxes.map((box) => [box.left, box.top]),
    );
  });

  it.each(CORPUS_SHEETS)('lays the rows of %s out as disjoint bands, top to bottom', (name) => {
    const { layout } = readingOf(name);

    // More than one, or the claim below holds of every sheet trivially.
    expect(layout.strips.length).toBeGreaterThan(1);

    let previousBottom = 0;
    for (const strip of layout.strips) {
      const frames = layout.frames.slice(strip.from, strip.to + 1);
      const top = Math.min(...frames.map((frame) => frame.top));
      expect(top).toBeGreaterThanOrEqual(previousBottom);
      previousBottom = Math.max(...frames.map((frame) => frame.top + frame.height));
    }
  });
});
