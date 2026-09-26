import { describe, expect, it } from 'vitest';
import { bruteForceNearest } from '../test/bruteForceNearest.ts';
import type { Rgba } from '../types/quantiser.ts';
import { nearestColorSearch } from './nearestColorSearch.ts';

/** A fixed-seed generator, so a failure names the same colours every run. */
function channelStream(seed: number): () => number {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state >>> 24;
  };
}

/** Channels drawn from a few values only, so exact ties between entries are common rather than rare. */
function coarseColor(next: () => number): Rgba {
  const level = (): number => (next() % 5) * 60;
  return { r: level(), g: level(), b: level(), a: next() % 3 === 0 ? level() : 255 };
}

describe('nearestColorSearch', () => {
  it('answers null for an empty palette', () => {
    expect(nearestColorSearch([])({ r: 1, g: 2, b: 3, a: 255 })).toBeNull();
  });

  it('returns the palette’s own entry, so a caller can key on it', () => {
    const palette = [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 250, g: 250, b: 250, a: 255 },
    ];
    expect(nearestColorSearch(palette)({ r: 240, g: 240, b: 240, a: 255 })).toBe(palette[1]);
  });

  it('gives a tie to the earliest entry, wherever the sort put it', () => {
    // Both entries sit 10 from the colour on green, the channel they spread across, and the later
    // one sorts first — so a search that stopped at an equal gap would answer with it.
    const palette = [
      { r: 0, g: 110, b: 0, a: 255 },
      { r: 0, g: 90, b: 0, a: 255 },
    ];
    const nearest = nearestColorSearch(palette);
    expect(nearest({ r: 0, g: 100, b: 0, a: 255 })).toBe(palette[0]);
    expect(nearestColorSearch([...palette].reverse())({ r: 0, g: 100, b: 0, a: 255 })).toBe(palette[1]);
  });

  it('gives a tie between identical entries to the earlier one', () => {
    const palette = [
      { r: 9, g: 9, b: 9, a: 255 },
      { r: 9, g: 9, b: 9, a: 255 },
    ];
    expect(nearestColorSearch(palette)({ r: 10, g: 10, b: 10, a: 255 })).toBe(palette[0]);
  });

  it('measures alpha as a fourth channel', () => {
    const palette = [
      { r: 100, g: 0, b: 0, a: 255 },
      { r: 110, g: 0, b: 0, a: 40 },
    ];
    expect(nearestColorSearch(palette)({ r: 110, g: 0, b: 0, a: 50 })).toBe(palette[1]);
  });

  it('holds an opaque colour to the opaque entries, however near a translucent one sits', () => {
    const palette = [
      { r: 200, g: 0, b: 0, a: 255 },
      { r: 0, g: 0, b: 200, a: 255 },
      { r: 140, g: 0, b: 0, a: 230 },
    ];
    expect(nearestColorSearch(palette)({ r: 140, g: 0, b: 0, a: 255 })).toBe(palette[0]);
  });

  it('gives an opaque colour the nearest entry of any coverage when no entry is opaque', () => {
    const palette = [
      { r: 0, g: 0, b: 200, a: 200 },
      { r: 140, g: 0, b: 0, a: 230 },
    ];
    expect(nearestColorSearch(palette)({ r: 140, g: 0, b: 0, a: 255 })).toBe(palette[1]);
  });

  it('agrees with every entry scored, on palettes crowded with ties', () => {
    const next = channelStream(473);
    for (const size of [1, 2, 3, 8, 17, 64, 256]) {
      const palette = Array.from({ length: size }, () => coarseColor(next));
      const nearest = nearestColorSearch(palette);
      for (let sample = 0; sample < 400; sample += 1) {
        const color = sample % 2 === 0 ? coarseColor(next) : { r: next(), g: next(), b: next(), a: next() };
        expect(nearest(color), JSON.stringify({ size, color })).toBe(bruteForceNearest(color, palette));
      }
    }
  });
});
