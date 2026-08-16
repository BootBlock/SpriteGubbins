import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { despeckle } from './despeckle.ts';

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

  it('judges once from the input, not cascading left to right', () => {
    // Two strays against the left edge. The inner one has seven settled neighbours and merges;
    // the edge one has only four settled of its five, short of the majority — and it must *stay*
    // short, because a cascading pass would count the freshly merged inner pixel as its fifth.
    const sheet = imageFrom(5, 5, (x, y) => (y === 2 && (x === 0 || x === 1) ? STRAY : GREEN));
    const cleaned = despeckle(sheet, 32);
    const expected = imageFrom(5, 5, (x, y) => (y === 2 && x === 0 ? STRAY : GREEN));
    expect(channels(cleaned)).toEqual(channels(expected));
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
