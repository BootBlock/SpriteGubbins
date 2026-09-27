import { describe, expect, it } from 'vitest';
import type { Rgba } from '../types/quantiser.ts';
import { blendSnap } from './blendSnap.ts';
import { channelLevels } from './channelLevels.ts';
import { CHANNELS_PER_PIXEL, FULLY_OPAQUE, FULLY_TRANSPARENT, createImage, writePixel } from './imageData.ts';

const INK: Rgba = { r: 20, g: 20, b: 20, a: FULLY_OPAQUE };
const PAPER: Rgba = { r: 235, g: 235, b: 235, a: FULLY_OPAQUE };
const MID: Rgba = { r: 128, g: 128, b: 128, a: FULLY_OPAQUE };
const RED: Rgba = { r: 200, g: 30, b: 30, a: FULLY_OPAQUE };

/** A one-row sheet holding exactly these colours. */
function sheetOf(...colors: readonly Rgba[]): ImageData {
  const image = createImage(colors.length, 1);
  colors.forEach((color, index) => {
    writePixel(image.data, index * CHANNELS_PER_PIXEL, color);
  });
  return image;
}

describe('blendSnap', () => {
  it('moves each channel to its nearest rung under a channel depth', () => {
    const snap = blendSnap({ kind: 'CHANNEL_DEPTH', bitsPerChannel: 3 }, [sheetOf(INK)]);
    const rungs = channelLevels(3);
    const kept = snap({ r: 40, g: 100, b: 250, a: 180 });
    // 40 is nearest 36, 100 nearest 109 and 250 nearest 255; the coverage is the blend's own.
    expect(kept).toEqual({ r: 36, g: 109, b: 255, a: 180 });
    expect([kept.r, kept.g, kept.b].every((value) => rungs.includes(value))).toBe(true);
  });

  it('takes a blend to the nearest pinned entry, whether or not the sheet holds it', () => {
    const snap = blendSnap({ kind: 'PALETTE', entries: [PAPER, MID, INK] }, [sheetOf(PAPER, INK)]);
    expect(snap({ r: 120, g: 125, b: 130, a: FULLY_OPAQUE })).toEqual(MID);
  });

  it('takes a blend to the nearest locked entry, and never to a colour only the sheet holds', () => {
    // The lock is the series' palette. A colour beyond its reach survives on the sheet, but it is not
    // a colour the series is drawn in, so no blend is taken to it.
    const snap = blendSnap({ kind: 'LOCKED', entries: [PAPER, INK], snap: 8 }, [sheetOf(PAPER, INK, MID)]);
    expect(snap({ r: 128, g: 128, b: 128, a: FULLY_OPAQUE })).not.toEqual(MID);
    expect([PAPER, INK]).toContainEqual(snap({ r: 128, g: 128, b: 128, a: FULLY_OPAQUE }));
  });

  it('takes a blend to the nearest colour any held image holds under a budget', () => {
    const snap = blendSnap({ kind: 'MAX_COLORS', maxColors: 16 }, [sheetOf(PAPER, INK), sheetOf(RED)]);
    expect(snap({ r: 190, g: 40, b: 35, a: 90 })).toEqual({ ...RED, a: 90 });
  });

  it('leaves a fully transparent blend as it is under every reduction', () => {
    // A cleared pixel carries no colour, and every pass clears one as zero throughout.
    const clear: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };
    const held = [sheetOf(PAPER, INK)];
    for (const snap of [
      blendSnap({ kind: 'CHANNEL_DEPTH', bitsPerChannel: 1 }, held),
      blendSnap({ kind: 'PALETTE', entries: [PAPER] }, held),
      blendSnap({ kind: 'LOCKED', entries: [PAPER], snap: 8 }, held),
      blendSnap({ kind: 'MAX_COLORS', maxColors: 16 }, held),
    ]) {
      expect(snap(clear)).toEqual(clear);
    }
  });
});
