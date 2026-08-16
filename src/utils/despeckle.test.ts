import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { despeckle } from './despeckle.ts';
import { pixelOffset } from './imageData.ts';

const GREEN: Rgba = { r: 40, g: 140, b: 60, a: 255 };
/** A stray fill tone eighteen RGB steps from the green — speckle, not detail. */
const STRAY: Rgba = { r: 50, g: 150, b: 70, a: 255 };
const INK: Rgba = { r: 16, g: 14, b: 18, a: 255 };

describe('despeckle', () => {
  it('snaps a lone near-miss pixel to its settled neighbourhood', () => {
    const sheet = imageFrom(5, 5, (x, y) => (x === 2 && y === 2 ? STRAY : GREEN));
    const cleaned = despeckle(sheet, 32);
    expect(channels(cleaned)).toEqual(channels(imageFrom(5, 5, () => GREEN)));
  });

  it('never merges a line pixel, however settled the neighbours', () => {
    // Ink against the green sits hundreds of steps away — past every tolerance offered.
    const sheet = imageFrom(5, 5, (x, y) => (x === 2 && y === 2 ? INK : GREEN));
    expect(channels(despeckle(sheet, 64))).toEqual(channels(sheet));
  });

  it('leaves a two-region boundary alone — no strict majority ever forms across it', () => {
    const other: Rgba = { r: 55, g: 155, b: 75, a: 255 };
    const sheet = imageFrom(6, 6, (x) => (x < 3 ? GREEN : other));
    expect(channels(despeckle(sheet, 64))).toEqual(channels(sheet));
  });

  it('merges at the border too, by a majority of the neighbours a pixel actually has', () => {
    // A corner has three neighbours, so two agreeing are its majority — a fixed five-of-eight
    // would have made every border pixel unmergeable, and on a small sprite the border is a large
    // share of the pixels.
    const sheet = imageFrom(5, 5, (x, y) => (x === 0 && y === 0 ? STRAY : GREEN));
    expect(channels(despeckle(sheet, 32))).toEqual(channels(imageFrom(5, 5, () => GREEN)));
  });

  it('judges once from the input, not cascading left to right', () => {
    // The corner stray's three neighbours split three ways in the input — a stray, an ink pixel
    // and one green — so no majority forms and it stays. Its stray neighbour merges. A cascading
    // pass would count that freshly merged green as the corner's second green vote and take the
    // corner too.
    const sheet = imageFrom(5, 5, (x, y) => {
      if ((x === 0 || x === 1) && y === 0) return STRAY;
      if (x === 0 && y === 1) return INK;
      return GREEN;
    });
    const cleaned = despeckle(sheet, 32);
    const expected = imageFrom(5, 5, (x, y) => {
      if (x === 0 && y === 0) return STRAY;
      if (x === 0 && y === 1) return INK;
      return GREEN;
    });
    expect(channels(cleaned)).toEqual(channels(expected));
  });

  it('reads colour as RGB alone, and never touches a pixel’s alpha', () => {
    // A matte-exported sheet mixes alpha 254 with 255 over one RGB: those neighbours are one
    // colour, not two, so a genuine stray among them still merges — and the merged pixel keeps
    // its own alpha, because the pass corrects colour, not coverage.
    const matte: Rgba = { ...GREEN, a: 254 };
    const sheet = imageFrom(5, 5, (x, y) => {
      if (x === 2 && y === 2) return { ...STRAY, a: 254 };
      return (x + y) % 2 === 0 ? GREEN : matte;
    });
    const cleaned = despeckle(sheet, 32);
    const centre = pixelOffset(5, 2, 2);
    expect(cleaned.data[centre]).toBe(GREEN.r);
    expect(cleaned.data[centre + 1]).toBe(GREEN.g);
    expect(cleaned.data[centre + 2]).toBe(GREEN.b);
    expect(cleaned.data[centre + 3]).toBe(254);

    // A translucent pixel already matching the field's RGB is genuine soft detail at distance
    // zero, and must be left exactly as it is — flattening it to opaque undoes a soft edge.
    const soft = imageFrom(5, 5, (x, y) => (x === 2 && y === 2 ? { ...GREEN, a: 128 } : GREEN));
    expect(channels(despeckle(soft, 64))).toEqual(channels(soft));
  });

  it('settles a two-deep patch across passes, one layer per pass', () => {
    // A three-by-three stray patch mid-field settles like an onion: the corners have their green
    // majority at once, the edge-centres only after the corners settle, and the centre last of
    // all. One pass cannot clear it; three can — the dial the single fixed pass could not offer.
    const sheet = imageFrom(9, 9, (x, y) => (x >= 3 && x <= 5 && y >= 3 && y <= 5 ? STRAY : GREEN));
    const flat = imageFrom(9, 9, () => GREEN);
    expect(channels(despeckle(sheet, 32, 1))).not.toEqual(channels(flat));
    expect(channels(despeckle(sheet, 32, 3))).toEqual(channels(flat));
    // Extra passes past settling change nothing: the early stop makes four the price of three.
    expect(channels(despeckle(sheet, 32, 4))).toEqual(channels(flat));
  });
  it('leaves transparency alone in both directions', () => {
    const clear: Rgba = { r: 0, g: 0, b: 0, a: 0 };
    const sheet = imageFrom(5, 5, (x, y) => (x === 2 && y === 2 ? clear : GREEN));
    // The keyed pixel is never painted over, and it never votes as a neighbour.
    expect(channels(despeckle(sheet, 64))).toEqual(channels(sheet));
  });

  it('returns the input bytes unchanged at a tolerance of zero', () => {
    const sheet = imageFrom(5, 5, (x, y) => (x === 2 && y === 2 ? STRAY : GREEN));
    expect(channels(despeckle(sheet, 0))).toEqual(channels(sheet));
  });
});
