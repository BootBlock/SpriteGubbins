import { describe, expect, it } from 'vitest';
import { DUPLICATE_TOLERANCE_RANGE, SCATTERED_SPRITE_CEILING } from '../src/constants/quantiser.ts';
import { duplicateSprites } from '../src/utils/duplicateSprites.ts';
import { CHANNELS_PER_PIXEL, createImage, pixelOffset } from '../src/utils/imageData.ts';
import type { SpriteBox } from '../src/types/quantiser.ts';

/**
 * The grouping `duplicateSprites` states for its cost fixture, at four rungs of the dial. See
 * `quantiser-figures-duplicate-sprites.test.ts` for the pass's other figures and why the wall-clock
 * half is not asserted.
 *
 * Its own file because it is the longest case of that suite and reads no sheet: Vitest gives each
 * file to one worker, so apart from the corpus cases it can run on a second one.
 */
describe('duplicateSprites — the grouping of its cost fixture', () => {
  /** 32 columns by 16 rows of 20 x 20 sprites on a 22-pixel pitch: 512 boxes, 704 x 352 pixels. */
  const SPRITE_EXTENT = 20;
  const SPRITE_PITCH = 22;
  const FIXTURE_COLUMNS = 32;

  /**
   * The fixture the seconds in that docblock were measured on.
   *
   * Adversarial on purpose, and every part of it is doing something. The count is the ceiling, so
   * the pair walk is at its widest. Nothing is byte-identical, so the hash pass collapses none of
   * it. And the noise is spread over three RGB steps per unit of the dial's top rung, which is
   * what puts a pair's running mean astride the tolerance: narrower and every pair would group,
   * wider and every pair would be rejected in its first row, and neither is the case that costs
   * seconds.
   *
   * The generator is a plain 32-bit LCG rather than `Math.random`, so the sheet is the same every
   * run and a figure measured on it can be measured again.
   */
  const ceilingFixture = (): { image: ImageData; boxes: readonly SpriteBox[] } => {
    const rows = SCATTERED_SPRITE_CEILING / FIXTURE_COLUMNS;
    const image = createImage(FIXTURE_COLUMNS * SPRITE_PITCH, rows * SPRITE_PITCH);
    const boxes: SpriteBox[] = [];
    let state = 11;
    const noise = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return 96 + Math.floor((state / 4_294_967_296) * 3 * (DUPLICATE_TOLERANCE_RANGE.max + 1));
    };

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < FIXTURE_COLUMNS; column += 1) {
        const left = column * SPRITE_PITCH;
        const top = row * SPRITE_PITCH;
        for (let line = 0; line < SPRITE_EXTENT; line += 1) {
          let at = pixelOffset(image.width, left, top + line);
          for (let cell = 0; cell < SPRITE_EXTENT; cell += 1) {
            image.data[at] = noise();
            image.data[at + 1] = noise();
            image.data[at + 2] = noise();
            image.data[at + 3] = 255;
            at += CHANNELS_PER_PIXEL;
          }
        }
        boxes.push({
          left,
          top,
          width: SPRITE_EXTENT,
          height: SPRITE_EXTENT,
          pixels: SPRITE_EXTENT * SPRITE_EXTENT,
        });
      }
    }
    return { image, boxes };
  };

  /**
   * The rung the fixture is most expensive at, which is not the top of the dial.
   *
   * From the floor to here the walk gets steadily further into each pair before the running sum
   * passes the budget, and nothing groups at any rung along the way. Measured, the cost is a
   * monotone ramp to about here — 21 — rather than a plateau, so this is the rung where the
   * fixture is doing the most work, and 15 or 18 would witness the same grouping while costing
   * less than it.
   */
  const PEAK_RUNG = 21;

  /**
   * The first rung at which anything groups at all, which is two below the top and not gradual.
   *
   * The noise's spread brings the closest pairs under the threshold here — seven small groups
   * holding 15 sprites between them — and one rung later those chain into a single group of 488.
   * Both are worth pinning: the docblock's account of why the top rung is *cheaper* than the peak
   * turns on grouping arriving suddenly at the very end of the dial rather than creeping in.
   */
  const FIRST_GROUPING_RUNG = 23;

  it('walks every pair of the ceiling fixture up the dial, and collapses it at the top', () => {
    const { image, boxes } = ceilingFixture();
    expect(boxes).toHaveLength(SCATTERED_SPRITE_CEILING);

    /** Each group's size in members, largest first — never the group count. See the last case. */
    const sizes = (tolerance: number): readonly number[] =>
      duplicateSprites(image, boxes, tolerance)
        .map((group) => group.duplicates.length + 1)
        .sort((left, right) => right - left);

    // At the dial's floor the budget is zero, so a pair groups only where its visible pixels match
    // outright — and none does, which is the whole of "no pair is byte-identical". That is what
    // leaves all 130,816 pairs to the walk. This is the cheap end of the docblock's ratios.
    expect(sizes(DUPLICATE_TOLERANCE_RANGE.min)).toEqual([]);

    // At the peak nothing groups either, so `find(left) === find(right)` never short-circuits a
    // pair and every one of them really is measured until its running sum passes the budget. That
    // is the whole of the docblock's claim that the expensive rungs are the ones walking, and it
    // is why the top of the dial is not the worst case.
    expect(sizes(PEAK_RUNG)).toEqual([]);

    // Two rungs later the closest pairs start coming under the threshold — suddenly, and only
    // here. Pinned because the docblock's account of the decline rests on grouping arriving at the
    // end of the dial rather than creeping in from the middle.
    expect(sizes(FIRST_GROUPING_RUNG)).toEqual([3, 2, 2, 2, 2, 2, 2]);

    // And at the top rung those chain into one group of 488, after which the skip disposes of most
    // of the remaining pairs unmeasured. That is what makes the top rung cheaper than the peak.
    //
    // **Counted in members, never in groups.** A group count *falls* as grouping rises — total
    // collapse is one group — so it cannot tell this case from the floor's, and an assertion
    // bounding it above would pass on both. That is the reading the note here first carried, and
    // it certified the opposite of what it claimed.
    expect(sizes(DUPLICATE_TOLERANCE_RANGE.max)).toEqual([488]);
  }, 900_000);
});
