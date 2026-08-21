import { describe, expect, it } from 'vitest';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { duplicateSprites } from './duplicateSprites.ts';
import { DUPLICATE_TOLERANCE_RANGE } from '../constants/quantiser.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';
import { srgbToOklabInto } from './oklab.ts';
import { pixelDistance } from './pixelDistance.ts';
import { spriteSegments } from './spriteSegments.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };
const INK: Rgba = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const OTHER: Rgba = { r: 200, g: 40, b: 40, a: FULLY_OPAQUE };

/** One sprite to be stamped onto a sheet: where it goes, and what its cells hold. */
interface Stamp {
  readonly left: number;
  readonly top: number;
  /** Row-major, one colour per cell — the rows must all be the same length. */
  readonly cells: readonly (readonly Rgba[])[];
}

/**
 * A transparent sheet with each stamp written onto it, and the boxes naming where they went.
 *
 * The boxes are stated rather than segmented, so a test can hand `duplicateSprites` exactly the
 * extents it means to compare — including two that differ, which a segmentation of the same sheet
 * would produce only by accident. {@link segmentedBoxes} is the other direction, for the cases where
 * agreeing with the real segmentation is the point.
 */
function sheetOf(
  width: number,
  height: number,
  stamps: readonly Stamp[],
): { image: ImageData; boxes: SpriteBox[] } {
  const image = imageFrom(width, height, () => CLEAR);
  const boxes: SpriteBox[] = [];

  for (const stamp of stamps) {
    let pixels = 0;
    for (const [row, cells] of stamp.cells.entries()) {
      for (const [column, color] of cells.entries()) {
        const at = pixelOffset(width, stamp.left + column, stamp.top + row);
        image.data[at] = color.r;
        image.data[at + 1] = color.g;
        image.data[at + 2] = color.b;
        image.data[at + 3] = color.a;
        if (color.a !== FULLY_TRANSPARENT) pixels += 1;
      }
    }
    boxes.push({
      left: stamp.left,
      top: stamp.top,
      width: stamp.cells[0]?.length ?? 0,
      height: stamp.cells.length,
      pixels,
    });
  }

  return { image, boxes };
}

/** A solid block of one colour, as a stamp's cells. */
function block(width: number, height: number, color: Rgba): Rgba[][] {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => color));
}

/** The same block with one cell replaced, which is how a near-duplicate is built. */
function blockWith(width: number, height: number, color: Rgba, spot: Rgba, count: number): Rgba[][] {
  const cells = block(width, height, color);
  for (let index = 0; index < count; index += 1) {
    const row = cells[Math.floor(index / width)];
    if (row !== undefined) row[index % width] = spot;
  }
  return cells;
}

/** How many cells inside a box carry any coverage — what the comparison actually walks. */
function visibleCells(image: ImageData, box: SpriteBox): number {
  let count = 0;
  for (let row = 0; row < box.height; row += 1) {
    for (let column = 0; column < box.width; column += 1) {
      const at = pixelOffset(image.width, box.left + column, box.top + row);
      if ((image.data[at + 3] ?? 0) !== FULLY_TRANSPARENT) count += 1;
    }
  }
  return count;
}

/** The boxes the real segmentation finds, for the cases that are about agreeing with it. */
function segmentedBoxes(image: ImageData): readonly SpriteBox[] {
  const found = spriteSegments(image, 0);
  if (found.kind !== 'SEGMENTED') throw new Error(`Expected SEGMENTED, got ${found.kind}`);
  return found.boxes;
}

describe('duplicateSprites', () => {
  it('groups sprites that hold identical pixels, and marks them exact', () => {
    const { image, boxes } = sheetOf(40, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: block(4, 4, INK) },
    ]);

    const groups = duplicateSprites(image, boxes, 0);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.canonical.left).toBe(2);
    expect(groups[0]?.duplicates).toEqual([{ box: boxes[1], exact: true }]);
  });

  it('compares sprites of different sizes, charging the cells only one of them covers', () => {
    // Two drawings a column apart, laid over one another by their top-left corners. The column only
    // the wider one has is clear on the other side, so it scores the full 255 — over the 21 × 20
    // union box that averages to 12, which is inside the dial's range and outside the lower rungs.
    const { image, boxes } = sheetOf(80, 30, [
      { left: 2, top: 2, cells: block(20, 20, INK) },
      { left: 30, top: 2, cells: block(21, 20, INK) },
    ]);

    expect(duplicateSprites(image, boxes, 8)).toEqual([]);
    expect(duplicateSprites(image, boxes, 24)).toHaveLength(1);
  });

  it('does not group two sprites whose sizes are genuinely different', () => {
    // The same flat colour at half the width. Nothing about the colours separates these, and the
    // silhouette is the whole of what does — which is what the union box is for.
    const { image, boxes } = sheetOf(80, 30, [
      { left: 2, top: 2, cells: block(20, 20, INK) },
      { left: 30, top: 2, cells: block(10, 20, INK) },
    ]);

    expect(duplicateSprites(image, boxes, 24)).toEqual([]);
  });

  it('only ever calls two sprites identical when their pixels match, sizes included', () => {
    // A pair the tolerance groups and the hash must not: the wider drawing holds artwork the other
    // does not, so `exact` has to be false however alike the two look.
    const { image, boxes } = sheetOf(80, 30, [
      { left: 2, top: 2, cells: block(20, 20, INK) },
      { left: 30, top: 2, cells: block(21, 20, INK) },
    ]);

    expect(duplicateSprites(image, boxes, 24)[0]?.duplicates[0]?.exact).toBe(false);
  });

  it('does not group sprites that differ by more than the tolerance', () => {
    // Four of sixteen cells a whole colour apart, which is far past every rung the dial offers.
    const { image, boxes } = sheetOf(40, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: blockWith(4, 4, INK, OTHER, 4) },
    ]);

    expect(duplicateSprites(image, boxes, 0)).toEqual([]);
    expect(duplicateSprites(image, boxes, 8)).toEqual([]);
  });

  it('groups sprites that differ by less than the tolerance, and does not mark them exact', () => {
    // One cell of sixteen replaced. The distance between the two colours is far more than the
    // tolerance, and averaged over the sprite it is a sixteenth of that, so the pair passes at 24
    // and fails at 0 — which is the dial doing exactly what it says.
    const { image, boxes } = sheetOf(40, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: blockWith(4, 4, INK, OTHER, 1) },
    ]);

    expect(duplicateSprites(image, boxes, 0)).toEqual([]);

    const groups = duplicateSprites(image, boxes, 24);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.duplicates).toEqual([{ box: boxes[1], exact: false }]);
  });

  it('names the group after the first of its sprites in the list it was handed', () => {
    // Stamped bottom-right first and then segmented, so the list arrives in reading order while the
    // sheet was written in the reverse of it — an implementation that named a group after whichever
    // sprite it met first while walking its own buckets could still pass by accident, so the boxes
    // come from `spriteSegments` and the assertion is against the order it produced.
    const { image } = sheetOf(40, 40, [
      { left: 24, top: 24, cells: block(4, 4, INK) },
      { left: 2, top: 2, cells: block(4, 4, INK) },
    ]);
    const boxes = segmentedBoxes(image);

    const groups = duplicateSprites(image, boxes, 0);

    expect(groups[0]?.canonical).toEqual(boxes[0]);
    expect(groups[0]?.canonical.top).toBe(2);
    expect(groups[0]?.duplicates.map((member) => member.box)).toEqual([boxes[1]]);
  });

  it('reports the groups in the order their first sprites appear in the list', () => {
    const { image } = sheetOf(60, 40, [
      { left: 2, top: 20, cells: block(4, 4, OTHER) },
      { left: 2, top: 2, cells: block(3, 3, INK) },
      { left: 30, top: 20, cells: block(4, 4, OTHER) },
      { left: 30, top: 2, cells: block(3, 3, INK) },
    ]);

    const groups = duplicateSprites(image, segmentedBoxes(image), 0);

    expect(groups.map((group) => group.canonical.top)).toEqual([2, 20]);
  });

  it('puts three alike sprites in one group rather than three pairs', () => {
    const { image, boxes } = sheetOf(60, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: block(4, 4, INK) },
      { left: 40, top: 2, cells: block(4, 4, INK) },
    ]);

    const groups = duplicateSprites(image, boxes, 0);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.duplicates).toHaveLength(2);
  });

  it('marks each member against the canonical, not against whichever it matched', () => {
    // Three sprites: two identical, and a third that is near the first without matching it. The
    // group holds all three, and only the identical one is exact — a flag that read "matched
    // something exactly" rather than "matches the canonical" would mark two.
    const { image, boxes } = sheetOf(60, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: block(4, 4, INK) },
      { left: 40, top: 2, cells: blockWith(4, 4, INK, OTHER, 1) },
    ]);

    const groups = duplicateSprites(image, boxes, 24);

    expect(groups[0]?.duplicates.map((member) => member.exact)).toEqual([true, false]);
  });

  it('chains through a middle sprite rather than reporting two overlapping groups', () => {
    // A is near B and B is near C, while A and C are twice the tolerance apart. The relation is not
    // transitive, and the union–find is what settles that into one group.
    const { image, boxes } = sheetOf(60, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: blockWith(4, 4, INK, OTHER, 1) },
      { left: 40, top: 2, cells: blockWith(4, 4, INK, OTHER, 2) },
    ]);

    const groups = duplicateSprites(image, boxes, 12);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.duplicates).toHaveLength(2);
  });

  it('ignores what lies under a transparent pixel', () => {
    // Two sprites whose visible cells match and whose cleared cells carry different rubbish, which
    // is the ordinary state of an `ImageData` nothing has zeroed. Reading those bytes would split
    // the pair over pixels nobody can see.
    const { image, boxes } = sheetOf(40, 20, [
      {
        left: 2,
        top: 2,
        cells: [
          [INK, CLEAR],
          [INK, INK],
        ],
      },
      {
        left: 20,
        top: 2,
        cells: [
          [INK, { r: 200, g: 10, b: 90, a: FULLY_TRANSPARENT }],
          [INK, INK],
        ],
      },
    ]);

    const groups = duplicateSprites(image, boxes, 0);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.duplicates[0]?.exact).toBe(true);
  });

  it('counts a cell present on one side and absent on the other as a full loss', () => {
    // One cell of four cleared on the second sprite. A cell that vanished is 255 from the one it
    // replaced, so the mean over four cells is about 64 — past every rung the dial offers, where
    // measuring colour alone would have read it as no difference at all.
    const { image, boxes } = sheetOf(40, 20, [
      {
        left: 2,
        top: 2,
        cells: [
          [INK, INK],
          [INK, INK],
        ],
      },
      {
        left: 20,
        top: 2,
        cells: [
          [INK, CLEAR],
          [INK, INK],
        ],
      },
    ]);

    expect(duplicateSprites(image, boxes, 24)).toEqual([]);
  });

  it('finds nothing on a sheet whose sprites are all different', () => {
    const { image, boxes } = sheetOf(60, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: block(4, 4, OTHER) },
      { left: 40, top: 2, cells: block(3, 3, INK) },
    ]);

    expect(duplicateSprites(image, boxes, 8)).toEqual([]);
  });

  it('finds nothing in an empty box list', () => {
    const { image } = sheetOf(10, 10, []);

    expect(duplicateSprites(image, [], 24)).toEqual([]);
  });

  it('agrees with the boxes the real segmentation produces', () => {
    // The pairing this ships as: the boxes come from `spriteSegments` rather than being stated, so a
    // change to either side that put them on different coordinates would fail here.
    const { image } = sheetOf(40, 20, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 20, top: 2, cells: block(4, 4, INK) },
    ]);
    const boxes = segmentedBoxes(image);

    const groups = duplicateSprites(image, boxes, 0);

    expect(groups).toHaveLength(1);
    expect(groups[0]?.canonical).toEqual(boxes[0]);
    expect(groups[0]?.duplicates.map((member) => member.box)).toEqual([boxes[1]]);
  });

  it('does not read past the end of a sprite that touches the sheet edge', () => {
    // A box flush against the right and bottom edges. Nothing here can be answered by the values
    // that come back — an over-read on a `Uint8ClampedArray` is `undefined`, which the readers turn
    // into zero — so what it proves is that the walk stays inside its own rows: a stride mistake
    // would wrap onto the next row's cells and stop the two matching.
    const { image, boxes } = sheetOf(20, 8, [
      { left: 2, top: 2, cells: block(4, 4, INK) },
      { left: 16, top: 4, cells: block(4, 4, INK) },
    ]);

    expect(duplicateSprites(image, boxes, 0)).toHaveLength(1);
  });
});

/**
 * The early exit against a plain reading of the same question.
 *
 * `withinTolerance` abandons a pair as soon as its running sum can no longer come under the
 * tolerance, which is what makes the quadratic walk affordable — and an exit that abandons one cell
 * too early is a pair silently not reported, with nothing on screen to say so. The bound it uses is
 * therefore the whole of its correctness, and the way to hold it is an oracle: compute the mean the
 * long way, with no exit at all, and require the two to agree at every rung of the dial.
 *
 * **The fixture is a thin sprite with isolated specks inside its bounds**, which is the case the
 * first bound written here got wrong. That bound was `tolerance × (left.pixels + right.pixels)`
 * where the union box's cell count was larger — tighter, and unsound, because `SpriteBox.pixels`
 * counts a *region's* opaque pixels rather than its *box's*. A diagonal stroke has a box far larger
 * than itself, and one-pixel fringe scattered through that box is opaque, is compared, and is absent
 * from the figure: thirty specks against a twelve-pixel stroke make the divisor forty-two where the
 * bound allowed twenty-four, so a pair whose true mean was under the tolerance was rejected. Every
 * fixture above is a solid block, where the bound is generous and the fault cannot show.
 */
describe('duplicateSprites — the early exit agrees with a plain reading', () => {
  /**
   * A diagonal stroke filling a 12 × 12 box, with one-pixel specks scattered through it.
   *
   * The specks sit on even coordinates four or more apart in x and y, so no two of them touch each
   * other or the stroke even diagonally — a cell's eight-connected distance to the diagonal is half
   * its distance from it, which is why four rather than two. That is what keeps each speck its own
   * region, under the speck floor, and therefore inside the box but outside its pixel count.
   */
  function speckled(shade: Rgba, differing: number): Rgba[][] {
    const cells = Array.from({ length: 12 }, () => Array.from({ length: 12 }, () => CLEAR));
    let left = differing;
    for (let y = 0; y < 12; y += 1) {
      const row = cells[y];
      if (row === undefined) continue;
      row[y] = INK;
      for (let x = 0; x < 12; x += 1) {
        if (x % 2 !== 0 || y % 2 !== 0 || Math.abs(x - y) < 4) continue;
        // The cells that make this sprite differ from its twin, taken off the specks so the stroke —
        // and therefore the box — is identical on both sides.
        row[x] = left > 0 ? shade : INK;
        if (left > 0) left -= 1;
      }
    }
    return cells;
  }

  /** The mean per-cell distance over the union box, computed the long way with no early exit. */
  function meanDistance(image: ImageData, left: SpriteBox, right: SpriteBox): number {
    const width = Math.max(left.width, right.width);
    const height = Math.max(left.height, right.height);
    const leftColor = { L: 0, a: 0, b: 0 };
    const rightColor = { L: 0, a: 0, b: 0 };
    let sum = 0;
    let counted = 0;

    for (let row = 0; row < height; row += 1) {
      for (let column = 0; column < width; column += 1) {
        const inLeft = row < left.height && column < left.width;
        const inRight = row < right.height && column < right.width;
        const from = inLeft ? pixelOffset(image.width, left.left + column, left.top + row) : -1;
        const to = inRight ? pixelOffset(image.width, right.left + column, right.top + row) : -1;
        const leftAlpha = from < 0 ? 0 : (image.data[from + 3] ?? 0);
        const rightAlpha = to < 0 ? 0 : (image.data[to + 3] ?? 0);
        if (leftAlpha === FULLY_TRANSPARENT && rightAlpha === FULLY_TRANSPARENT) continue;
        counted += 1;
        if (from >= 0) {
          srgbToOklabInto(
            leftColor,
            image.data[from] ?? 0,
            image.data[from + 1] ?? 0,
            image.data[from + 2] ?? 0,
          );
        }
        if (to >= 0) {
          srgbToOklabInto(rightColor, image.data[to] ?? 0, image.data[to + 1] ?? 0, image.data[to + 2] ?? 0);
        }
        sum += pixelDistance(leftColor, leftAlpha, rightColor, rightAlpha);
      }
    }
    return counted === 0 ? 0 : sum / counted;
  }

  it('reports the box holding far more visible cells than the sprite it bounds', () => {
    // The premise the case below rests on, asserted rather than assumed: if the specks ever stopped
    // being specks — an eight-connected neighbour, or a floor that admitted them — the sweep would
    // still pass and would have stopped testing anything.
    const { image } = sheetOf(40, 20, [{ left: 2, top: 2, cells: speckled(INK, 0) }]);
    const box = segmentedBoxes(image)[0];
    if (box === undefined) throw new Error('the fixture needs its box.');

    expect([box.left, box.top, box.width, box.height]).toEqual([2, 2, 12, 12]);
    // The stroke's own pixels, which is all the segmentation counts — and the cells the comparison
    // actually walks, which is two and a half times as many.
    expect(box.pixels).toBe(12);
    expect(visibleCells(image, box)).toBe(32);
  });

  it('groups a pair at exactly the rungs a plain reading says it should', () => {
    for (const differing of [1, 3, 5, 7]) {
      const { image } = sheetOf(40, 20, [
        { left: 2, top: 2, cells: speckled(INK, 0) },
        { left: 20, top: 2, cells: speckled(OTHER, differing) },
      ]);
      // The segmentation's own boxes, not the stamps' — a stated box would carry the specks in its
      // pixel count, which is the very thing the real one leaves out.
      const boxes = segmentedBoxes(image);
      const first = boxes[0];
      const second = boxes[1];
      if (first === undefined || second === undefined) throw new Error('the fixture needs two boxes.');

      const mean = meanDistance(image, first, second);
      // The sweep has to straddle the answer, or it proves nothing about where the line falls.
      expect(mean, `${String(differing)} differing cells`).toBeGreaterThan(0);
      expect(mean, `${String(differing)} differing cells`).toBeLessThan(DUPLICATE_TOLERANCE_RANGE.max);

      for (let tolerance = 0; tolerance <= DUPLICATE_TOLERANCE_RANGE.max; tolerance += 1) {
        expect(
          duplicateSprites(image, boxes, tolerance).length,
          `${String(differing)} differing cells at tolerance ${String(tolerance)}, mean ${mean.toFixed(3)}`,
        ).toBe(mean <= tolerance ? 1 : 0);
      }
    }
  });
});
