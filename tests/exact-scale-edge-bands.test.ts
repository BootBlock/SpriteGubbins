import { describe, expect, it } from 'vitest';

import { QUANTISE_DEFAULT_DIALS } from '../src/constants/quantiseDials.ts';
import { imageFrom } from '../src/test/images.ts';
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
 * **What is asserted is the colour count through the real pipeline**, rather than the answer
 * `detectPixelGrid` gives, because the colour count is the harm and the answer is only one way of
 * avoiding it. The key and the palette step are both off, so every colour the result holds is one the
 * reduction kept. The frames run from one pixel, the width that was deleted, past three, the width
 * `SHORTEST_END_BAND` names and the first that survived, on the two canvas sizes the defect was
 * measured on; the two lines against a single edge are the same fold with one band rather than two.
 */

const FRAME: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const INTERIOR: Rgba = { r: 10, g: 160, b: 170, a: 255 };

/** The sheet the chain is run on, and what it is called in a failure. */
interface EdgeSheet {
  readonly name: string;
  readonly image: ImageData;
}

function framed(size: number, border: number): EdgeSheet {
  return {
    name: `${String(size)}² with a ${String(border)}-pixel frame`,
    image: imageFrom(size, size, (x, y) =>
      x < border || y < border || x >= size - border || y >= size - border ? FRAME : INTERIOR,
    ),
  };
}

const SHEETS: readonly EdgeSheet[] = [
  ...[256, 300].flatMap((size) => [1, 2, 3, 4, 6].map((border) => framed(size, border))),
  {
    name: '256² with a line down the last column',
    image: imageFrom(256, 256, (x) => (x === 255 ? FRAME : INTERIOR)),
  },
  {
    name: '200 × 120 with a line along the last row',
    image: imageFrom(200, 120, (_x, y) => (y === 119 ? FRAME : INTERIOR)),
  },
];

const {
  keyingEnabled: _keyingEnabled,
  keyTolerance: _keyTolerance,
  paletteSnap: _paletteSnap,
  ...TUNING
} = QUANTISE_DEFAULT_DIALS;

describe('an adopted exact scale', () => {
  it.each(SHEETS)('keeps every colour of $name', ({ name, image }) => {
    const scale = measureSheetScale(image);
    const grid = gridInForce(null, { scale, colors: countColors(image) });

    // The case this is about is the adopted one, so a sheet that stopped being read exactly would pass
    // the colour count below for the wrong reason.
    expect(scale?.measurement, `${name} is no longer read exactly`).toBe('EXACT');
    expect(grid, `${name} was not adopted`).not.toBeNull();
    if (grid === null) return;

    const settings: QuantiseSettings = { ...TUNING, grid, key: null, reduction: null };
    expect(countColors(quantiseImage(image, settings).image), `${name} at a grid of ${String(grid)}`).toBe(
      countColors(image),
    );
  });
});
