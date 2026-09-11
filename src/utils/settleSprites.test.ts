import { describe, expect, it } from 'vitest';
import { DEFAULT_SPRITE_GAP, SPRITE_GAP_RANGE } from '../constants/quantiser.ts';
import { channels, imageFrom } from '../test/images.ts';
import type { QuantiseSettings, Rgba } from '../types/quantiser.ts';
import { pixelOffset, readPixel } from './imageData.ts';
import { settleSprites } from './settleSprites.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const FILL: Rgba = { r: 90, g: 110, b: 140, a: 255 };
const EDGE: Rgba = { r: 210, g: 180, b: 60, a: 255 };
const SPOT: Rgba = { r: 96, g: 116, b: 146, a: 255 };

/** The gap the tab opens at, and the widest it offers — the two positions every case compares. */
const NARROW = DEFAULT_SPRITE_GAP;
const WIDE = SPRITE_GAP_RANGE.max;

/*
 * The fixtures are built afresh for every call rather than shared, and that is what lets "changes no
 * pixel" be asserted at all. Every pass here hands back its argument by reference wherever it moved
 * nothing, so a result compared with the very image it was given is one buffer compared with itself —
 * and a pass that wrote into its input instead of a copy would pass that comparison and leak its edit
 * into the next case. A second build of the same sheet is the sheet as it arrived.
 */

/**
 * One subject cut down its seam by two clear columns, with one pixel knocked out of its right edge.
 *
 * Read as one sprite it mirrors about the seam in all but that pixel, so a snap admits it and closes
 * the break from the intact side. Read as two, each half is an edge on one side and fill on the other,
 * which mirrors about nothing — so the snap has no sprite to settle.
 */
function splitSubject(): ImageData {
  return imageFrom(12, 8, (x, y) => {
    if (y < 2 || y >= 6) return CLEAR;
    if (x === 2) return EDGE;
    if (x === 3 || x === 4 || x === 7 || x === 8) return FILL;
    if (x === 9) return y === 3 ? FILL : EDGE;
    return CLEAR;
  });
}

/**
 * Two 4 × 4 blocks six clear columns apart, the second carrying one cell a shade off the first.
 *
 * Read as two sprites they are one drawing at any tolerance past that shade, so the fold overwrites
 * the spot. Read as one, there is no second sprite to compare it with.
 */
function nearRepeats(): ImageData {
  return imageFrom(20, 8, (x, y) => {
    if (y < 2 || y >= 6) return CLEAR;
    if (x >= 2 && x < 6) return FILL;
    if (x >= 12 && x < 16) return x === 12 && y === 2 ? SPOT : FILL;
    return CLEAR;
  });
}

/**
 * A row of three 4 × 4 blocks whose middle one sits two pixels right of the pitch the outer two keep.
 *
 * Read as three sprites the middle frame is off its slot, so the alignment carries it back. The last
 * two blocks are six clear columns apart and the first two ten, so the widest gap folds only the last
 * pair — which leaves a row of two, and two frames fit any spacing exactly.
 */
function driftedRow(): ImageData {
  return imageFrom(40, 10, (x, y) => {
    if (y < 3 || y >= 7) return CLEAR;
    return [2, 16, 26].some((left) => x >= left && x < left + 4) ? FILL : CLEAR;
  });
}

/**
 * Every one of the three passes switched on and none of them acting: the two modes at `CHECK`, the
 * fold off, and everything outside the tail of the pipeline where it cannot move a pixel.
 */
const READING_ONLY: QuantiseSettings = {
  grid: 1,
  key: null,
  silhouetteThreshold: 0,
  vote: 'DOMINANT',
  outlineExpansion: 0,
  lineStrength: 1.5,
  trimStrength: 0,
  inkThreshold: 64,
  fillCleanup: 0,
  colorMerge: 0,
  cleanupPasses: 1,
  dither: 'NONE',
  spriteGap: NARROW,
  symmetry: 'CHECK',
  symmetryTolerance: 0,
  symmetryConfidence: 90,
  duplicateTolerance: 24,
  duplicateSnap: false,
  frameAlignment: 'CHECK',
  frameDriftTolerance: 0,
  antiAlias: 'OFF',
  antiAliasThreshold: 24,
  antiAliasStrength: 100,
  antiAliasRun: 2,
  antiAliasPalette: 'SNAP',
  reduction: null,
};

/**
 * The sprite gap, from the side of the passes that act on what it finds.
 *
 * The gap draws the boxes, and three passes are taken over them: the symmetry settle scores an axis
 * inside each, the duplicate fold compares one with another, and the frame alignment fits a row of
 * them to a spacing. So the gap is a reading while all three only read, and upstream of the artwork
 * the moment any of them acts — which is what `QUANTISE_TOOLTIPS.spriteGap` tells the reader, and
 * what these cases hold that guidance to. Each route is shown twice: changing the downloaded sheet
 * under its own snap, and changing no pixel at any position of the gap while it only reads.
 */
describe('settleSprites — the sprite gap', () => {
  it.each([
    ['the symmetry settle', splitSubject],
    ['the duplicate fold', nearRepeats],
    ['the frame alignment', driftedRow],
  ])('changes no pixel at any gap while %s only reads', (_route, sheet) => {
    for (let gap = SPRITE_GAP_RANGE.min; gap <= SPRITE_GAP_RANGE.max; gap += SPRITE_GAP_RANGE.step) {
      expect(channels(settleSprites(sheet(), { ...READING_ONLY, spriteGap: gap }).image)).toEqual(
        channels(sheet()),
      );
    }
    // The boxes move all the same, and they are what the Aseprite document, the sprite pack and the
    // manifest are cut along — so the half of the guidance that says the PNG stays put is not a
    // promise about those three.
    expect(settleSprites(sheet(), { ...READING_ONLY, spriteGap: WIDE }).sprites).not.toEqual(
      settleSprites(sheet(), { ...READING_ONLY, spriteGap: NARROW }).sprites,
    );
  });

  it('decides whether the symmetry settle has a sprite to settle', () => {
    const settings = { ...READING_ONLY, symmetry: 'SNAP' as const };
    const halves = settleSprites(splitSubject(), { ...settings, spriteGap: NARROW });
    const whole = settleSprites(splitSubject(), { ...settings, spriteGap: WIDE });

    expect(halves.symmetry?.map((reading) => reading.snapped)).toEqual([false, false]);
    expect(channels(halves.image)).toEqual(channels(splitSubject()));

    expect(whole.symmetry?.map((reading) => reading.snapped)).toEqual([true]);
    expect(readPixel(whole.image.data, pixelOffset(12, 9, 3))).toEqual(EDGE);
  });

  it('decides whether the duplicate fold has a pair to fold', () => {
    const settings = { ...READING_ONLY, duplicateSnap: true };
    const apart = settleSprites(nearRepeats(), { ...settings, spriteGap: NARROW });
    const joined = settleSprites(nearRepeats(), { ...settings, spriteGap: WIDE });

    expect(apart.snapped).toBe(true);
    expect(readPixel(apart.image.data, pixelOffset(20, 12, 2))).toEqual(FILL);

    expect(joined.duplicates).toEqual([]);
    expect(joined.snapped).toBe(false);
    expect(channels(joined.image)).toEqual(channels(nearRepeats()));
  });

  it('decides whether the frame alignment has a row to align', () => {
    const settings = { ...READING_ONLY, frameAlignment: 'SNAP' as const };
    const three = settleSprites(driftedRow(), { ...settings, spriteGap: NARROW });
    const two = settleSprites(driftedRow(), { ...settings, spriteGap: WIDE });

    expect(three.strips?.[0]?.frames.map((frame) => frame.snapped)).toEqual([false, true, false]);
    expect(channels(three.image)).not.toEqual(channels(driftedRow()));

    expect(two.strips).toEqual([]);
    expect(channels(two.image)).toEqual(channels(driftedRow()));
  });
});
