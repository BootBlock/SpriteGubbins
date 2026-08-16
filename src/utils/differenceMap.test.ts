import { describe, expect, it } from 'vitest';
import { DIFFERENCE_PRECISION } from '../constants/quantiser.ts';
import type { GridMesh } from '../types/quantiser.ts';
import { imageFrom } from '../test/images.ts';
import { differenceMap } from './differenceMap.ts';
import { createImage, FULLY_OPAQUE, writePixel } from './imageData.ts';
import { srgbToOklab } from './oklab.ts';

const BLACK = { r: 0, g: 0, b: 0, a: 255 };
const WHITE = { r: 255, g: 255, b: 255, a: 255 };
const CLEAR = { r: 0, g: 0, b: 0, a: 0 };

/** The regular lattice of `grid` over an image `side` across, which is what a flat sheet measures. */
function lattice(side: number, grid: number): GridMesh {
  const starts = [];
  for (let at = 0; at < side; at += grid) starts.push(at);
  return { x: starts, y: starts };
}

/** One result pixel of a single colour, for a mesh with one cell. */
function cell(color: { r: number; g: number; b: number; a: number }): ImageData {
  const image = createImage(1, 1);
  writePixel(image.data, 0, color);
  return image;
}

/** A stored cell back in the units the rest of the app states distances in. */
function distanceAt(cells: Uint16Array, at: number): number {
  return (cells[at] ?? 0) / DIFFERENCE_PRECISION;
}

describe('differenceMap', () => {
  it('reports nothing where the pixel is exactly what it replaced', () => {
    const source = imageFrom(4, 4, () => WHITE);
    const result = imageFrom(1, 1, () => WHITE);

    const map = differenceMap(source, result, { x: [0], y: [0] });

    expect([...map.cells]).toEqual([0]);
    expect(map.mean).toBe(0);
    expect(map.peak).toBe(0);
  });

  it('measures the mean over the cell, not the distance between the two averages', () => {
    // Half the cell black and half white, reduced to the grey exactly between them in this space.
    // Comparing the two *averages* would call that a flawless cell — the grey is what the source
    // averages to — when in truth every pixel of it was moved as far as a reduction can move one.
    // The mean of the per-pixel distances says so, and the two answers are as far apart as the
    // measurement allows, which is what makes this test able to fail under the other definition.
    const source = imageFrom(2, 2, (x) => (x === 0 ? BLACK : WHITE));
    const middle = { r: 128, g: 128, b: 128, a: 255 };

    const map = differenceMap(source, cell(middle), { x: [0], y: [0] });

    // Half of white is what the mean of the per-pixel distances comes to, and it is the assertion
    // that carries this test: the source averages to exactly `middle`, so the rejected definition
    // returns zero here and fails loudly. Asserting that zero as well would be asserting arithmetic
    // this file performs rather than anything the implementation does.
    expect(distanceAt(map.cells, 0)).toBeCloseTo(srgbToOklab(255, 255, 255).L / 2, 1);
  });

  it('counts a coverage that changed, on the same scale as a colour that did', () => {
    // A cell the reduction emptied. Nothing about its colour is comparable — a cleared pixel's
    // bytes are whatever was under it — so the distance is the coverage alone, and a pixel that
    // vanished is as far from its source as black is from white.
    const opaque = differenceMap(
      imageFrom(2, 2, () => WHITE),
      cell(CLEAR),
      { x: [0], y: [0] },
    );
    expect(distanceAt(opaque.cells, 0)).toBe(255);

    // And the mirror: a cell the reduction filled where the sheet had nothing, which is the
    // artwork dilating into its own background.
    const empty = differenceMap(
      imageFrom(2, 2, () => CLEAR),
      cell(WHITE),
      { x: [0], y: [0] },
    );
    expect(distanceAt(empty.cells, 0)).toBe(255);
  });

  it('leaves a cell empty on both sides out of the mean, and still reports it as nothing', () => {
    // Three cells across: two clear, one white and reduced to black. Averaged over every cell the
    // sheet would score a third of what it actually lost, and would go on falling as an artist left
    // more margin around their sprites — so the figure would measure the composition rather than
    // the reduction.
    const source = imageFrom(3, 1, (x) => (x === 1 ? WHITE : CLEAR));
    const result = imageFrom(3, 1, (x) => (x === 1 ? BLACK : CLEAR));

    const map = differenceMap(source, result, { x: [0, 1, 2], y: [0] });

    expect(distanceAt(map.cells, 0)).toBe(0);
    expect(map.mean).toBeCloseTo(distanceAt(map.cells, 1), 5);
    expect(map.peak).toBeCloseTo(distanceAt(map.cells, 1), 5);
  });

  it('lands each figure on the cell it belongs to, in the result’s own shape', () => {
    // A four-cell mesh over an eight-pixel sheet, one quadrant of which is lost. The map has to be
    // the result's dimensions and the loss has to sit at the result's own index for it — a heatmap
    // drawn transposed, or off by a row, would point at the wrong artwork.
    const source = imageFrom(8, 8, (x, y) => (x >= 4 && y < 4 ? WHITE : BLACK));
    const result = imageFrom(2, 2, () => BLACK);

    const map = differenceMap(source, result, lattice(8, 4));

    expect(map.width).toBe(2);
    expect(map.height).toBe(2);
    expect(distanceAt(map.cells, 1)).toBeGreaterThan(200);
    expect([0, 2, 3].map((at) => distanceAt(map.cells, at))).toEqual([0, 0, 0]);
  });

  it('measures a partial cell over the pixels it actually covers', () => {
    // A mesh whose last cut leaves a two-pixel column against four-pixel cells elsewhere. The cell
    // has to be averaged over its own two pixels: divided by a full cell's four it would report
    // half the loss, which is how a sheet whose art runs to the edge would read as cleaner there.
    const source = imageFrom(6, 4, () => WHITE);
    const result = imageFrom(2, 1, () => BLACK);

    const map = differenceMap(source, result, { x: [0, 4], y: [0] });

    expect(distanceAt(map.cells, 0)).toBeCloseTo(distanceAt(map.cells, 1), 5);
  });

  it('holds the widest distance there is with room to spare, so no cell can wrap', () => {
    // `Uint16Array` wraps rather than clamping, so a distance past 1023.98 would come back as a
    // *small* number — a dark cell exactly where the sheet was at its worst, which is the one
    // failure a heatmap could not be read through.
    //
    // The bound is derived rather than asserted, and it is an **upper** bound rather than the widest
    // pair anyone can find: OKLab's own bounding box over the sRGB cube, whose diagonal no two
    // colours in that cube can exceed, plus the full span of the coverage axis. Sampling for the
    // widest pair instead would measure something smaller (the cube's corners reach only 361) and
    // would prove nothing about the colours between them.
    const low = [Infinity, Infinity, Infinity];
    const high = [-Infinity, -Infinity, -Infinity];
    // A stride of 5 divides 255 exactly, so every axis reaches both ends of the cube — which is
    // where OKLab's own extremes sit, and therefore what makes the box a box rather than a sample.
    for (let r = 0; r <= 255; r += 5) {
      for (let g = 0; g <= 255; g += 5) {
        for (let b = 0; b <= 255; b += 5) {
          const color = srgbToOklab(r, g, b);
          for (const [axis, value] of [color.L, color.a, color.b].entries()) {
            low[axis] = Math.min(low[axis] ?? Infinity, value);
            high[axis] = Math.max(high[axis] ?? -Infinity, value);
          }
        }
      }
    }
    const span = (axis: number) => (high[axis] ?? 0) - (low[axis] ?? 0);
    const widest = Math.hypot(span(0), span(1), span(2), FULLY_OPAQUE);

    // The box is the one this claim rests on, so a lattice that missed the gamut would be caught
    // here rather than silently shrinking the bound it is meant to establish.
    expect(span(0)).toBeCloseTo(255, 0);
    expect(widest).toBeGreaterThan(400);
    expect(widest).toBeLessThan(65535 / DIFFERENCE_PRECISION);
    // And with enough headroom that the bound is not the thing being tuned: three fifths of the
    // range is unused, so a future axis or a wider gamut has somewhere to go before this has to
    // move. Stated as the *floor* on that headroom rather than as the figure itself, which would
    // fail on a rounding change without anything being wrong.
    expect(widest).toBeLessThan(0.5 * (65535 / DIFFERENCE_PRECISION));
  });
});
