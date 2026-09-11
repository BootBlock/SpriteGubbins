import { describe, expect, it } from 'vitest';

import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { framedSheet, imageFrom } from '../src/test/images.ts';
import type { QuantiseSettings, Rgba } from '../src/types/quantiser.ts';
import { gridInForce } from '../src/utils/gridInForce.ts';
import { countColors } from '../src/utils/imageData.ts';
import { measureSheetScale } from '../src/utils/pixelGrid.ts';
import { quantiseImage } from '../src/utils/quantiseImage.ts';

/**
 * An exact scale reading is adopted without asking, so it may not rest on change the reduction folds.
 *
 * The chain this follows is the one the Quantise tab runs on a sheet nobody has typed a grid for:
 * `measureSheetScale` reads it, `gridInForce` adopts the reading because it is `EXACT` — an estimate
 * would only be offered — and `quantiseImage` reduces the sheet at that grid. For a while that chain
 * could delete the whole of a sheet's artwork. A frame one or two pixels wide round a flat sheet
 * changes on two lines that one phase class of nearly half the sheet holds, so detection answered that
 * coarse scale; the mesh then merged both end bands into the cells beside them, because an end band
 * under three source pixels is not a cell, and the result held one colour where the sheet held two.
 *
 * **The second group is the same harm by the other route.** A line inside a folded band must count
 * *against* a scale as well as never counting for it: leave it out of the reading altogether and a
 * one-pixel line two columns in — whose other edge is outside the band — becomes a perfect share at a
 * coarse scale, and a frame round interior art stops outvoting the few lines a coarse lattice holds.
 * Those sheets are here with whether they may be read exactly at all, so a change that stops adopting
 * a sheet cannot pass the colour count by adopting nothing.
 *
 * **What is asserted is the colour count through the real pipeline**, rather than the answer
 * `detectPixelGrid` gives, because the colour count is the harm and the answer is only one way of
 * avoiding it. The key and the palette step are both off, so every colour the result holds is one the
 * reduction kept.
 */

const FRAME: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const INTERIOR: Rgba = { r: 10, g: 160, b: 170, a: 255 };
const SQUARE: Rgba = { r: 200, g: 40, b: 40, a: 255 };

/** The sheet the chain is run on, what it is called in a failure, and whether it may be read exactly. */
interface EdgeSheet {
  readonly name: string;
  readonly image: ImageData;
  readonly exact: boolean;
}

function framed(size: number, border: number): EdgeSheet {
  return {
    name: `${String(size)}² with a ${String(border)}-pixel frame`,
    image: framedSheet(size, border, FRAME, INTERIOR),
    exact: true,
  };
}

/** A 256² frame of `border` pixels with something drawn inside it, which `inside` paints or declines. */
function framedWith(border: number, inside: (x: number, y: number) => Rgba | null): ImageData {
  const frame = framedSheet(256, border, FRAME, INTERIOR);
  return imageFrom(256, 256, (x, y) => {
    const painted = inside(x, y);
    if (painted !== null) return painted;
    const offset = (y * 256 + x) * 4;
    return {
      r: frame.data[offset] ?? 0,
      g: frame.data[offset + 1] ?? 0,
      b: frame.data[offset + 2] ?? 0,
      a: 255,
    };
  });
}

/** A 64 × 64 square with its corner at (100, 100). */
const square = (x: number, y: number): Rgba | null =>
  x >= 100 && x < 164 && y >= 100 && y < 164 ? SQUARE : null;

/** A 32 × 32 sprite of distinct cells drawn at a grid of 4, centred on the sheet. */
const sprite = (x: number, y: number): Rgba | null => {
  if (x < 112 || x >= 144 || y < 112 || y >= 144) return null;
  const cell = Math.floor((y - 112) / 4) * 8 + Math.floor((x - 112) / 4);
  return { r: (cell * 37 + 20) % 256, g: (cell * 11 + 60) % 256, b: 30, a: 255 };
};

const SHEETS: readonly EdgeSheet[] = [
  ...[256, 300].flatMap((size) => [1, 2, 3, 4, 6].map((border) => framed(size, border))),
  {
    name: '256² with a line down the last column',
    image: imageFrom(256, 256, (x) => (x === 255 ? FRAME : INTERIOR)),
    exact: true,
  },
  {
    name: '200 × 120 with a line along the last row',
    image: imageFrom(200, 120, (_x, y) => (y === 119 ? FRAME : INTERIOR)),
    exact: true,
  },
  {
    name: '256² with a one-pixel line two columns in',
    image: imageFrom(256, 256, (x) => (x === 2 ? FRAME : INTERIOR)),
    exact: false,
  },
  {
    name: '256² with a two-pixel line one column in',
    image: imageFrom(256, 256, (x) => (x === 1 || x === 2 ? FRAME : INTERIOR)),
    exact: true,
  },
  { name: '256² with a 2-pixel frame round a square', image: framedWith(2, square), exact: true },
  { name: '256² with a 1-pixel frame round a square', image: framedWith(1, square), exact: false },
  { name: '256² with a 1-pixel frame round a sprite drawn at 4', image: framedWith(1, sprite), exact: false },
];

const {
  keyingEnabled: _keyingEnabled,
  keyTolerance: _keyTolerance,
  paletteSnap: _paletteSnap,
  ...TUNING
} = QUANTISE_DEFAULT_DIALS;

describe('an adopted exact scale', () => {
  it.each(SHEETS)('keeps every colour of $name', ({ name, image, exact }) => {
    const scale = measureSheetScale(image);
    const grid = gridInForce(null, { scale, colors: countColors(image) });

    expect(scale?.measurement === 'EXACT', `${name}: read exactly`).toBe(exact);
    // Only an exact reading is adopted, so a sheet read any other way has nothing reduced unasked.
    if (grid === null) return;

    const settings: QuantiseSettings = { ...TUNING, grid, key: null, reduction: null };
    expect(countColors(quantiseImage(image, settings).image), `${name} at a grid of ${String(grid)}`).toBe(
      countColors(image),
    );
  });
});
