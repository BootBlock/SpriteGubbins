import { beforeAll, describe, expect, it } from 'vitest';
import { CORPUS_SHEETS, loadCorpus, loadCorpusSheet } from './sheetCorpus.ts';
import { cellMeanField, meanCellDistance, toConeField } from './cellDistance.ts';
import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import {
  COLOR_MERGE_RANGE,
  DEFAULT_FILL_CLEANUP,
  DEFAULT_INK_THRESHOLD,
  DEFAULT_KEY_TOLERANCE,
  DEFAULT_PALETTE_SNAP,
  DIFFERENCE_PRECISION,
  DUPLICATE_TOLERANCE_RANGE,
  FILL_CLEANUP_RANGE,
  PALETTE_SNAP_RANGE,
  SCATTERED_SPRITE_CEILING,
  SYMMETRY_AXIS_SEARCH,
  SYMMETRY_SWEEP_BUDGET,
} from '../src/constants/quantiser.ts';
import { nearestColor } from '../src/utils/applyPalette.ts';
import { duplicateSprites } from '../src/utils/duplicateSprites.ts';
import { boundaryMesh } from '../src/utils/gridMesh.ts';
import {
  CHANNELS_PER_PIXEL,
  colorHistogram,
  countColors,
  createImage,
  fromHex,
  packColor,
  pixelOffset,
  unpackColor,
} from '../src/utils/imageData.ts';
import { lumaOfChannels } from '../src/utils/lineVote.ts';
import { type LocatedEntry, locateEntries, nearestOklab } from '../src/utils/lockedPalette.ts';
import { srgbToOklab } from '../src/utils/oklab.ts';
import { pixelDistanceOf } from '../src/utils/pixelDistance.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';
import { affordableReach } from '../src/utils/symmetryAxis.ts';
import { buildPalette } from '../src/utils/wuQuantiser.ts';
import type {
  ColorReduction,
  QuantiseSettings,
  Rgba,
  SpriteBox,
  VoteMethod,
} from '../src/types/quantiser.ts';

/**
 * The calibration figures the quantiser's docblocks state, re-derived from the sheets they name.
 *
 * These figures are read as evidence — a maintainer deciding whether a dial's default is right
 * consults them instead of re-measuring — and four docblocks had drifted silently, each by a
 * different amount, because passes upstream of them changed and nothing recomputed them. All four
 * were stating cell counts through a mesh no version of this app produces. That is what this suite
 * exists to stop: a change to the mesh, the vote, the palette or the cleanup passes fails here,
 * naming the docblock whose figure it moved.
 *
 * **It pins the figures, not the prose.** Whoever makes it fail has to go and restate the docblock,
 * which is the step that was being skipped. A conclusion drawn from a figure — the knee at 1, the
 * unrestricted column being the worst — is still a judgement no assertion can hold.
 *
 * Slow, deliberately: nearly every figure is the real pipeline over a 1.57-megapixel generator
 * sheet, because a synthetic fixture carries none of the resampling this is measuring through.
 *
 * **`test_sprites/armour.png` is where most of them are stated, and it is no longer where all of
 * them are.** `duplicateSprites` states one figure about the reference sheet and a second about what
 * the pass costs at `SCATTERED_SPRITE_CEILING`, and the second is a claim about *every* sheet rather
 * than about that one: it rests on the whole corpus segmenting into far fewer sprites than the
 * ceiling admits. So that figure is re-derived over all eight sheets, and the fixture the cost was
 * measured on is built here too. A figure measured somewhere other than the reference sheet says
 * which sheet it came from.
 *
 * **The wall-clock half is deliberately not asserted, and no docblock here states one any more.**
 * `duplicateSprites` gives ratios along the dial and an order of magnitude, because a millisecond
 * figure is the one kind of measurement that does not reproduce here: the same rung on the same
 * fixture on this machine differed by three to four times between a cold sweep and a warmed one, and
 * adjacent warm runs of a single rung differed by two. What is held instead is what the conclusion
 * rests on: the corpus's sprite counts, and the fixture's own grouping at four rungs of the dial,
 * which is what says the expensive rungs really are walking every pair rather than skipping them.
 *
 * `symmetryAxis` is the second of those and arrived the other way about — it *did* state a
 * millisecond ratio, "about a thirtieth of the whole pipeline's work", and re-measurement put six
 * readings of "the same sheet" between a twelfth and a hundred-and-forty-third of it (issue #237).
 * **It now states no total cost at all**, which is the second correction rather than the first: the
 * deterministic figure written to replace that ratio counted the wrong pixels twice over, against
 * the source sheet where the boxes are in the reduced result's coordinates, and at the sheet reach
 * where a per-box cap leaves most of it unspent. What is asserted below is the two *bounds* the
 * paragraph now argues from — the box area the budget is divided by, and the reach `affordableReach`
 * answers with — both taken from the pass rather than restated here.
 *
 * **The palette lock is the third, and the one whose opening position is argued from the figures.**
 * Its two populations are only re-derivable if both are stated exactly (issue #238), so the drift is
 * measured on the colours the lock is actually handed, never on a 64-colour result it is not applied
 * to, and the colours it must keep are named by hex. Four of those come from three of the other
 * sheets' own palettes, and the ceiling and each lock's distance from black are taken from all eight.
 */

/** The conditions every figure below is stated at, bar the dial each one varies. */
const CALIBRATION = (over: Partial<QuantiseSettings> = {}): QuantiseSettings => ({
  ...QUANTISE_DEFAULT_DIALS,
  grid: 6,
  key: null,
  reduction: { kind: 'MAX_COLORS', maxColors: 64 },
  ...over,
});

/** Ink is the darkest quarter, which is what the vote's own rescue and these figures both mean. */
function isInkPixel(data: Uint8ClampedArray, at: number): boolean {
  if ((data[at + 3] ?? 0) === 0) return false;
  return lumaOfChannels(data[at] ?? 0, data[at + 1] ?? 0, data[at + 2] ?? 0) < DEFAULT_INK_THRESHOLD;
}

describe('the figures the quantiser docblocks state', () => {
  let sheet: ImageData;

  beforeAll(async () => {
    sheet = await loadCorpusSheet('armour.png');
  }, 120_000);

  it('lays 209 x 209 cells over the reference sheet at a grid of 6', () => {
    const mesh = boundaryMesh(sheet, 6);
    expect([mesh.x.length, mesh.y.length]).toEqual([209, 209]);
    expect(mesh.x.length * mesh.y.length).toBe(43_681);
  });

  it('DIFFERENCE_SCALES — the per-cell distance ladder the rungs are read off', () => {
    const { difference } = quantiseImage(sheet, CALIBRATION());
    const sorted = Array.from(difference.cells).sort((left, right) => left - right);
    const at = (percentile: number): number =>
      (sorted[Math.floor((percentile / 100) * sorted.length)] ?? 0) / DIFFERENCE_PRECISION;

    expect(at(50)).toBeCloseTo(0.66, 2);
    expect(at(75)).toBeCloseTo(10.2, 1);
    expect(at(90)).toBeCloseTo(55.0, 1);
    expect(at(99)).toBeCloseTo(117.9, 1);
    expect(difference.peak).toBeCloseTo(177.4, 1);
  }, 120_000);

  /** What a second cleanup pass moves: how many cells, and the largest step any one of them took. */
  function cleanupPassShift(vote: VoteMethod, fillCleanup: number): { cells: number; largest: number } {
    const once = quantiseImage(sheet, CALIBRATION({ vote, fillCleanup, cleanupPasses: 1 }));
    const twice = quantiseImage(sheet, CALIBRATION({ vote, fillCleanup, cleanupPasses: 2 }));

    let cells = 0;
    let peak = 0;
    for (let cell = 0; cell < once.difference.cells.length; cell += 1) {
      const step = Math.abs((once.difference.cells[cell] ?? 0) - (twice.difference.cells[cell] ?? 0));
      if (step > 0) cells += 1;
      if (step > peak) peak = step;
    }
    return { cells, largest: peak / DIFFERENCE_PRECISION };
  }

  it.each([
    { vote: 'DOMINANT', moved: 360, largest: 26.84375 },
    { vote: 'INK_WEIGHTED', moved: 930, largest: 14.375 },
  ] satisfies readonly { vote: VoteMethod; moved: number; largest: number }[])(
    'DIFFERENCE_SCALES and differenceMap — what a second cleanup pass moves under $vote',
    ({ vote, moved, largest }) => {
      const shift = cleanupPassShift(vote, FILL_CLEANUP_RANGE.max);

      expect(shift.cells).toBe(moved);
      expect(shift.largest).toBeCloseTo(largest, 5);
    },
    240_000,
  );

  it('DIFFERENCE_SCALES — and moves nothing with the fill cleanup at its opening zero', () => {
    // The half of that claim easiest to leave unstated: the passes multiply this one dial, so the
    // figure above means nothing without the rung it was read at, and this is what says so.
    expect(cleanupPassShift('DOMINANT', DEFAULT_FILL_CLEANUP)).toEqual({ cells: 0, largest: 0 });
  }, 240_000);

  describe('outlineExpansion — the survival and surface-loss ladders', () => {
    /** Each cell's ink share on the sheet **as it arrived**, which is what both ladders sort by. */
    function sourceInkShares(): {
      shares: Float64Array;
      cells: number;
      sheetShare: number;
    } {
      const mesh = boundaryMesh(sheet, 6);
      const width = mesh.x.length;
      const shares = new Float64Array(width * mesh.y.length);
      let ink = 0;
      let opaque = 0;
      for (const [row, top] of mesh.y.entries()) {
        const bottom = Math.min(mesh.y[row + 1] ?? sheet.height, sheet.height);
        for (const [column, left] of mesh.x.entries()) {
          const right = Math.min(mesh.x[column + 1] ?? sheet.width, sheet.width);
          let cellInk = 0;
          let cellOpaque = 0;
          for (let y = top; y < bottom; y += 1) {
            for (let x = left; x < right; x += 1) {
              const at = pixelOffset(sheet.width, x, y);
              if ((sheet.data[at + 3] ?? 0) === 0) continue;
              cellOpaque += 1;
              if (isInkPixel(sheet.data, at)) cellInk += 1;
            }
          }
          shares[row * width + column] = cellOpaque === 0 ? -1 : cellInk / cellOpaque;
          ink += cellInk;
          opaque += cellOpaque;
        }
      }
      return {
        shares,
        cells: width * mesh.y.length,
        sheetShare: (100 * ink) / opaque,
      };
    }

    /** The cells of one population, by index into the result — an empty cell counts for neither. */
    function cellsWhere(shares: Float64Array, test: (share: number) => boolean): readonly number[] {
      const found: number[] = [];
      for (let cell = 0; cell < shares.length; cell += 1) {
        const share = shares[cell] ?? -1;
        if (share >= 0 && test(share)) found.push(cell);
      }
      return found;
    }

    it('sorts the mesh into the populations the ladders are read over', () => {
      const { shares, sheetShare } = sourceInkShares();

      expect(cellsWhere(shares, (share) => share > 0 && share < 0.5).length).toBe(6_433);
      expect(cellsWhere(shares, (share) => share < 0.2).length).toBe(33_575);
      expect(cellsWhere(shares, (share) => share === 0).length).toBe(31_268);
      expect(sheetShare).toBeCloseTo(14.2, 1);
    }, 120_000);

    it.each([
      {
        vote: 'DOMINANT',
        survival: [29.6, 42.7, 54.1, 61.4, 65.4],
        loss: [0.39, 2.7, 5.12, 7.81, 10.51],
        noInkLoss: [0.0, 0.52, 1.73, 3.65, 6.05],
        resultShare: [16.5, 17.2, 18.9, 20.8, 22.9],
      },
      {
        vote: 'INK_WEIGHTED',
        survival: [8.4, 18.0, 32.5, 40.5, 48.5],
        loss: [0.0, 0.47, 2.32, 3.97, 6.08],
        noInkLoss: [0.0, 0.02, 0.59, 1.52, 2.86],
        resultShare: [10.2, 9.8, 12.8, 14.3, 16.1],
      },
    ] satisfies readonly {
      vote: VoteMethod;
      survival: readonly number[];
      loss: readonly number[];
      noInkLoss: readonly number[];
      resultShare: readonly number[];
    }[])(
      'runs the stated ladder under $vote',
      ({ vote, survival, loss, noInkLoss, resultShare }) => {
        const { shares, cells } = sourceInkShares();
        const minority = cellsWhere(shares, (share) => share > 0 && share < 0.5);
        const surface = cellsWhere(shares, (share) => share < 0.2);
        // The cheap reading the docblock rejects, pinned because the gap to `surface` is its whole
        // point — a figure quoted to reject a method drifts as readily as one quoted to justify one.
        const noInk = cellsWhere(shares, (share) => share === 0);

        for (const [thickness, expected] of survival.entries()) {
          const { image } = quantiseImage(sheet, CALIBRATION({ vote, outlineExpansion: thickness }));
          const inkAt = (cell: number): boolean => isInkPixel(image.data, cell * CHANNELS_PER_PIXEL);
          const shareOf = (set: readonly number[]): number => (100 * set.filter(inkAt).length) / set.length;

          expect(shareOf(minority)).toBeCloseTo(expected, 1);
          expect(shareOf(surface)).toBeCloseTo(loss[thickness] ?? 0, 2);
          expect(shareOf(noInk)).toBeCloseTo(noInkLoss[thickness] ?? 0, 2);

          let ink = 0;
          let opaque = 0;
          for (let cell = 0; cell < cells; cell += 1) {
            const at = cell * CHANNELS_PER_PIXEL;
            if ((image.data[at + 3] ?? 0) === 0) continue;
            opaque += 1;
            if (inkAt(cell)) ink += 1;
          }
          expect((100 * ink) / opaque).toBeCloseTo(resultShare[thickness] ?? 0, 1);
        }
      },
      600_000,
    );
  });

  describe("wuQuantiser's error ladder", () => {
    /**
     * How far the average pixel sits from the palette entry it is drawn with, in scaled OKLab.
     *
     * Read off the histogram rather than the pixels, which is cheaper and is also the right
     * question. Cheaper because a colour's distance to its entry is a property of the colour, so the
     * sheet's 1.57 million pixels are 218,978 conversions weighted by their own counts. Right
     * because `colorHistogram` leaves fully transparent pixels out, and those are exactly the pixels
     * `applyPalette` passes through untouched — a mean over the whole field would dilute the error
     * with cleared ground nothing drew an entry on. That is also why `meanCellDistance` next door is
     * not the seam to reach for here: it converts every pixel, so it agrees with this to six
     * decimals on a truecolour sheet and parts company on a keyed one.
     *
     * **The histogram is the unweighted one, deliberately.** `blendWeightedHistogram` decides what a
     * colour is worth while the palette is being *chosen*; this asks what the chosen palette cost
     * the reader, and there every pixel counts once. Conflating the two is what would make the
     * ladder a score the weighting could game.
     *
     * `pixelDistanceOf` rather than a distance spelled here, for the reason its own docblock gives.
     * It measures coverage as a fourth axis, which costs nothing on this reading: the corpus sheets
     * are truecolour, so every colour in the histogram is opaque, and every entry `buildPalette`
     * returns is a colour the sheet holds.
     */
    function meanPaletteError(image: ImageData, palette: readonly Rgba[]): number {
      let total = 0;
      let pixels = 0;
      for (const [key, count] of colorHistogram(image)) {
        const color = unpackColor(key);
        const entry = nearestColor(color, palette);
        if (entry === null) throw new Error('an empty palette has no entry to measure against');
        const from = srgbToOklab(color.r, color.g, color.b);
        const to = srgbToOklab(entry.r, entry.g, entry.b);
        total += count * pixelDistanceOf(from.L, from.a, from.b, color.a, to.L, to.a, to.b, entry.a);
        pixels += count;
      }
      return total / pixels;
    }

    it('the four budgets the module docblock states', () => {
      // The other two figures in the same sentence, which is the whole of what it states about the
      // sheet: a ladder read off a different image is a different claim, and these say it is not.
      expect(countColors(sheet)).toBe(218_978);
      expect([sheet.width, sheet.height]).toEqual([1254, 1254]);

      // Three decimals, because that is the precision the docblock states them to. Pinning fewer
      // would let a restatement round its way out of a move the search had genuinely made.
      expect(
        [16, 32, 64, 256].map((budget) =>
          Number(meanPaletteError(sheet, buildPalette(sheet, budget)).toFixed(3)),
        ),
      ).toEqual([4.697, 3.287, 2.447, 1.676]);
    }, 240_000);
  });

  describe('the two dither tables', () => {
    const GAME_BOY = ['#0F380F', '#306230', '#8BAC0F', '#9BBC0F'].map((hex) => {
      const parsed = fromHex(hex);
      if (parsed === null) throw new Error(`not a colour: ${hex}`);
      return parsed;
    });

    /** A row of the tables: the three figures, per pixel and over 4 x 4 and 8 x 8 blocks. */
    const rowOf = (
      reference: Float64Array,
      image: ImageData,
      width: number,
      height: number,
    ): readonly number[] => {
      const field = toConeField(image);
      return [1, 4, 8].map((block) =>
        Number(meanCellDistance(reference, field, width, height, block).toFixed(3)),
      );
    };

    it('DITHER_CHOICES — the budget-32 row, against the source cell means', () => {
      const mesh = boundaryMesh(sheet, 6);
      const reference = cellMeanField(sheet, mesh);
      const reduction: ColorReduction = { kind: 'MAX_COLORS', maxColors: 32 };
      const rows = (['NONE', 'BAYER_4', 'BAYER_8', 'BLUE_NOISE'] as const).map((dither) =>
        rowOf(
          reference,
          quantiseImage(sheet, CALIBRATION({ dither, reduction })).image,
          mesh.x.length,
          mesh.y.length,
        ),
      );

      // Three decimals rather than the docblock's own one, because 15.75 rounds either way and the
      // table says 15.7 — a two-decimal pin would not tell the two apart.
      expect(rows).toEqual([
        [14.335, 4.734, 3.377],
        [15.747, 4.44, 3.116],
        [15.812, 4.472, 3.158],
        [15.757, 4.476, 3.133],
      ]);
    }, 240_000);

    it('DITHER_SHORTLIST — the column the constant ships, against the sheet with no palette step', () => {
      const flat = quantiseImage(sheet, CALIBRATION({ reduction: null }));
      const reference = toConeField(flat.image);
      const { width, height } = flat.image;

      expect(width * height).toBe(43_681);
      expect(countColors(flat.image)).toBe(9_975);
      expect(countColors(sheet)).toBe(218_978);

      const budgets: readonly ColorReduction[] = [
        { kind: 'MAX_COLORS', maxColors: 64 },
        { kind: 'MAX_COLORS', maxColors: 16 },
        { kind: 'MAX_COLORS', maxColors: 8 },
        { kind: 'PALETTE', entries: GAME_BOY },
      ];

      expect(
        budgets.map((reduction) =>
          rowOf(
            reference,
            quantiseImage(sheet, CALIBRATION({ dither: 'BLUE_NOISE', reduction })).image,
            width,
            height,
          ),
        ),
      ).toEqual([
        [2.199, 0.75, 0.44],
        [4.264, 1.428, 0.876],
        [6.109, 2.516, 1.645],
        [93.926, 84.982, 87.523],
      ]);
    }, 240_000);
  });

  describe('duplicateSprites — the two figures its docblock states', () => {
    /**
     * The reference sheet keyed the way that docblock states it, which is not `CALIBRATION`.
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
    const centreOf = (box: SpriteBox): [number, number] => [
      box.left + box.width / 2,
      box.top + box.height / 2,
    ];

    /**
     * How many of `before`'s sprites came through with the extent they had.
     *
     * **Paired by nearest centre, not by list position**, and the difference is not cosmetic. A
     * perturbed sheet meshes differently, so a sprite can gain or lose a row of drawn pixels at its
     * edge — enough to cross a row band, or to change how the merge folds a piece back onto its
     * neighbour, and either of those renumbers everything after it. Index n is therefore *not* the
     * same piece of artwork either side. Measured on this sheet, an index pairing scores one sprite against a
     * neighbour that happens to share its extent and misses the one that genuinely kept it: two
     * errors that cancel into the right total for the wrong reason, which is a guard that would
     * certify a wrong figure the moment the perturbation, the grid or the key tolerance changed.
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

    it('leaves 3 of the reference sheet 15 sprites with the extent they had, and 6 the other way', () => {
      const before = boxesOf(sheet);
      const up = boxesOf(shifted(sheet, 4));
      const down = boxesOf(shifted(sheet, -4));

      // All three have to find the same sprites for the comparison to mean anything: the figure is
      // about extents changing, not about sprites appearing or vanishing, and the pairing above
      // assumes each sprite has a counterpart to be paired with.
      expect([before.length, up.length, down.length]).toEqual([15, 15, 15]);
      expect([keptExtent(before, up), keptExtent(before, down)]).toEqual([3, 6]);
    }, 600_000);

    it('finds 15 to 42 sprites on the corpus, an order of magnitude under the ceiling', async () => {
      const corpus = await loadCorpus();
      const counts = CORPUS_SHEETS.map((name) => {
        const image = corpus.get(name);
        if (image === undefined) throw new Error(`${name} is missing from the corpus`);
        const { sprites } = quantiseImage(image, KEYED());
        return sprites.kind === 'SEGMENTED' ? sprites.boxes.length : -1;
      });

      expect(counts).toEqual([15, 15, 15, 42, 33, 24, 25, 27]);
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

  describe('the symmetry pass — the two figures its cost is argued from', () => {
    /**
     * The reference sheet keyed as `SYMMETRY_AXIS_SEARCH`'s docblock states it, which is not
     * `CALIBRATION`.
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

    it('totals 17,201 pixels of box against 13,827 of artwork, and is not narrowed by the budget', () => {
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
      expect(opaque).toBe(13_827);

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

  describe('the palette lock — the two populations the snap distance is set from', () => {
    /** The lock both docblocks are stated against: the ink-weighted reading's own colours. */
    const lockFrom = (image: ImageData): readonly Rgba[] =>
      quantiseImage(image, CALIBRATION({ vote: 'INK_WEIGHTED' })).paletteEntries;

    /** How far a colour sits from the lock, in the unit the dial is in. */
    const reachOf = (color: Rgba, lock: readonly LocatedEntry[]): number => {
      const nearest = nearestOklab(color, lock);
      if (nearest === null) throw new Error('an empty lock has no entry to measure against');
      // The root of what `applyLockedPalette` gates on, since it compares the squared figure against
      // `snap × snap` — so this is the distance a snap setting is read against.
      return Math.sqrt(nearest.distance);
    };

    /** Every colour of an image with its distance from the lock and its pixel count, nearest first. */
    const reachesOf = (
      image: ImageData,
      lock: readonly LocatedEntry[],
    ): readonly { reach: number; pixels: number }[] =>
      Array.from(colorHistogram(image), ([key, pixels]) => ({
        reach: reachOf(unpackColor(key), lock),
        pixels,
      })).sort((left, right) => left.reach - right.reach);

    /** The smallest distance within which `share` of the pixels sit. */
    const pixelPercentile = (
      reaches: readonly { reach: number; pixels: number }[],
      share: number,
    ): number => {
      const total = reaches.reduce((sum, { pixels }) => sum + pixels, 0);
      let covered = 0;
      for (const { reach, pixels } of reaches) {
        covered += pixels;
        if (covered >= share * total) return reach;
      }
      return reaches.at(-1)?.reach ?? 0;
    };

    const round = (figure: number): number => Number(figure.toFixed(2));
    const BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };

    /**
     * The re-readings the drift is measured over, and the four of them are the ones a lock can meet.
     *
     * No budget is among them, because a budget is not a re-reading a lock is ever applied to: at any
     * snap above 0 a lock supersedes the budget (`colorPlanFor`), so every budget reads the same while
     * one is reaching. The sheet the lock was taken from, read again, is among them instead — and it is
     * the commonest case, since every dial moved after locking re-reads it.
     */
    const REREADINGS: readonly Partial<QuantiseSettings>[] = [
      { vote: 'INK_WEIGHTED' },
      { vote: 'DOMINANT' },
      { vote: 'K_CENTROID' },
      { vote: 'INK_WEIGHTED', grid: 5 },
    ];

    /**
     * The colours the lock is handed under a re-reading — which is **not** that reading's own result.
     *
     * The lock takes the budget's place in the pipeline, so it runs where the budget would have: ahead
     * of the dominant vote, on the source pixels themselves, and after the two averaging readings, on
     * the cell colours they blended. Measuring it against a 64-colour result instead would measure a
     * second quantisation no locked sheet goes through.
     */
    const handedToTheLock = (over: Partial<QuantiseSettings>): ImageData =>
      over.vote === 'DOMINANT'
        ? sheet
        : quantiseImage(sheet, CALIBRATION({ ...over, reduction: null })).image;

    it('measures the drift where the lock runs: 0.49 at the median, 11.15 to 20.40 at the 99th', () => {
      // The dominant arm hands the lock `sheet` itself only while the outline expansion is off, which
      // is its opening position — a thickened copy is what the budget would otherwise have run on.
      expect(CALIBRATION().outlineExpansion).toBe(0);

      const lock = locateEntries(lockFrom(sheet));
      expect(lock).toHaveLength(64);

      const figures = REREADINGS.map((over) => {
        const reaches = reachesOf(handedToTheLock(over), lock);
        return [
          pixelPercentile(reaches, 0.5),
          pixelPercentile(reaches, 0.99),
          reaches.at(-1)?.reach ?? 0,
        ].map(round);
      });
      expect(figures).toEqual([
        [0.49, 11.19, 25.72],
        [0.5, 20.4, 45.36],
        [0.49, 12.07, 39.12],
        [0.49, 11.15, 30.55],
      ]);

      // The dominant reading's ninety-ninth percentile is one colour, and it is the source's own
      // outline black: the averaging reading the lock was taken from blends it into a dark tone, so
      // pure black is the widest ninety-ninth percentile on this sheet. The opening is the first
      // integer past it, which is the relationship `DEFAULT_PALETTE_SNAP` argues from.
      const black = reachOf(BLACK, lock);
      expect(round(black)).toBe(figures[1]?.[1]);
      expect(DEFAULT_PALETTE_SNAP).toBe(Math.floor(black) + 1);

      // And it is not the widest drift: a sliver of the source still sits past the opening, which
      // the dominant vote outvotes — the next test is where that shows as 100%.
      const source = reachesOf(sheet, lock);
      const pixelsOf = (reaches: typeof source): number =>
        reaches.reduce((sum, { pixels }) => sum + pixels, 0);
      const beyond = source.filter(({ reach }) => reach > DEFAULT_PALETTE_SNAP);
      expect(round((100 * pixelsOf(beyond)) / pixelsOf(source))).toBe(0.36);
    }, 300_000);

    it('draws the dominant reading wholly in locked colours at 21, and the locked sheet in 64 only from 26', () => {
      const entries = lockFrom(sheet);
      const held = new Set(entries.map(packColor));

      /** The share of the result's pixels drawn in a held colour, and how many colours it has. */
      const underLock = (over: Partial<QuantiseSettings>, snap: number): [number, number] => {
        const result = quantiseImage(
          sheet,
          CALIBRATION({ ...over, reduction: { kind: 'LOCKED', entries, snap } }),
        );
        let pixels = 0;
        let locked = 0;
        for (const [key, count] of colorHistogram(result.image)) {
          pixels += count;
          if (held.has(key)) locked += count;
        }
        return [round((100 * locked) / pixels), result.colors];
      };

      expect(REREADINGS.map((over) => underLock(over, DEFAULT_PALETTE_SNAP - 1))).toEqual([
        [99.96, 81],
        [99.09, 64],
        [99.9, 100],
        [99.96, 88],
      ]);
      expect(REREADINGS.map((over) => underLock(over, DEFAULT_PALETTE_SNAP))).toEqual([
        [99.97, 76],
        [100, 61],
        [99.93, 93],
        [99.97, 80],
      ]);

      // The sheet the lock was taken from comes back in its own 64 colours only once its furthest
      // colour, 25.72, is inside the reach — which is what "a lock does not promise a colour count"
      // costs at the opening.
      expect([25, 26].map((snap) => underLock({ vote: 'INK_WEIGHTED' }, snap)[1])).toEqual([65, 64]);
    }, 600_000);

    /** The twelve fully saturated sRGB hues, 30° apart from red — named by hex so they can be re-read. */
    const HUE_WHEEL = [
      '#FF0000',
      '#FF8000',
      '#FFFF00',
      '#80FF00',
      '#00FF00',
      '#00FF80',
      '#00FFFF',
      '#0080FF',
      '#0000FF',
      '#8000FF',
      '#FF00FF',
      '#FF0080',
    ] as const;

    const colorOf = (hex: string): Rgba => {
      const parsed = fromHex(hex);
      if (parsed === null) throw new Error(`not a colour: ${hex}`);
      return parsed;
    };

    it('keeps every saturated hue the sheet does not hold, the nearest at 26.56', () => {
      const lock = locateEntries(lockFrom(sheet));
      const reaches = HUE_WHEEL.map((hex) => round(reachOf(colorOf(hex), lock)));

      expect(reaches).toEqual([
        51.62, 26.56, 26.94, 48.15, 58.41, 49.74, 50.86, 60.15, 69.95, 46.68, 3.72, 39.11,
      ]);

      // Magenta is the one hue this sheet holds — it is the key field, and these conditions do not key
      // it out — so it is the one left out of the population the opening has to keep.
      const absent = reaches.filter((_, index) => HUE_WHEEL[index] !== '#FF00FF');
      expect(Math.min(...absent)).toBeGreaterThan(DEFAULT_PALETTE_SNAP);
    }, 300_000);

    describe('over the corpus', () => {
      let corpus: ReadonlyMap<string, ImageData>;

      beforeAll(async () => {
        corpus = await loadCorpus();
      }, 300_000);

      const sheetNamed = (name: string): ImageData => {
        const image = corpus.get(name);
        if (image === undefined) throw new Error(`${name} is missing from the corpus`);
        return image;
      };

      it('finds colours this sheet has no hue for inside the drift, from 17.79', () => {
        const lock = locateEntries(lockFrom(sheet));

        /**
         * A colour of another sheet's own 16-colour palette, which is the population nobody picked: it
         * is what `buildPalette` says that sheet is made of. The four are the ones the docblock names,
         * each in a hue the reference sheet — green and gold, on magenta — has none of.
         */
        const NAMED = [
          { name: 'character_space_marine_blue.png', hex: '#172136' },
          { name: 'character_space_marine_blue.png', hex: '#1F2B47' },
          { name: 'three-quarter-view_tiles1.png', hex: '#036066' },
          { name: 'cyborg_black_red.png', hex: '#871C20' },
        ] as const;

        const reaches = NAMED.map(({ name, hex }) => {
          const palette = buildPalette(sheetNamed(name), 16);
          const color = colorOf(hex);
          expect(
            palette.some((entry) => packColor(entry) === packColor(color)),
            `${hex} in ${name}`,
          ).toBe(true);
          return round(reachOf(color, lock));
        });

        expect(reaches).toEqual([17.79, 21.56, 25.04, 28.68]);
      }, 600_000);

      it('puts each sheet furthest colour under the ceiling, and black as far as 44.74 from its own lock', () => {
        const figures = CORPUS_SHEETS.map((name) => {
          const image = sheetNamed(name);
          const lock = locateEntries(lockFrom(image));
          return [round(reachesOf(image, lock).at(-1)?.reach ?? 0), round(reachOf(BLACK, lock))];
        });

        expect(figures).toEqual([
          [45.36, 20.4],
          [51.28, 34.15],
          [45.99, 41.88],
          [43.98, 0],
          [45.38, 36.11],
          [42.76, 33.76],
          [35.03, 33.16],
          [55.92, 44.74],
        ]);

        // The ceiling's claim: at its top the lock reaches every colour any corpus sheet hands it under
        // the dominant reading, which the cleanup dials' own ceiling would not.
        const furthest = figures.map(([reach]) => reach ?? 0);
        expect(Math.max(...furthest)).toBeLessThan(PALETTE_SNAP_RANGE.max);
        expect(furthest.filter((reach) => reach > COLOR_MERGE_RANGE.max)).toHaveLength(2);
      }, 600_000);
    });
  });
});
