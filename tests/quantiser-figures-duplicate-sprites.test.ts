import { beforeAll, describe, expect, it } from 'vitest';
import { CORPUS_SHEETS, loadCorpus, loadCorpusSheet } from './sheetCorpus.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { DUPLICATE_TOLERANCE_RANGE, SCATTERED_SPRITE_CEILING } from '../src/constants/quantiser.ts';
import { duplicateSprites } from '../src/utils/duplicateSprites.ts';
import { CHANNELS_PER_PIXEL, createImage, fromHex, pixelOffset } from '../src/utils/imageData.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import type { QuantiseSettings, SpriteBox } from '../src/types/quantiser.ts';

/**
 * The two figures `duplicateSprites` states. See `calibrationSettings.ts` for why the
 * docblock-figure suites exist.
 *
 * **Only the first of them is about `test_sprites/armour.png`.** The second is what the pass costs
 * at `SCATTERED_SPRITE_CEILING`, and it is a claim about *every* sheet rather than about that one: it
 * rests on the whole corpus segmenting into far fewer sprites than the ceiling admits. So that figure
 * is re-derived over all eight sheets, and the fixture the cost was measured on is built here too.
 *
 * **The wall-clock half is deliberately not asserted, and the docblock no longer states one.**
 * `duplicateSprites` gives ratios along the dial and an order of magnitude, because a millisecond
 * figure is the one kind of measurement that does not reproduce here: the same rung on the same
 * fixture on this machine differed by three to four times between a cold sweep and a warmed one, and
 * adjacent warm runs of a single rung differed by two. What is held instead is what the conclusion
 * rests on: the corpus's sprite counts, and the fixture's own grouping at four rungs of the dial,
 * which is what says the expensive rungs really are walking every pair rather than skipping them.
 */
describe('duplicateSprites — the two figures its docblock states', () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  /**
   * The reference sheet keyed the way that docblock states it, which is not `calibrationSettings`.
   *
   * Its extent figure is about what the *keying* does to a silhouette when the artwork moves under
   * it, so the key has to be in force and the palette step has to be out of the way: a reduction
   * would put a second quantisation between the perturbation and the extent being measured, and
   * the question is what one contour pixel crossing the keying threshold costs.
   */
  const KEYED = (): QuantiseSettings => {
    const magenta = fromHex('#FF00FF');
    if (magenta === null) throw new Error('the key colour no longer parses');
    return {
      ...QUANTISE_DEFAULT_DIALS,
      grid: 6,
      key: { color: magenta, tolerance: 24 },
      reduction: null,
    };
  };

  /**
   * The sheet with `delta` added to every colour channel of every pixel.
   *
   * The whole sheet rather than the drawn pixels alone, key field included, and that is what makes
   * the reading reproducible: perturbing "the artwork" needs a segmentation to say which pixels
   * are artwork, and the segmentation is the thing being measured. `Uint8ClampedArray` clamps at
   * both ends, so a channel already at 0 or 255 stays there.
   */
  const shifted = (image: ImageData, delta: number): ImageData => {
    const moved = createImage(image.width, image.height);
    moved.data.set(image.data);
    for (let at = 0; at < moved.data.length; at += CHANNELS_PER_PIXEL) {
      moved.data[at] = (moved.data[at] ?? 0) + delta;
      moved.data[at + 1] = (moved.data[at + 1] ?? 0) + delta;
      moved.data[at + 2] = (moved.data[at + 2] ?? 0) + delta;
    }
    return moved;
  };

  /** The sprites this sheet holds under those settings, in the order `spriteSegments` answers in. */
  const boxesOf = (image: ImageData): readonly SpriteBox[] => {
    const { sprites } = quantiseImage(image, KEYED());
    return sprites.kind === 'SEGMENTED' ? sprites.boxes : [];
  };

  /** A box's centre, which is what identifies a sprite across a perturbation. */
  const centreOf = (box: SpriteBox): [number, number] => [box.left + box.width / 2, box.top + box.height / 2];

  /**
   * How many of `before`'s sprites came through with the extent they had.
   *
   * **Paired by nearest centre, not by list position**, and the difference is not cosmetic. A
   * perturbed sheet meshes differently, so a sprite can gain or lose a row of drawn pixels at its
   * edge — enough to cross a row band, or to change how the merge folds a piece back onto its
   * neighbour, and either of those renumbers everything after it. Index n is therefore not
   * guaranteed to be the same piece of artwork either side. Under the two flat shifts below every
   * box does keep its index, so the two pairings agree today; an index pairing would still certify
   * a wrong figure the moment the perturbation, the grid or the key tolerance re-sorted a row.
   *
   * A sprite moves a pixel or two under this perturbation and no further, so its centre identifies
   * it. A pairing that is not one-to-one is not a pairing at all, so this throws rather than
   * counting: silently comparing unrelated sprites is exactly the failure it replaces.
   */
  const keptExtent = (before: readonly SpriteBox[], after: readonly SpriteBox[]): number => {
    const claimed = new Set<number>();
    let kept = 0;
    for (const box of before) {
      const [x, y] = centreOf(box);
      let nearest = -1;
      let best = Infinity;
      for (const [index, other] of after.entries()) {
        const [otherX, otherY] = centreOf(other);
        const distance = (otherX - x) ** 2 + (otherY - y) ** 2;
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      }
      const matched = after[nearest];
      if (matched === undefined || claimed.has(nearest)) {
        throw new Error('the perturbed segmentation no longer pairs one-to-one with the original');
      }
      claimed.add(nearest);
      if (matched.width === box.width && matched.height === box.height) kept += 1;
    }
    return kept;
  };

  it('leaves 3 of the reference sheet 15 sprites with the extent they had, and 1 the other way', () => {
    const before = boxesOf(sheet);
    const up = boxesOf(shifted(sheet, 4));
    const down = boxesOf(shifted(sheet, -4));

    // All three have to find the same sprites for the comparison to mean anything: the figure is
    // about extents changing, not about sprites appearing or vanishing, and the pairing above
    // assumes each sprite has a counterpart to be paired with.
    expect([before.length, up.length, down.length]).toEqual([15, 15, 15]);
    expect([keptExtent(before, up), keptExtent(before, down)]).toEqual([3, 1]);
    // The docblock's claim that list position gives the same answer under these two shifts: each
    // box's nearest centre on the shifted sheet is the box at its own index.
    const nearestIndex = (box: SpriteBox, after: readonly SpriteBox[]): number => {
      const [x, y] = centreOf(box);
      const distances = after.map((other) => {
        const [otherX, otherY] = centreOf(other);
        return (otherX - x) ** 2 + (otherY - y) ** 2;
      });
      return distances.indexOf(Math.min(...distances));
    };
    for (const after of [up, down]) {
      expect(before.map((box) => nearestIndex(box, after))).toEqual(before.map((_, index) => index));
    }
  }, 600_000);

  it('finds 15 to 42 sprites on the corpus, an order of magnitude under the ceiling', async () => {
    const corpus = await loadCorpus();
    const counts = CORPUS_SHEETS.map((name) => {
      const image = corpus.get(name);
      if (image === undefined) throw new Error(`${name} is missing from the corpus`);
      const { sprites } = quantiseImage(image, KEYED());
      return sprites.kind === 'SEGMENTED' ? sprites.boxes.length : -1;
    });

    expect(counts).toEqual([15, 15, 15, 42, 34, 24, 25, 27]);
    // The claim the timing conclusion rests on, stated as a bound as well as a list. The bound
    // adds nothing while the list holds — 42 is in it — and it is not there for today: a ninth
    // sheet fails the list first, and whoever adds it to the list then has to get it past this
    // too. The walk is quadratic in this count, so the corpus's worst sheet does under a
    // hundredth of the work the ceiling admits, and that is the property a new sheet must keep.
    expect(Math.max(...counts)).toBeLessThan(SCATTERED_SPRITE_CEILING / 10);
  }, 600_000);

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
