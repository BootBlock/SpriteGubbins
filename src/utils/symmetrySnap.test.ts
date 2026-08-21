import { describe, expect, it } from 'vitest';
import type { Rgba, SpriteBox, SpriteSymmetry } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { FULLY_OPAQUE, FULLY_TRANSPARENT, pixelOffset, readPixel } from './imageData.ts';
import { snapSymmetric } from './symmetrySnap.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };
const BODY: Rgba = { r: 90, g: 110, b: 140, a: FULLY_OPAQUE };
const TRIM: Rgba = { r: 210, g: 180, b: 60, a: FULLY_OPAQUE };
/** A third colour, for the fixtures that need mass in the box without joining a pair's vote. */
const FILL: Rgba = { r: 40, g: 40, b: 40, a: FULLY_OPAQUE };

function box(left: number, top: number, width: number, height: number, pixels: number): SpriteBox {
  return { left, top, width, height, pixels };
}

/** One reading, marked for the snap unless a fixture says otherwise. */
function reading(bounds: SpriteBox, axis: number, snapped = true): SpriteSymmetry {
  return { box: bounds, axis, confidence: 1, snapped };
}

/** One pixel of a result, for the assertions below. */
function at(image: ImageData, x: number, y: number): Rgba {
  return readPixel(image.data, pixelOffset(image.width, x, y));
}

/** A row of named colours, so a fixture reads as the row it draws. */
function row(colors: readonly Rgba[]): ImageData {
  return imageFrom(colors.length, 1, (x) => colors[x] ?? CLEAR);
}

describe('snapSymmetric', () => {
  it('writes both members of a disagreeing pair with the colour the sprite holds more of', () => {
    // Body outnumbers trim three to one inside the box, so the odd trim pixel is the drift and the
    // pair settles on body.
    const image = row([BODY, BODY, BODY, TRIM]);

    const snapped = snapSymmetric(image, [reading(box(0, 0, 4, 1, 4), 1.5)]);

    expect(at(snapped, 0, 0)).toEqual(BODY);
    expect(at(snapped, 3, 0)).toEqual(BODY);
    expect(at(snapped, 1, 0)).toEqual(BODY);
    expect(at(snapped, 2, 0)).toEqual(BODY);
  });

  it('restores a broken contour rather than breaking the side that was intact', () => {
    // A four-column sprite outlined down both edges, with one pixel knocked out of the left edge.
    // Fill outnumbers the edge colour nine to seven inside the box, so settling the pair by which
    // colour the sprite holds more of would answer the hole on the left by punching a matching one
    // on the right. The intact pixel has the rest of its edge above and below it, and wins on that.
    const image = imageFrom(4, 4, (x, y) => {
      if (x === 0 && y === 1) return FILL;
      return x === 0 || x === 3 ? TRIM : FILL;
    });

    const snapped = snapSymmetric(image, [reading(box(0, 0, 4, 4, 16), 1.5)]);

    expect(at(snapped, 0, 1)).toEqual(TRIM);
    expect(at(snapped, 3, 1)).toEqual(TRIM);
  });

  it('lets the minority side win where the minority colour is the commoner one', () => {
    // The same pair, and the vote turned round by the rest of the sprite: trim now outnumbers body.
    const image = row([BODY, TRIM, TRIM, TRIM]);

    const snapped = snapSymmetric(image, [reading(box(0, 0, 4, 1, 4), 1.5)]);

    expect(at(snapped, 0, 0)).toEqual(TRIM);
    expect(at(snapped, 3, 0)).toEqual(TRIM);
  });

  it('settles a tie on the side of the axis carrying more coverage', () => {
    // Body and trim occur once each inside the box, so the tally cannot decide the pair on the top
    // row. The right of the axis carries four opaque pixels against the left's two, so the right
    // member wins — with the sides the other way round this pair would come back body.
    const image = imageFrom(4, 2, (x, y) => {
      if (y === 1) return x < 2 ? CLEAR : FILL;
      if (x === 0) return BODY;
      return x === 3 ? TRIM : FILL;
    });

    const snapped = snapSymmetric(image, [reading(box(0, 0, 4, 2, 6), 1.5)]);

    expect(at(snapped, 0, 0)).toEqual(TRIM);
    expect(at(snapped, 3, 0)).toEqual(TRIM);
  });

  it('settles a tie the coverage cannot break on the left-hand member', () => {
    // Two colours, one apiece, and the same coverage either side of the axis. Something still has to
    // decide, and it has to decide the same way on two runs of the same sheet.
    const image = row([BODY, TRIM, BODY, TRIM]);

    const snapped = snapSymmetric(image, [reading(box(0, 0, 4, 1, 4), 1.5)]);

    expect(at(snapped, 0, 0)).toEqual(BODY);
    expect(at(snapped, 3, 0)).toEqual(BODY);
  });

  it('treats every cleared pixel as one colour rather than as the bytes left under it', () => {
    // Two pixels nobody can see, carrying different bytes. Left as themselves they would be found to
    // disagree, and the pair would be "settled" by writing one invisible colour over another — and
    // they would split the empty vote in the tally that every other pair is decided by.
    const ghost: Rgba = { r: 200, g: 30, b: 30, a: FULLY_TRANSPARENT };
    const image = row([CLEAR, BODY, BODY, ghost]);

    const snapped = snapSymmetric(image, [reading(box(0, 0, 4, 1, 2), 1.5)]);

    expect(at(snapped, 0, 0).a).toBe(FULLY_TRANSPARENT);
    expect(at(snapped, 3, 0).a).toBe(FULLY_TRANSPARENT);
  });

  it('clears a pixel whose partner is empty where empty is the commoner answer', () => {
    // The honest consequence of the vote, and the reason the whole pass ships off by default: a mark
    // on one side only, against a sprite that is mostly empty, is voted away.
    const image = row([CLEAR, CLEAR, CLEAR, TRIM]);

    const snapped = snapSymmetric(image, [reading(box(0, 0, 4, 1, 1), 1.5)]);

    expect(at(snapped, 3, 0).a).toBe(FULLY_TRANSPARENT);
  });

  it('leaves a pixel whose partner falls outside the box exactly as it arrived', () => {
    // The axis is off centre, so columns 0 and 1 have no counterpart inside the box. Deleting them
    // or inventing a mirror of them would both be the pass changing artwork it has no reading about.
    const image = row([TRIM, TRIM, BODY, BODY, BODY, BODY]);

    const snapped = snapSymmetric(image, [reading(box(0, 0, 6, 1, 6), 3.5)]);

    expect(at(snapped, 0, 0)).toEqual(TRIM);
    expect(at(snapped, 1, 0)).toEqual(TRIM);
  });

  it('settles nothing outside the boxes it was given', () => {
    const image = imageFrom(8, 1, (x) => (x === 6 ? TRIM : BODY));

    const snapped = snapSymmetric(image, [reading(box(0, 0, 4, 1, 4), 1.5)]);

    expect(at(snapped, 6, 0)).toEqual(TRIM);
  });

  it('leaves a reading the floor refused entirely alone', () => {
    const image = row([BODY, BODY, BODY, TRIM]);

    const snapped = snapSymmetric(image, [reading(box(0, 0, 4, 1, 4), 1.5, false)]);

    expect(snapped).toBe(image);
  });

  it('gives back the image it was handed where a qualifying sprite had nothing to settle', () => {
    // A sprite that already mirrors exactly passes any floor, and every pair it holds agrees. The
    // copy this would otherwise return carries no edit, and handing it back would cost `quantiseImage`
    // a second labelling of the whole sheet to arrive at the boxes it already has.
    const image = row([BODY, TRIM, TRIM, BODY]);

    expect(snapSymmetric(image, [reading(box(0, 0, 4, 1, 4), 1.5)])).toBe(image);
  });

  it('gives back the image it was handed where nothing qualified', () => {
    // By reference, which is what lets `quantiseImage` tell that the sheet is unchanged and reuse the
    // segmentation it already took rather than paying for a second one.
    const image = row([BODY, TRIM, TRIM, BODY]);

    expect(snapSymmetric(image, [])).toBe(image);
  });

  it('never writes over the image it was handed', () => {
    const image = row([BODY, BODY, BODY, TRIM]);

    snapSymmetric(image, [reading(box(0, 0, 4, 1, 4), 1.5)]);

    expect(at(image, 3, 0)).toEqual(TRIM);
  });

  it('decides a pair against its own sprite rather than against the sheet around it', () => {
    // Two sprites, and in each the pair settles on whichever member has a neighbour of its own
    // colour *inside that sprite*. The left member of the second sprite has the first sprite's
    // artwork a pixel away and must not be able to draw support from it.
    const image = imageFrom(9, 1, (x) => {
      if (x < 4) return x === 3 ? TRIM : BODY;
      if (x === 4) return CLEAR;
      return x === 5 ? BODY : TRIM;
    });

    const snapped = snapSymmetric(image, [
      reading(box(0, 0, 4, 1, 4), 1.5),
      reading(box(5, 0, 4, 1, 4), 6.5),
    ]);

    expect(at(snapped, 3, 0)).toEqual(BODY);
    expect(at(snapped, 5, 0)).toEqual(TRIM);
  });
});
