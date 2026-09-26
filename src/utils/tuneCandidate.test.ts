import { describe, expect, it } from 'vitest';
import { QUANTISE_DEFAULT_DIALS } from '../constants/quantiseDials.ts';
import { imageFrom } from '../test/images.ts';
import type { QuantiseSettings, Rgba } from '../types/quantiser.ts';
import { quantisePrologue } from './quantisePrologue.ts';
import { readCandidate } from './tuneCandidate.ts';
import { tuneCrop } from './tuneCrop.ts';
import { tunedDialsOf } from './tuneStage.ts';

const GRID = 4;
const CELLS = 24;

/** Five colours, so a budget of five reduces the sheet with no loss at all. */
const COLOURS: readonly [Rgba, ...Rgba[]] = [
  { r: 20, g: 20, b: 30, a: 255 },
  { r: 200, g: 60, b: 50, a: 255 },
  { r: 60, g: 170, b: 80, a: 255 },
  { r: 240, g: 220, b: 120, a: 255 },
  { r: 70, g: 90, b: 210, a: 255 },
];

/**
 * Pixel art drawn exactly at `GRID`, with its lattice starting `phase` pixels in from the corner.
 *
 * A border two cells deep is one flat colour, so the narrow end bands `boundEndCells` folds into
 * their neighbours fold flat into flat: every cell of the mesh is one colour whatever the phase, and
 * a reduction to five colours loses nothing anywhere on the sheet.
 */
function phasedSheet(phase: number): ImageData {
  const size = CELLS * GRID;
  return imageFrom(size, size, (x, y) => {
    const column = Math.floor((x + GRID - phase) / GRID);
    const row = Math.floor((y + GRID - phase) / GRID);
    if (column < 2 || row < 2 || column > CELLS - 2 || row > CELLS - 2) return COLOURS[0];
    return COLOURS[(column * 7 + row * 3 + ((column * row) % 5)) % 5] ?? COLOURS[0];
  });
}

const SETTINGS: QuantiseSettings = {
  ...QUANTISE_DEFAULT_DIALS,
  grid: GRID,
  key: null,
  reduction: { kind: 'MAX_COLORS', maxColors: COLOURS.length },
};

describe('readCandidate', () => {
  it.each([0, 1, 2, 3])('scores an exact sheet reduced with no loss as 1 at a phase of %i', (phase) => {
    // The defect this pins: the result used to be magnified by the grid from the crop's corner,
    // which puts cell `i` at `i × grid` wherever the mesh put it. At a phase of 2 the mesh's first
    // cell is six pixels wide, so everything after it sat two pixels off the art it stood for and
    // this sheet scored 0.19; phases 1 and 3 scored 0.52. Painted over the mesh, each cell covers
    // the pixels it was read from, and a lossless result is a perfect likeness at every phase.
    const reading = readCandidate(
      tunedDialsOf(QUANTISE_DEFAULT_DIALS),
      [tuneCrop(phasedSheet(phase), SETTINGS)],
      SETTINGS,
    );

    expect(reading.colors).toBe(COLOURS.length);
    expect(reading.fidelity).toBeCloseTo(1, 6);
  });

  it('scores the phased sheet on a mesh that does not start on the corner lattice', () => {
    // Without this the test above could pass on a mesh the grid's corner lattice happens to match.
    const prologue = quantisePrologue(phasedSheet(2), SETTINGS);

    expect(prologue.mesh.x.slice(0, 3)).toEqual([0, 6, 10]);
    expect(prologue.mesh.y.slice(0, 3)).toEqual([0, 6, 10]);
  });

  it('counts the colours the crops spend between them, once each', () => {
    // A colour is spent once per sheet. Two crops holding two colours each, none of them shared, cost
    // the sheet four; a mean over the crops called it two, and called two crops holding the same two
    // colours two as well.
    const unreduced = { ...SETTINGS, reduction: null };
    const flat = (first: Rgba, second: Rgba) =>
      tuneCrop(
        imageFrom(CELLS * GRID, CELLS * GRID, (x) => (x < (CELLS * GRID) / 2 ? first : second)),
        unreduced,
      );
    const dials = tunedDialsOf(QUANTISE_DEFAULT_DIALS);
    const [a, b = a, c = a, d = a] = COLOURS;

    expect(readCandidate(dials, [flat(a, b), flat(c, d)], unreduced).colors).toBe(4);
    expect(readCandidate(dials, [flat(a, b), flat(a, b)], unreduced).colors).toBe(2);
  });
});
