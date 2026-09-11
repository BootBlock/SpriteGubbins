import { describe, expect, it } from 'vitest';
import { framedSheet, imageFrom } from '../test/images.ts';
import { leadingCells, spottedGrid } from '../test/spottedGrid.ts';
import { edgeLattice, exactGridOffset } from './edgeLattice.ts';

/** Sixteen cells a side drawn at 8, three pixels in from the left and right and five from the top and bottom. */
const INSET_ART = imageFrom(134, 138, (x, y) => {
  const artX = x - 3;
  const artY = y - 5;
  if (artX < 0 || artY < 0 || artX >= 128 || artY >= 128) return { r: 250, g: 250, b: 250, a: 255 };
  return { r: Math.floor(artX / 8) * 16 + 1, g: Math.floor(artY / 8) * 16 + 1, b: 64, a: 255 };
});

describe('exactGridOffset', () => {
  it('answers where the lattice sits on each axis, not only that the sheet is drawn on one', () => {
    // The phases are the answer because the mesh cuts on them: a yes alone would leave the mesh to
    // find the placement again, which is the second opinion that disagreed with the first in #276.
    // The two axes are inset by different amounts so an answer with them swapped cannot pass.
    const lattice = edgeLattice(INSET_ART);
    expect(exactGridOffset(lattice, 8)).toEqual({ x: 3, y: 5 });
    expect(exactGridOffset(lattice, 4)).toEqual({ x: 3, y: 1 });
    expect(exactGridOffset(lattice, 3)).toBeNull();
  });

  it('believes a lattice holding exactly the threshold, and nothing short of it', () => {
    // 720 of 800 transitions is nine tenths exactly; one more stray is four more that miss.
    expect(exactGridOffset(edgeLattice(spottedGrid({ spoils: leadingCells(20) })), 4)).toEqual({
      x: 0,
      y: 0,
    });
    expect(exactGridOffset(edgeLattice(spottedGrid({ spoils: leadingCells(21) })), 4)).toBeNull();
  });

  it('never places a lattice on a line the mesh would fold', () => {
    // A one-pixel frame changes on lines 1 and 255. At 127 both sit in bands every mesh of 127 folds,
    // so they count for nothing; at 2 the bound admits them, and they sit on phase 1.
    const lattice = edgeLattice(
      framedSheet(256, 1, { r: 255, g: 255, b: 255, a: 255 }, { r: 10, g: 160, b: 170, a: 255 }),
    );
    expect(exactGridOffset(lattice, 127)).toBeNull();
    expect(exactGridOffset(lattice, 2)).toEqual({ x: 1, y: 1 });
  });

  it('answers null for an image with no transitions, which every lattice fits equally', () => {
    expect(
      exactGridOffset(edgeLattice(imageFrom(32, 32, () => ({ r: 10, g: 20, b: 30, a: 255 }))), 8),
    ).toBeNull();
  });
});
