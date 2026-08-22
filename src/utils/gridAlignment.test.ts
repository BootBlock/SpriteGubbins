import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import { upscaleNearest } from './upscaleNearest.ts';
import type { GridOffset, Rgba } from '../types/quantiser.ts';
import { alignToGrid, downscaleNearest } from './gridAlignment.ts';
import { regularMesh } from './gridMesh.ts';
import { pixelOffset, readPixel } from './imageData.ts';

/** A 16 × 16 source in which every pixel is a different colour, so no block of two is ever uniform. */
const PIXEL_SOURCE = imageFrom(16, 16, (x, y) => ({ r: x * 16 + 1, g: y * 16 + 1, b: 64, a: 255 }));

/**
 * Awkward on purpose: 15 is not a multiple of 4, so a trailing partial cell is covered — and it is
 * three rows rather than one, because the mesh merges an end band of fewer than three pixels into
 * the cell beside it and a one-row strip would no longer be a cell at all.
 */
const NOISY = imageFrom(20, 15, (x, y) => ({
  r: (x * 37 + y * 11) % 256,
  g: (x * 5 + y * 29) % 256,
  b: (x * y) % 256,
  // A transparent column, so alignment is exercised over alpha as well as colour.
  a: x % 5 === 0 ? 0 : 255,
}));

/** The grid anchored at the image's own corner, which is what most of these tests exercise. */
const CORNER: GridOffset = { x: 0, y: 0 };

describe('alignToGrid', () => {
  it('is idempotent — aligning an aligned image changes nothing', () => {
    // The clearest single check that the step did what it claims: after it, every cell is one
    // colour, so there is nothing left for a second pass to collapse.
    const once = alignToGrid(NOISY, regularMesh(20, 15, 4, CORNER));
    const twice = alignToGrid(once, regularMesh(20, 15, 4, CORNER));
    expect(channels(twice)).toEqual(channels(once));
  });

  it('is idempotent at an offset too, where the cells it revisits are the partial ones', () => {
    const offset: GridOffset = { x: 3, y: 2 };
    const once = alignToGrid(NOISY, regularMesh(20, 15, 4, offset));
    const twice = alignToGrid(once, regularMesh(20, 15, 4, offset));
    expect(channels(twice)).toEqual(channels(once));
  });

  it('takes the cell’s most frequent colour, never an average of it', () => {
    // An average invents a colour that was not in the image — the opposite of what a palette-limited
    // sprite wants. Three pixels of one colour and one of another must give the majority colour
    // exactly, not the (192, 0, 0) that a mean of them would produce.
    const majority: Rgba = { r: 255, g: 0, b: 0, a: 255 };
    const minority: Rgba = { r: 0, g: 0, b: 255, a: 255 };
    const cell = imageFrom(2, 2, (x, y) => (x === 1 && y === 1 ? minority : majority));

    const aligned = alignToGrid(cell, regularMesh(2, 2, 2, CORNER));
    for (let offset = 0; offset < aligned.data.length; offset += 4) {
      expect(readPixel(aligned.data, offset)).toEqual(majority);
    }
  });

  it('resolves an all-distinct cell to its centre pixel, not its corner', () => {
    // The smooth-art case, and the defect the tie-break was rewritten for. In a returned sheet every
    // pixel of a cell is subtly different, so every colour ties at one vote — and first-in-scan-order
    // resolved that to the cell's top-left corner, the one pixel guaranteed to sit on the boundary
    // between the art's own blocks, in the anti-aliasing fringe. A whole sheet of such cells came
    // back speckled with edge-blend colours. The centre pixel is the one furthest from every
    // boundary.
    const aligned = alignToGrid(PIXEL_SOURCE, regularMesh(16, 16, 4, CORNER));

    for (let cellY = 0; cellY < 4; cellY += 1) {
      for (let cellX = 0; cellX < 4; cellX += 1) {
        // A 4 × 4 cell's centre falls between four pixels; nearest-then-earliest resolves that to
        // (1, 1) within the cell, deterministically.
        const centre = readPixel(
          PIXEL_SOURCE.data,
          pixelOffset(PIXEL_SOURCE.width, cellX * 4 + 1, cellY * 4 + 1),
        );
        expect(readPixel(aligned.data, pixelOffset(aligned.width, cellX * 4, cellY * 4))).toEqual(centre);
      }
    }
  });

  it('lets a genuine majority beat a colour nearer the centre', () => {
    // The tie-break is only a tie-break. Five pixels of one colour outvote the one sitting exactly
    // on the centre, however central it is — anything else would resample crisp art.
    const majority: Rgba = { r: 10, g: 200, b: 30, a: 255 };
    const centre: Rgba = { r: 240, g: 40, b: 90, a: 255 };
    const cell = imageFrom(3, 3, (x, y) =>
      x === 1 && y === 1 ? centre : x < 2 && y < 2 ? majority : { r: x * 80, g: y * 80, b: 200, a: 255 },
    );

    const aligned = alignToGrid(cell, regularMesh(3, 3, 3, CORNER));
    expect(readPixel(aligned.data, 0)).toEqual(majority);
  });

  it('aligns the partial cells a sheet cuts short, rather than leaving a ragged edge', () => {
    // 20 × 15 at a grid of 4 leaves a three-row strip at the bottom. Skipping it would leave the
    // only unaligned part of the image exactly where a sprite sheet's last row of components sits.
    //
    // Asserted against the colour the strip should actually hold, not merely against itself: the
    // output buffer starts zero-filled, so "every pixel in the cell matches" is equally true of a
    // cell that was never written at all — which is precisely the implementation this test rules
    // out. The strip's first cell is 4 × 3 all-distinct pixels, so its modal vote ties and the
    // centre tie-break resolves it: the cell's centre is (1.5, 13), and nearest-then-earliest takes
    // the pixel at x = 1, y = 13.
    const expected = readPixel(NOISY.data, pixelOffset(NOISY.width, 1, 13));
    const aligned = alignToGrid(NOISY, regularMesh(20, 15, 4, CORNER));

    for (let y = 12; y < 15; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        expect(readPixel(aligned.data, pixelOffset(aligned.width, x, y))).toEqual(expected);
      }
    }
  });

  it('snaps to the art’s own boundaries when the offset says where they are', () => {
    // The whole point of the offset: art drawn at 4 but delivered three pixels in from the corner
    // has its boundaries at 3, 7, 11, … — and a corner-anchored alignment resolves every cell over
    // a window straddling two of the art's own, reducing the sheet to mush. At the art's phase every
    // cell is already uniform, so aligning is the identity.
    //
    // Three pixels of margin rather than two, because the mesh merges a shorter end band into the
    // cell beside it: three source pixels is the narrowest leading cell any lattice can express.
    const art = upscaleNearest(
      imageFrom(4, 4, (x, y) => ({ r: x * 60 + 10, g: y * 60 + 10, b: 120, a: 255 })),
      4,
    );
    const inset = imageFrom(19, 19, (x, y) =>
      x < 3 || y < 3
        ? { r: 250, g: 250, b: 250, a: 255 }
        : readPixel(art.data, pixelOffset(art.width, x - 3, y - 3)),
    );

    const aligned = alignToGrid(inset, regularMesh(19, 19, 4, { x: 3, y: 3 }));
    expect(channels(aligned)).toEqual(channels(inset));
  });
});

describe('downscaleNearest', () => {
  it('is lossless after alignment — upscaling reproduces the aligned image exactly', () => {
    // What makes the pair of steps a change of scale rather than a resampling: every pixel in a cell
    // is already identical, so taking the top-left one discards nothing.
    const aligned = alignToGrid(upscaleNearest(PIXEL_SOURCE, 8), regularMesh(128, 128, 8, CORNER));
    const reduced = downscaleNearest(aligned, regularMesh(128, 128, 8, CORNER));
    expect(channels(upscaleNearest(reduced, 8))).toEqual(channels(aligned));
  });

  it('keeps trailing partial cells instead of cropping them away', () => {
    // Cropping to a whole multiple of the grid would silently delete a row of a sheet.
    const reduced = downscaleNearest(
      alignToGrid(NOISY, regularMesh(20, 15, 4, CORNER)),
      regularMesh(20, 15, 4, CORNER),
    );
    expect(reduced.width).toBe(5);
    expect(reduced.height).toBe(4);
  });

  it('keeps the leading partial cells an offset creates, for the same reason', () => {
    // At an offset of 3 on a 20-pixel axis the cells are [0,3), [3,7), [7,11), [11,15), [15,20):
    // five of them, the first and last partial. Cropping the leading strip would delete the margin
    // side of every sheet whose art does not start at the corner.
    const offset: GridOffset = { x: 3, y: 3 };
    const reduced = downscaleNearest(
      alignToGrid(NOISY, regularMesh(20, 15, 4, offset)),
      regularMesh(20, 15, 4, offset),
    );
    expect(reduced.width).toBe(5);
    expect(reduced.height).toBe(4);
  });

  it('keeps one cell on an axis whose offset leaves no cut on it at all', () => {
    // An offset at or past the extent puts no cut on the axis, and an axis of no cells is a
    // zero-dimension image rather than a small one — `ImageData`'s constructor throws on it. The
    // image's own edge bounds one cell whatever the phase, so that is what comes back.
    const mesh = regularMesh(4, 4, 6, { x: 5, y: 5 });

    expect(mesh.x).toEqual([0]);
    expect(mesh.y).toEqual([0]);
  });

  it('merges an end band too narrow to be a cell into the cell beside it', () => {
    // The defect this bound exists for: `downscaleNearest` emits one output pixel per cell, so a
    // band of one or two pixels would stand in the result exactly as wide as a full cell — which is
    // how a 1254 × 1254 sheet came back 210 × 209 at a grid of 6. An end cell holds three source
    // pixels at least, so an offset of 1 merges into the cell after it, and the 15-pixel axis's
    // one-row tail merges into the cell before it. Nothing is cropped: the merged bands are still
    // in the sheet, voting in those cells by the area they cover.
    const offset: GridOffset = { x: 1, y: 2 };
    const mesh = regularMesh(20, 15, 4, offset);

    expect(mesh.x).toEqual([0, 5, 9, 13, 17]);
    expect(mesh.y).toEqual([0, 6, 10]);

    const reduced = downscaleNearest(alignToGrid(NOISY, mesh), mesh);
    expect(reduced.width).toBe(5);
    expect(reduced.height).toBe(3);
  });

  it('samples the cells the alignment resolved, not corner-anchored ones', () => {
    // The two transforms must agree about where every cell begins, or the reduction reads pixels
    // the alignment never wrote. A 3-offset lattice on a 19-pixel axis is cells [0,3), [3,7), …:
    // the reduced image's second pixel must be the aligned image's pixel at x = 3, not at x = 4.
    const art = upscaleNearest(
      imageFrom(4, 4, (x, y) => ({ r: x * 60 + 10, g: y * 60 + 10, b: 120, a: 255 })),
      4,
    );
    const inset = imageFrom(19, 19, (x, y) =>
      x < 3 || y < 3
        ? { r: 250, g: 250, b: 250, a: 255 }
        : readPixel(art.data, pixelOffset(art.width, x - 3, y - 3)),
    );
    const offset: GridOffset = { x: 3, y: 3 };

    const mesh = regularMesh(19, 19, 4, offset);
    const reduced = downscaleNearest(alignToGrid(inset, mesh), mesh);

    expect(reduced.width).toBe(5);
    expect(reduced.height).toBe(5);
    // The margin survives as the first pixel, and the art's own 4 × 4 grid as the remaining 4 × 4.
    expect(readPixel(reduced.data, pixelOffset(reduced.width, 0, 0))).toEqual({
      r: 250,
      g: 250,
      b: 250,
      a: 255,
    });
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        expect(readPixel(reduced.data, pixelOffset(reduced.width, x + 1, y + 1))).toEqual({
          r: x * 60 + 10,
          g: y * 60 + 10,
          b: 120,
          a: 255,
        });
      }
    }
  });
});
