import { beforeAll, describe, expect, it } from 'vitest';
import { CORPUS_SHEETS, loadCorpus, loadCorpusSheet } from './sheetCorpus.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { SCATTERED_SPRITE_CEILING } from '../src/constants/quantiser.ts';
import { CHANNELS_PER_PIXEL, createImage, fromHex } from '../src/utils/imageData.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import type { QuantiseSettings, SpriteBox } from '../src/types/quantiser.ts';

/**
 * The two figures `duplicateSprites` states. See `calibrationSettings.ts` for why the
 * docblock-figure suites exist.
 *
 * **Only the first of them is about `test_sprites/armour.png`.** The second is what the pass costs
 * at `SCATTERED_SPRITE_CEILING`, and it is a claim about *every* sheet rather than about that one: it
 * rests on the whole corpus segmenting into far fewer sprites than the ceiling admits. So that figure
 * is re-derived over all eight sheets, and the fixture the cost was measured on is built in
 * `quantiser-figures-duplicate-sprites-ceiling.test.ts`, which runs on a worker of its own.
 *
 * **The wall-clock half is deliberately not asserted, and the docblock no longer states one.**
 * `duplicateSprites` gives ratios along the dial and an order of magnitude, because a millisecond
 * figure is the one kind of measurement that does not reproduce here: the same rung on the same
 * fixture on this machine differed by three to four times between a cold sweep and a warmed one, and
 * adjacent warm runs of a single rung differed by two. What is held instead is what the conclusion
 * rests on: the corpus's sprite counts here, and the fixture's own grouping at four rungs of the dial
 * in the ceiling suite, which is what says the expensive rungs really are walking every pair rather
 * than skipping them.
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
});
