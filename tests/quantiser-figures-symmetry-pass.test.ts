import { beforeAll, describe, expect, it } from 'vitest';
import { loadCorpusSheet } from './sheetCorpus.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import {
  DEFAULT_KEY_TOLERANCE,
  SYMMETRY_AXIS_SEARCH,
  SYMMETRY_SWEEP_BUDGET,
} from '../src/constants/quantiser.ts';
import { CHANNELS_PER_PIXEL, fromHex } from '../src/utils/imageData.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { affordableReach } from '../src/utils/symmetryAxis.ts';
import type { QuantiseSettings, SpriteBox } from '../src/types/quantiser.ts';

/**
 * The two figures the symmetry pass argues its cost from. See `calibrationSettings.ts` for why the
 * docblock-figure suites exist.
 *
 * Like `duplicateSprites`, `symmetryAxis` states no wall-clock figure, and it arrived there the other
 * way about — it *did* state a millisecond ratio, "about a thirtieth of the whole pipeline's work",
 * and re-measurement put six readings of "the same sheet" between a twelfth and a
 * hundred-and-forty-third of it (issue #237).
 * **It now states no total cost at all**, which is the second correction rather than the first: the
 * deterministic figure written to replace that ratio counted the wrong pixels twice over, against
 * the source sheet where the boxes are in the reduced result's coordinates, and at the sheet reach
 * where a per-box cap leaves most of it unspent. What is asserted below is the two *bounds* the
 * paragraph now argues from — the box area the budget is divided by, and the reach `affordableReach`
 * answers with — both taken from the pass rather than restated here.
 */
describe('the symmetry pass — the two figures its cost is argued from', () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  /**
   * The reference sheet keyed as `SYMMETRY_AXIS_SEARCH`'s docblock states it, which is not
   * `calibrationSettings`.
   *
   * That paragraph names its own conditions — `test_sprites/armour.png`, grid 6, keyed on
   * `#FF00FF` at `DEFAULT_KEY_TOLERANCE`, every other dial at its opening position — and the two
   * figures below are the only ones stated for those fifteen pieces, so they are measured there.
   * No reduction, because none is an opening position.
   */
  const AS_STATED = (): QuantiseSettings => {
    const magenta = fromHex('#FF00FF');
    if (magenta === null) throw new Error('the key colour no longer parses');
    return {
      ...QUANTISE_DEFAULT_DIALS,
      grid: 6,
      key: { color: magenta, tolerance: DEFAULT_KEY_TOLERANCE },
      reduction: null,
    };
  };

  /**
   * The quantity `affordableReach` divides the budget by, summed the way that function sums it.
   *
   * Box area, not drawn pixels — and the reason this figure is asserted at all is that those two
   * are twenty per cent apart on this sheet, so a docblock naming the wrong one of them sends a
   * reader re-deriving the reach to a number the code never computes (issue #237). The reach
   * itself is taken from `affordableReach` rather than restated here, for the same reason: a
   * restatement passes with the real divisor swapped, which is precisely the change this is
   * guarding against.
   */
  const combinedBoxArea = (boxes: readonly SpriteBox[]): number =>
    boxes.reduce((total, box) => total + box.width * box.height, 0);

  it('totals 17,201 pixels of box against 13,823 of artwork, and is not narrowed by the budget', () => {
    const result = quantiseImage(sheet, AS_STATED());
    expect(result.sprites.kind).toBe('SEGMENTED');
    const boxes = result.sprites.kind === 'SEGMENTED' ? result.sprites.boxes : [];
    expect(boxes).toHaveLength(15);

    const area = combinedBoxArea(boxes);
    expect(area).toBe(17_201);

    // The other quantity, pinned beside it because the docblock now says which is which and the
    // pair is the whole of that sentence's point.
    let opaque = 0;
    for (let at = 3; at < result.image.data.length; at += CHANNELS_PER_PIXEL) {
      if ((result.image.data[at] ?? 0) > 0) opaque += 1;
    }
    expect(opaque).toBe(13_823);

    // The budget buys 975 sweeps where the full reach costs 33, which is what "the budget narrows
    // this sheet by nothing" means — and the reach is asked of the pass rather than recomputed
    // here, so a divisor changed inside `affordableReach` fails this rather than sailing past it.
    //
    // What the budget leaves is not what each sprite gets: `bestAxis` caps every box at a quarter
    // of its own width, which binds on ten of these fifteen. That is `SYMMETRY_AXIS_SEARCH`'s
    // claim rather than this docblock's, and it is why nothing here states a total cost — a
    // `(4 × reach + 1) × area` product is the nominal figure the cap leaves unspent.
    expect(Math.floor(SYMMETRY_SWEEP_BUDGET / area)).toBe(975);
    expect(affordableReach(boxes)).toBe(SYMMETRY_AXIS_SEARCH);

    // The boxes are in the **reduced** result's coordinates, not the source sheet's, which is the
    // half a total cost stated against 1254² gets wrong — and did, in the first replacement for
    // the wall-clock ratio these docblocks used to carry. Pinned so that a pass moved back onto
    // the source sheet fails here rather than quietly making the docblocks' arithmetic 36× out.
    expect([result.image.width, result.image.height]).toEqual([209, 210]);
    expect(area / (result.image.width * result.image.height)).toBeCloseTo(0.392, 3);
  }, 300_000);
});
