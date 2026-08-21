import { describe, expect, it } from 'vitest';
import { SCATTERED_SPRITE_CEILING, SMALLEST_SPRITE_PIXELS } from '../constants/quantiser.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT } from './imageData.ts';
import { spriteSegments, widestSprite } from './spriteSegments.ts';

const INK = { r: 20, g: 30, b: 40, a: FULLY_OPAQUE };
const CLEAR = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

/** One rectangle of opaque pixels, in the inclusive-left, exclusive-right form the tests read in. */
interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A transparent sheet carrying the given solid rectangles. */
function sheetOf(width: number, height: number, rects: readonly Rect[]): ImageData {
  return imageFrom(width, height, (x, y) =>
    rects.some(
      (rect) => x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height,
    )
      ? INK
      : CLEAR,
  );
}

/** The boxes, or a failure that says what came back instead — every assertion below wants these. */
function boxesOf(image: ImageData, gap: number): readonly SpriteBox[] {
  const found = spriteSegments(image, gap);
  if (found.kind !== 'SEGMENTED') throw new Error(`Expected SEGMENTED, got ${found.kind}`);
  return found.boxes;
}

describe('spriteSegments', () => {
  it('finds each separated rectangle once, with its own bounds and pixel count', () => {
    const image = sheetOf(40, 20, [
      { left: 2, top: 3, width: 6, height: 5 },
      { left: 20, top: 10, width: 4, height: 4 },
    ]);

    expect(boxesOf(image, 0)).toEqual([
      { left: 2, top: 3, width: 6, height: 5, pixels: 30 },
      { left: 20, top: 10, width: 4, height: 4, pixels: 16 },
    ]);
  });

  it('returns the sprites in reading order whatever order they were laid down in', () => {
    // Written bottom-right first, so an implementation that reported them in the order it was handed
    // them would come back reversed. Reading order is what the atlas and the preview both number by.
    const image = sheetOf(40, 40, [
      { left: 24, top: 24, width: 4, height: 4 },
      { left: 2, top: 2, width: 4, height: 4 },
      { left: 24, top: 2, width: 4, height: 4 },
    ]);

    expect(boxesOf(image, 0).map((box) => [box.left, box.top])).toEqual([
      [2, 2],
      [24, 2],
      [24, 24],
    ]);
  });

  it('joins a diagonal stair into one sprite, because pixel art is drawn eight-connected', () => {
    // Four-connectivity reports this as four sprites; to an artist it is one line. The stair also
    // makes the merge irrelevant — the pixels touch — so this is the labelling alone.
    const image = imageFrom(10, 10, (x, y) => (x === y && x < 4 ? INK : CLEAR));

    expect(boxesOf(image, 0)).toEqual([{ left: 0, top: 0, width: 4, height: 4, pixels: 4 }]);
  });

  it('resolves a U-shape as one region however far apart the two arms start', () => {
    // The case a labelling pass gets wrong without union–find: the arms are given separate labels on
    // the first row they appear in, and only the base — twelve rows later — says they are one thing.
    const image = imageFrom(10, 14, (x, y) =>
      (y === 13 && x >= 1 && x <= 8) || ((x === 1 || x === 8) && y >= 1) ? INK : CLEAR,
    );

    expect(boxesOf(image, 0)).toEqual([{ left: 1, top: 1, width: 8, height: 13, pixels: 32 }]);
  });

  it('leaves pieces further apart than the gap as separate sprites', () => {
    // Three clear columns between them, so a gap of 2 does not reach and a gap of 3 does.
    const image = sheetOf(20, 10, [
      { left: 2, top: 2, width: 4, height: 4 },
      { left: 9, top: 2, width: 4, height: 4 },
    ]);

    expect(boxesOf(image, 2)).toHaveLength(2);
    expect(boxesOf(image, 3)).toEqual([{ left: 2, top: 2, width: 11, height: 4, pixels: 32 }]);
  });

  it('folds a floating piece into the sprite it belongs to, and sums their artwork', () => {
    // A figure and the sword it holds one pixel clear of its hand — the failure the dial is for.
    const image = sheetOf(20, 20, [
      { left: 2, top: 2, width: 6, height: 10 },
      { left: 9, top: 4, width: 2, height: 2 },
    ]);

    expect(boxesOf(image, 1)).toEqual([{ left: 2, top: 2, width: 9, height: 10, pixels: 64 }]);
  });

  it('folds a piece sitting inside another one’s box even at a gap of zero', () => {
    // A hollow ring with a block floating in the middle of it — four clear pixels from the ring on
    // every side, so nothing joins them and neither is a speck, and the block's box is wholly inside
    // the ring's. `0` is not an off position, and this is the case that says so.
    const ring = (x: number, y: number) => x === 0 || y === 0 || x === 9 || y === 9;
    const block = (x: number, y: number) => x >= 4 && x <= 5 && y >= 4 && y <= 5;
    const image = imageFrom(12, 12, (x, y) =>
      x < 10 && y < 10 && (ring(x, y) || block(x, y)) ? INK : CLEAR,
    );

    expect(boxesOf(image, 0)).toEqual([{ left: 0, top: 0, width: 10, height: 10, pixels: 40 }]);
  });

  it('folds a chain transitively, so a piece reaches one it is nowhere near', () => {
    // Four pieces, each two clear pixels from the next and seven from the one beyond it. Only the
    // adjacent pairs are within the gap, so the first and last end up in one box purely by way of
    // the two between them. It pins the transitive closure, not how many rounds reaching it took —
    // that is unobservable from here, since a merger that folded one pair per round would converge
    // on the same box; the round *count* is pinned by the fixed-point case below instead.
    const image = sheetOf(40, 10, [
      { left: 0, top: 2, width: 3, height: 3 },
      { left: 5, top: 2, width: 3, height: 3 },
      { left: 10, top: 2, width: 3, height: 3 },
      { left: 15, top: 2, width: 3, height: 3 },
    ]);

    expect(boxesOf(image, 2)).toEqual([{ left: 0, top: 2, width: 18, height: 3, pixels: 36 }]);
  });

  it('reaches a piece that only the merged box comes near, which needs a second round', () => {
    // The fixed point in one picture. A bar along the top and a bar down the right are two apart, so
    // they fold in the first round — and the L they make has a box covering the empty bottom-left
    // corner, where the third piece sits. That piece is 24 clear pixels from the first bar and 14
    // from the second, so no pairing of the *original* boxes reaches it; it is two from the box the
    // other two make together. One round leaves two boxes, and the loop is what finds the third.
    const image = sheetOf(24, 34, [
      { left: 0, top: 0, width: 20, height: 2 },
      { left: 18, top: 4, width: 2, height: 20 },
      { left: 0, top: 26, width: 4, height: 4 },
    ]);

    expect(boxesOf(image, 2)).toEqual([{ left: 0, top: 0, width: 20, height: 30, pixels: 96 }]);
  });

  it('counts a piece below the floor as a speck rather than as a sprite', () => {
    const image = sheetOf(20, 20, [
      { left: 2, top: 2, width: 4, height: 4 },
      // One pixel short of the floor, and far enough away that the merge cannot rescue it.
      { left: 15, top: 15, width: SMALLEST_SPRITE_PIXELS - 1, height: 1 },
    ]);
    const found = spriteSegments(image, 1);

    expect(found).toEqual({
      kind: 'SEGMENTED',
      boxes: [{ left: 2, top: 2, width: 4, height: 4, pixels: 16 }],
      specks: 1,
    });
  });

  it('folds a speck that touches a sprite into it instead of counting it', () => {
    // The floor is applied to *labelled regions*, and a speck adjacent to artwork is not its own
    // region at all — eight-connectivity has already taken it. So a contour's stray pixel adds to
    // the sprite's own count rather than being reported as fringe.
    const image = sheetOf(20, 20, [
      { left: 2, top: 2, width: 4, height: 4 },
      { left: 6, top: 6, width: 1, height: 1 },
    ]);

    expect(spriteSegments(image, 0)).toEqual({
      kind: 'SEGMENTED',
      boxes: [{ left: 2, top: 2, width: 5, height: 5, pixels: 17 }],
      specks: 0,
    });
  });

  it('reports a sheet with nothing opaque on it as no sprites at all', () => {
    expect(spriteSegments(sheetOf(16, 16, []), 1)).toEqual({
      kind: 'SEGMENTED',
      boxes: [],
      specks: 0,
    });
  });

  it('answers SOLID for a sheet with nothing transparent on it, rather than one box covering it', () => {
    // Nothing has told the pass where a sprite ends, so the honest answer is that it found none —
    // not that it found one the size of the raster, which every reader downstream would go on to
    // compare against a component count and a target size. It is also what the early-out is for: no
    // full-size label array is allocated to reach it.
    const image = imageFrom(9, 7, () => INK);

    expect(spriteSegments(image, 1)).toEqual({ kind: 'SOLID' });
  });

  it('answers SOLID on the keying setting having nothing to do with it', () => {
    // The distinction the union exists to carry. This sheet is opaque because its pixels are opaque,
    // and the one below is separable because its pixels are not — neither fact is reachable from
    // whether a key pass ran, which is why nothing downstream is allowed to infer it from the
    // setting. A sheet arriving with its own alpha is the ordinary case here: it is what this app's
    // own Download PNG writes.
    const alreadyTransparent = sheetOf(20, 20, [
      { left: 2, top: 2, width: 4, height: 4 },
      { left: 12, top: 12, width: 4, height: 4 },
    ]);

    expect(spriteSegments(alreadyTransparent, 1)).toEqual({
      kind: 'SEGMENTED',
      boxes: [
        { left: 2, top: 2, width: 4, height: 4, pixels: 16 },
        { left: 12, top: 12, width: 4, height: 4, pixels: 16 },
      ],
      specks: 0,
    });
  });

  it('refuses to call a sheet of thousands of islands a sprite count', () => {
    // Every other pixel opaque, in both directions and offset so nothing is eight-connected: 4,096
    // islands of one pixel on a 128-square sheet. They are all specks, so the ceiling is reached by
    // making each island large enough to clear the floor instead — a 2 × 2 block every four pixels.
    const image = imageFrom(128, 128, (x, y) => (x % 4 < 2 && y % 4 < 2 ? INK : CLEAR));
    const found = spriteSegments(image, 0);

    expect(found.kind).toBe('SCATTERED');
    if (found.kind !== 'SCATTERED') return;
    expect(found.pieces).toBe(32 * 32);
    expect(found.pieces).toBeGreaterThan(SCATTERED_SPRITE_CEILING);
    expect(found.specks).toBe(0);
  });
});

describe('widestSprite', () => {
  it('takes the largest box by area, not the one with the most artwork in it', () => {
    // A tall thin box holding more ink than a large sprawling one. The cell has to seat the *box*.
    const boxes: SpriteBox[] = [
      { left: 0, top: 0, width: 2, height: 20, pixels: 40 },
      { left: 10, top: 0, width: 12, height: 12, pixels: 30 },
    ];

    expect(widestSprite(boxes)).toBe(boxes[1]);
  });

  it('keeps the earlier box on a tie, so the answer does not move between two equal sprites', () => {
    const boxes: SpriteBox[] = [
      { left: 0, top: 0, width: 4, height: 4, pixels: 16 },
      { left: 8, top: 0, width: 4, height: 4, pixels: 16 },
    ];

    expect(widestSprite(boxes)).toBe(boxes[0]);
  });

  it('answers null where nothing was found', () => {
    expect(widestSprite([])).toBeNull();
  });
});
