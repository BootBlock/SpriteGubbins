import { describe, expect, it } from 'vitest';
import { imageFrom, soften, upscale } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { pixelOffset, readPixel } from './imageData.ts';
import { estimatePixelGrid } from './pixelPeriod.ts';

/**
 * A source whose cells carry **many different** colours, so the boundaries in the image differ in
 * contrast from one another rather than all being the same step.
 *
 * The fixture that matters, and the one whose absence hid the previous attempt's failure. A
 * two-colour checkerboard gives every boundary identical contrast, so anything that picks peaks
 * lands on the same offset everywhere and one scoring bin collects all of it; varied colours put the
 * peaks of a softened sheet across three adjacent offsets, and a scorer that counts one peak per
 * boundary finds its best bin holding two fifths of the mass. Both fixtures are tested below,
 * because passing on the checkerboard alone is exactly what "it works" looked like last time.
 *
 * Not *all distinct*, and the difference is worth stating rather than glossing: each channel is a
 * multiple of the cell index modulo 256, so the palette repeats every 256 cells. At 8 and 16 cells a
 * side every colour is its own; at 32 the 1,024 cells draw on 256 colours, four times each. The
 * repeats are 256 cells — eight rows — apart, so no *boundary* ever falls between two equal
 * neighbours, which is the only property the measurement depends on.
 */
function variedCells(cells: number): ImageData {
  return imageFrom(cells, cells, (x, y) => {
    const index = y * cells + x;
    return { r: (index * 71 + 13) % 256, g: (index * 149 + 41) % 256, b: (index * 37 + 97) % 256, a: 255 };
  });
}

/** The same art placed `inset` pixels in from the top-left corner, on a flat margin. */
function shifted(image: ImageData, inset: number): ImageData {
  return imageFrom(image.width, image.height, (x, y) =>
    x < inset || y < inset ? { r: 12, g: 12, b: 12, a: 255 } : pixelAt(image, x - inset, y - inset),
  );
}

function pixelAt(image: ImageData, x: number, y: number): Rgba {
  return readPixel(image.data, pixelOffset(image.width, x, y));
}

/** Smooth artwork with no scale in it at all — a model returning a painted image. */
const GRADIENT = imageFrom(128, 128, (x, y) => ({
  r: Math.round((x / 127) * 255),
  g: Math.round((y / 127) * 255),
  b: Math.round(((x + y) / 254) * 255),
  a: 255,
}));

describe('estimatePixelGrid', () => {
  it('measures the scale of softened art whose cells are all different colours', () => {
    // The whole point of the issue this answers: `detectPixelGrid` returns `null` for every one of
    // these, because a three-tap softening puts a transition on every column. The scale is still in
    // the image — it is the spacing the softening repeats at — and these are the sizes a sheet
    // actually comes back at.
    expect(estimatePixelGrid(soften(upscale(variedCells(32), 4)))).toBe(4);
    expect(estimatePixelGrid(soften(upscale(variedCells(16), 8)))).toBe(8);
    expect(estimatePixelGrid(soften(upscale(variedCells(8), 16)))).toBe(16);
  });

  it('answers the scale the art was drawn at, not a multiple of it', () => {
    // The failure mode that matters most, in the direction candidates are actually tried: this
    // counts *down* from the largest, so an image drawn at 8 passes 32, 24 and 16 before it reaches
    // its own answer, and each of those is a scale that would halve or quarter the art on its way
    // out. Half the boundaries of a grid-8 sheet fall between a grid-16 lattice's lines, so no
    // doubled scale scores more than about a half against a threshold of nine tenths.
    //
    // Asserted by construction rather than by a second `not.toBe` on the same call, which could not
    // fail: the sheet below is drawn at 8 in an image whose size is a multiple of 32, so 32, 24 and
    // 16 are all *reachable* candidates that a scorer without the coarse-scale margin would return.
    // Only the sheet's own scale comes back.
    for (const grid of [4, 8, 16]) {
      const sheet = soften(upscale(variedCells(96 / grid), grid));
      expect({ grid, measured: estimatePixelGrid(sheet) }).toEqual({ grid, measured: grid });
    }
  });

  it('refuses a sheet whose only change is a single edge, at any position', () => {
    // A share of change alone says the change *fits* a lattice, which one edge always does: some
    // candidate puts a line through it, collects every unit of the sheet's change and scores a
    // perfect 1. Requiring the spacing to be used more than once is what makes it a period rather
    // than a coincidence — measured before that existed, these came back as 21 and 32.
    const flat = { r: 40, g: 40, b: 40, a: 255 };
    const mark = { r: 200, g: 10, b: 10, a: 255 };
    const line = imageFrom(64, 64, (x) => (x === 20 ? mark : flat));
    expect(estimatePixelGrid(line)).toBeNull();

    const border = imageFrom(256, 256, (x, y) =>
      x === 0 || y === 0 || x === 255 || y === 255 ? mark : flat,
    );
    expect(estimatePixelGrid(border)).toBeNull();
  });

  it('refuses a sheet too small to hold a period, however much it changes', () => {
    // Two pixels a side is one step each way, and one interval is not a period. The image's own edge
    // is not a lattice line either — nothing precedes the first pixel for it to differ from — so
    // there is no evidence here at any scale.
    expect(
      estimatePixelGrid(imageFrom(2, 2, (x, y) => ({ r: x * 200, g: y * 200, b: 50, a: 255 }))),
    ).toBeNull();
    expect(
      estimatePixelGrid(imageFrom(3, 3, (x, y) => ({ r: x * 100, g: y * 100, b: 50, a: 255 }))),
    ).toBeNull();
  });

  it('reads the smallest sheet that does hold one — two cells to a side', () => {
    // The counterpart, and why the line count is pooled across the two axes rather than required of
    // each: art two cells a side has exactly one interior line down and one across, which together
    // are the same spacing observed twice.
    expect(estimatePixelGrid(soften(upscale(variedCells(2), 32)))).toBe(32);
  });

  it('reads a two-colour sheet, where every boundary carries the same contrast', () => {
    // The fixture the previous attempt passed on and nothing else. Kept because it is a real case —
    // a silhouette on a flat field is exactly this — not because it is a sufficient one.
    const checker = imageFrom(128, 128, (x, y) =>
      (Math.floor(x / 8) + Math.floor(y / 8)) % 2 === 0
        ? { r: 20, g: 30, b: 40, a: 255 }
        : { r: 220, g: 210, b: 200, a: 255 },
    );
    expect(estimatePixelGrid(soften(checker))).toBe(8);
  });

  it('measures the art rather than the empty space around it', () => {
    // The shape a returned sheet usually has: a few small components with a great deal of key field
    // around them. The field contributes nothing in either direction — it is flat, so it has no
    // steps to contribute — which is what makes a share of *change* the right quantity to score. A
    // share of canvas would be answered by the background.
    const sprite = soften(upscale(variedCells(8), 4));
    const sheet = imageFrom(256, 256, (x, y) =>
      x < sprite.width && y < sprite.height ? pixelAt(sprite, x, y) : { r: 255, g: 0, b: 255, a: 255 },
    );
    expect(estimatePixelGrid(sheet)).toBe(4);
  });

  it('reads a silhouette against transparency, where alpha is the only thing that changes', () => {
    // A keyed sheet has had its background replaced, so the only steps left at its outer edge are in
    // the alpha channel. Alpha is one of the four the magnitude is summed across for this reason.
    const silhouette = imageFrom(128, 128, (x, y) => {
      const cellX = Math.floor(x / 8);
      const cellY = Math.floor(y / 8);
      const inside = Math.hypot(cellX - 8, cellY - 8) < 5;
      return inside
        ? { r: (cellX * 29 + cellY * 71) % 256, g: 120, b: 200, a: 255 }
        : { r: 0, g: 0, b: 0, a: 0 };
    });
    expect(estimatePixelGrid(soften(silhouette))).toBe(8);
  });

  it('measures crisp art too, rather than depending on the softening', () => {
    // It is a period measurement, not a blur detector. Nothing about it requires the edges to have
    // been destroyed first — `measureSheetScale` reaches for it only when the exact reading found
    // nothing, but that is a rule about which question to ask, not a limit on this one.
    expect(estimatePixelGrid(upscale(variedCells(16), 8))).toBe(8);
  });

  it('answers null for smooth artwork rather than inventing a scale', () => {
    // A gradient changes by roughly the same amount everywhere, so no lattice explains more of it
    // than its own width would collect by chance — which the score subtracts. A wrong scale offered
    // is worse than no scale offered: the user clicks it and gets a sheet reduced by the wrong
    // factor with nothing on screen saying so.
    expect(estimatePixelGrid(GRADIENT)).toBeNull();
    expect(estimatePixelGrid(soften(GRADIENT))).toBeNull();
  });

  it('answers null for art that does not start at the top-left corner', () => {
    // `alignToGrid` snaps from the origin, so a scale measured against any other phase is one the
    // transform cannot apply — it would resolve each cell across two of the art's own. This is the
    // trap a comb taking its *modal* remainder falls into, and the reason the window here is fixed
    // on remainder zero: inset art keeps answering `null`, which is what sends the user to crop it.
    const sheet = soften(upscale(variedCells(16), 8));
    for (const inset of [2, 3, 5, 6]) {
      expect({ inset, measured: estimatePixelGrid(shifted(sheet, inset)) }).toEqual({
        inset,
        measured: null,
      });
    }
  });

  it('offers a lattice it can actually apply when the inset happens to admit one', () => {
    // Not every inset is unreadable, and refusing one that is would be its own wrong answer. Art
    // drawn at 8 that starts four pixels in has every boundary on a multiple of **4**, so the grid-4
    // lattice is origin-anchored *and* lossless — each of its cells falls wholly inside one of the
    // art's. 4 is the coarsest scale the transform can apply to this sheet, and under-reducing by a
    // factor of two is a far smaller wrong than reducing across two cells at 8.
    expect(estimatePixelGrid(shifted(upscale(variedCells(16), 8), 4))).toBe(4);
  });

  it('answers null for softening wider than one pixel either side', () => {
    // The limit the estimator claims, stated as a test rather than left to be discovered. Softening
    // this broad spreads a boundary's step past the window, and what is left measures 0.64 to 0.73
    // against a threshold of 0.9 — so the answer is `null`, and the panel asks for the scale. That
    // is the intended trade: past a ramp this wide there is no lattice left for `alignToGrid` to
    // snap to either.
    for (const grid of [8, 12, 16]) {
      const twiceSoftened = soften(soften(upscale(variedCells(96 / grid), grid)));
      expect({ grid, measured: estimatePixelGrid(twiceSoftened) }).toEqual({ grid, measured: null });
    }
  });

  it('answers null for an image with nothing in it to measure', () => {
    // One flat colour edge to edge has no steps at all, so there is no scale in it and every
    // candidate would fit equally — the same honesty `detectPixelGrid` shows on the same image.
    expect(estimatePixelGrid(imageFrom(64, 64, () => ({ r: 10, g: 20, b: 30, a: 255 })))).toBeNull();
  });
});
