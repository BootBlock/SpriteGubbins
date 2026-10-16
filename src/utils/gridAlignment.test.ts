import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import { upscaleNearest } from './upscaleNearest.ts';
import type { GridOffset, Rgba } from '../types/quantiser.ts';
import { alignToGrid, downscaleNearest, upscaleOverMesh } from './gridAlignment.ts';
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

/** The keyed field's value, which is what a cell reads as when most of it is clear. */
const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

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

  it('counts every pixel under the coverage floor as clear, whatever its bytes', () => {
    // Ten faint pixels, each carrying a different noise colour, beside six of one opaque red. By
    // their bytes each was a bucket of one and the red won; as the clear pixels they are, they are
    // most of the cell, and the cell is clear.
    const red: Rgba = { r: 200, g: 30, b: 30, a: 255 };
    const cell = imageFrom(4, 4, (x, y) => {
      const index = y * 4 + x;
      return index < 6 ? red : { r: index * 20, g: 0, b: 0, a: 10 };
    });
    const aligned = alignToGrid(cell, regularMesh(4, 4, 4, CORNER));
    expect(readPixel(aligned.data, 0)).toEqual(CLEAR);
  });

  it('keeps a cell that is mostly artwork, however its artwork is split between shades', () => {
    // The silhouette case. Fourteen clear pixels outnumber each of three reds (8, 7 and 7), and
    // voted as one more bucket they won the cell outright — erasing an edge cell that is
    // three-fifths art. Coverage is decided first, so the cell takes its commonest red.
    const shades: Rgba[] = [
      { r: 200, g: 30, b: 30, a: 255 },
      { r: 170, g: 30, b: 30, a: 255 },
      { r: 140, g: 30, b: 30, a: 255 },
    ];
    const cell = imageFrom(6, 6, (x, y) => {
      const index = y * 6 + x;
      if (index < 14) return CLEAR;
      return shades[index < 22 ? 0 : index < 29 ? 1 : 2] ?? CLEAR;
    });
    const aligned = alignToGrid(cell, regularMesh(6, 6, 6, CORNER));
    expect(readPixel(aligned.data, 0)).toEqual(shades[0]);
  });

  it('draws the coverage line where the other two readings draw it: exactly half clear stays art', () => {
    const red: Rgba = { r: 200, g: 30, b: 30, a: 255 };
    const halfClear = (clear: number) => imageFrom(4, 4, (x, y) => (y * 4 + x < clear ? CLEAR : red));
    const mesh = regularMesh(4, 4, 4, CORNER);

    expect(readPixel(alignToGrid(halfClear(8), mesh).data, 0)).toEqual(red);
    expect(readPixel(alignToGrid(halfClear(9), mesh).data, 0)).toEqual(CLEAR);
  });

  it('lets the line rescue reach a keyed edge cell the clear pixels used to win', () => {
    // Sixteen clear pixels outnumbered the fourteen of pale body, so the cell came out clear and the
    // rescue, which never overrules a transparent winner, had nothing to act on: the outline and
    // the fill went together. Now the body wins the cell and the six of ink are a line to keep.
    const body: Rgba = { r: 220, g: 200, b: 160, a: 255 };
    const ink: Rgba = { r: 20, g: 20, b: 30, a: 255 };
    const cell = imageFrom(6, 6, (x, y) => {
      const index = y * 6 + x;
      return index < 16 ? CLEAR : index < 30 ? body : ink;
    });
    const mesh = regularMesh(6, 6, 6, CORNER);

    expect(readPixel(alignToGrid(cell, mesh).data, 0)).toEqual(body);
    expect(readPixel(alignToGrid(cell, mesh, true).data, 0)).toEqual(ink);
  });

  it('aligns the partial cells a sheet cuts short, rather than leaving a ragged edge', () => {
    // 20 × 15 at a grid of 4 leaves a three-row strip at the bottom. Skipping it would leave the
    // only unaligned part of the image exactly where a sprite sheet's last row of components sits.
    //
    // Asserted against the colour the strip should actually hold, not merely against itself: the
    // output buffer starts zero-filled, so "every pixel in the cell matches" is equally true of a
    // cell that was never written at all — which is precisely the implementation this test rules
    // out. The strip's last cell is the one clear of the transparent columns: 4 × 3 all-distinct
    // opaque pixels, so its modal vote ties and the centre tie-break
    // resolves it. The cell's centre is (17.5, 13), and nearest-then-earliest takes the pixel at
    // x = 17, y = 13.
    const expected = readPixel(NOISY.data, pixelOffset(NOISY.width, 17, 13));
    const aligned = alignToGrid(NOISY, regularMesh(20, 15, 4, CORNER));

    for (let y = 12; y < 15; y += 1) {
      for (let x = 16; x < 20; x += 1) {
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

describe('upscaleOverMesh', () => {
  it('paints a reduction back into the aligned image over a phased mesh', () => {
    // The first cells are five and six pixels wide, so a magnification by the grid would put every
    // cell after them one or two pixels off the pixels it was read from.
    const mesh = regularMesh(20, 15, 4, { x: 1, y: 2 });
    const aligned = alignToGrid(NOISY, mesh);

    const painted = upscaleOverMesh(downscaleNearest(aligned, mesh), mesh, 20, 15);

    expect(channels(painted)).toEqual(channels(aligned));
  });

  it('follows a mesh whose cells drift in width', () => {
    // What `boundaryMesh` returns on a generated sheet: no fixed lattice holds every boundary.
    const mesh = { x: [0, 3, 7, 12, 16], y: [0, 5, 9, 12], patches: [] };
    const aligned = alignToGrid(NOISY, mesh);
    const reduced = downscaleNearest(aligned, mesh);

    expect(channels(upscaleOverMesh(reduced, mesh, 20, 15))).toEqual(channels(aligned));
    expect(channels(downscaleNearest(upscaleOverMesh(reduced, mesh, 20, 15), mesh))).toEqual(
      channels(reduced),
    );
  });

  it('refuses an image that is not one pixel per cell of the mesh', () => {
    const mesh = regularMesh(20, 15, 4, CORNER);

    expect(() => upscaleOverMesh(PIXEL_SOURCE, mesh, 20, 15)).toThrow();
  });
});
