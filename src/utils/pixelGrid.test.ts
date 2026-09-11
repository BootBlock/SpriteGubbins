import { describe, expect, it, vi } from 'vitest';
import { detailedMarks, detailedSheet } from '../test/detailedSheet.ts';
import { imageFrom, soften } from '../test/images.ts';
import { alignToGrid } from './gridAlignment.ts';
import { boundaryMesh } from './gridMesh.ts';
import { upscaleNearest } from './upscaleNearest.ts';
import { detectPixelGrid, measureSheetScale } from './pixelGrid.ts';

/**
 * How many times the survey has walked an image, counted at `stepProfile` itself.
 *
 * `vi.hoisted` because the factory below is lifted above every import, so a plain `const` declared
 * here would not exist yet when it runs.
 */
const walks = vi.hoisted(() => ({ count: 0 }));

/**
 * The real `stepProfile`, counted.
 *
 * `pixelGrid.ts` is the only module in this file's graph that imports the *value* — the three
 * estimated readings take a `StepProfile` and import the type alone — so the count is exactly what
 * one `measureSheetScale` cost.
 */
vi.mock('./stepProfile.ts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./stepProfile.ts')>();
  return {
    ...actual,
    stepProfile: (image: ImageData) => {
      walks.count += 1;
      return actual.stepProfile(image);
    },
  };
});

/** A 16 × 16 source in which every pixel is a different colour, so no block of two is ever uniform. */
const PIXEL_SOURCE = imageFrom(16, 16, (x, y) => ({ r: x * 16 + 1, g: y * 16 + 1, b: 64, a: 255 }));

/**
 * A 40 × 40 image drawn at a grid of 4, with `spoiled` of its cells carrying one stray pixel.
 *
 * The lattice contributes 720 transitions — nine interior boundaries each way, forty pixels long —
 * and each stray adds exactly four that miss it: two columns and two rows, at the pixel and again
 * where it ends. So the score is `720 / (720 + 4 × spoiled)`, which is what makes the threshold
 * testable to the pixel.
 *
 * **The strays go in the sixty-four cells clear of the sheet's edge.** A stray in an edge cell
 * changes on a line inside the end band a mesh of 4 folds — the first or last two pixels of an axis
 * — and detection scores no line there, so spoiling those cells would move the score by less than
 * four a stray and put the threshold somewhere this arithmetic does not say.
 *
 * Nothing here reduces the sheet, and that is deliberate: its strays outweigh its cell boundaries in
 * magnitude, so the mesh of 4 cuts on the strays rather than the lattice. That is the defect issue
 * #276 reports, and this is its sheet.
 */
function spottedGrid(spoiled: number): ImageData {
  return imageFrom(40, 40, (x, y) => {
    const cellX = Math.floor(x / 4);
    const cellY = Math.floor(y / 4);
    const inner = cellX >= 1 && cellX <= 8 && cellY >= 1 && cellY <= 8;
    const stray = inner && (cellY - 1) * 8 + (cellX - 1) < spoiled && x % 4 === 1 && y % 4 === 1;
    return { r: ((cellY * 10 + cellX) * 2 + 1) % 256, g: stray ? 250 : 40, b: 100, a: 255 };
  });
}

const FRAME = { r: 255, g: 255, b: 255, a: 255 };
const INTERIOR = { r: 10, g: 160, b: 170, a: 255 };

/** A square sheet, flat inside, with a band `border` pixels wide of a second colour round every edge. */
function framedSheet(size: number, border: number): ImageData {
  return imageFrom(size, size, (x, y) =>
    x < border || y < border || x >= size - border || y >= size - border ? FRAME : INTERIOR,
  );
}

/** Whether aligning to the mesh `grid` measures on this sheet leaves every pixel where it was. */
function survivesAlignment(sheet: ImageData, grid: number): boolean {
  const aligned = alignToGrid(sheet, boundaryMesh(sheet, grid));
  return aligned.data.every((channel, index) => channel === sheet.data[index]);
}

/**
 * A 256 × 256 sheet holding a single 32 × 32 sprite drawn at a grid of 4, on a flat magenta field.
 *
 * The shape a returned sheet very often has — a few small components with a great deal of key field
 * around them — and the one the previous detector could not read. Scored on *uniform blocks*, this
 * image is 63 flat blocks out of 64 at a candidate of 32, so 32 was believed and the art was reduced
 * to a smear.
 */
function sparseSheet(): ImageData {
  return imageFrom(256, 256, (x, y) => {
    if (x >= 32 || y >= 32) return { r: 255, g: 0, b: 255, a: 255 };
    const cell = Math.floor(y / 4) * 8 + Math.floor(x / 4);
    return { r: (cell * 7 + 3) % 256, g: (cell * 31) % 256, b: 90, a: 255 };
  });
}

describe('detectPixelGrid', () => {
  it('finds the scale a pixel-art sheet was actually drawn at', () => {
    // The case the whole feature exists for: 16 × 16 art delivered on a 128 × 128 canvas. 8 rather
    // than 4, 2 or 1 — all of which also score perfectly — because the coarsest grid that holds is
    // the real one, which is why detection counts down rather than up.
    expect(detectPixelGrid(upscaleNearest(PIXEL_SOURCE, 8))).toBe(8);
    expect(detectPixelGrid(upscaleNearest(PIXEL_SOURCE, 4))).toBe(4);
  });

  it('measures the art rather than the empty space around it', () => {
    // The regression this detector was rewritten for. Empty canvas is not evidence of a scale, and
    // counting flat blocks let it behave as though it were: at 99% background, whatever the art was
    // drawn at, the answer came back as the largest candidate there is.
    expect(detectPixelGrid(sparseSheet())).toBe(4);
  });

  it('measures crisp art moved in from the corner, at its own scale', () => {
    // Each axis takes the best of its phase classes, so an inset is a phase and not a defect: art
    // drawn at 8 and delivered three pixels in changes on the lines 3, 11, 19, … — the same grid,
    // sitting somewhere else. The corner-anchored reading answered `null` here and the panel told
    // the user to crop the margin off; the margin's own boundary lands on the phased lattice too —
    // or, one pixel in, inside the end band the mesh folds, where it is not scored at all — so
    // nothing about the sheet needs preparing any more.
    const margin = { r: 250, g: 250, b: 250, a: 255 };
    for (const inset of [1, 3, 7]) {
      const sheet = imageFrom(128 + inset, 128 + inset, (x, y) => {
        if (x < inset || y < inset) return margin;
        const cellX = Math.floor((x - inset) / 8);
        const cellY = Math.floor((y - inset) / 8);
        return { r: cellX * 16 + 1, g: cellY * 16 + 1, b: 64, a: 255 };
      });
      expect({ inset, measured: detectPixelGrid(sheet) }).toEqual({ inset, measured: 8 });
    }
  });

  it('still refuses an interior stray feature, phase search or none', () => {
    // The guard the phase search could have weakened, asserted where it holds: a one-pixel line in
    // the sheet's interior is two transition columns one pixel apart — where it starts and where it
    // ends — and no phase class of any scale of 2 or more contains both. The corner-anchored version
    // of this test lives above; this one moves the line to a position that is *not* a multiple of
    // anything convenient, which is exactly where a phase would have found it.
    const flat = { r: 40, g: 40, b: 40, a: 255 };
    const mark = { r: 200, g: 10, b: 10, a: 255 };
    expect(detectPixelGrid(imageFrom(256, 256, (x) => (x === 97 ? mark : flat)))).toBeNull();
  });

  it('measures a sprite-scale sheet, past the old fixed ceiling', () => {
    // One 16 × 16 sprite filling a 1024-pixel canvas is a grid of 64. Under a fixed ceiling of 32
    // this came back as 32 — a finer, lossless reading of the same lattice, which reduced the sheet
    // to twice the size that was asked for while reading as an exact measurement.
    expect(detectPixelGrid(upscaleNearest(PIXEL_SOURCE, 64))).toBe(64);
  });

  it('derives its ceiling from the image, so two-cell art is measurable at any size', () => {
    // Half the shorter edge is the coarsest scale an image can attest — one interior boundary each
    // way, the smallest sheet that holds a period at all.
    const twoCells = imageFrom(2, 2, (x, y) =>
      (x + y) % 2 === 0 ? { r: 30, g: 200, b: 90, a: 255 } : { r: 220, g: 60, b: 40, a: 255 },
    );
    expect(detectPixelGrid(upscaleNearest(twoCells, 128))).toBe(128);
  });

  it('never answers past what the manual box could hold', () => {
    // Art genuinely drawn coarser than the manual ceiling comes back as the coarsest divisor the
    // range holds — an under-reduction the user can finish in the box, never a value they could not
    // have typed into it.
    const twoCells = imageFrom(2, 2, (x, y) =>
      (x + y) % 2 === 0 ? { r: 30, g: 200, b: 90, a: 255 } : { r: 220, g: 60, b: 40, a: 255 },
    );
    expect(detectPixelGrid(upscaleNearest(twoCells, 512))).toBe(256);
  });

  it('refuses a stray feature whatever candidates the raised ceiling admits', () => {
    // A one-pixel line in the sheet's interior is two transition columns — where it starts and
    // where it ends — and no lattice holds both, so no candidate accounts for nine tenths of this
    // sheet however coarse the image's own ceiling lets it look. (A line touching the far edge has
    // no end inside the image, and is the case below: the one line it does change on sits in the end
    // band every mesh coarser than 2 folds away.)
    const flat = { r: 40, g: 40, b: 40, a: 255 };
    const mark = { r: 200, g: 10, b: 10, a: 255 };
    expect(detectPixelGrid(imageFrom(256, 256, (x) => (x === 100 ? mark : flat)))).toBeNull();
  });

  it('reads no scale off a band the mesh would fold into the cell beside it', () => {
    // A one-pixel frame changes on lines 1 and 255 and nowhere else, and one phase class of 127
    // holds both — but `boundEndCells` merges any end band under three pixels into its neighbour, so
    // the mesh of 127 folded the frame into the interior and the reading, adopted as exact, reduced
    // the sheet to one colour. A line no mesh of a scale can cut on is not evidence for that scale,
    // so detection counts down to the coarsest one whose mesh keeps the frame: 2 for a band of one
    // pixel and 3 for a band of two, the grids at which the bound admits them. At three pixels the
    // band is a cell at any grid, and the coarse reading was always right.
    for (const [border, expected] of [
      [1, 2],
      [2, 3],
      [3, 125],
    ] as const) {
      const sheet = framedSheet(256, border);
      expect({ border, measured: detectPixelGrid(sheet) }).toEqual({ border, measured: expected });
      expect(
        survivesAlignment(sheet, expected),
        `a ${String(border)}-pixel frame at ${String(expected)}`,
      ).toBe(true);
    }

    // The same fold on one edge alone: a line down the last column changes only there, which every
    // phase search holds at some coarse scale and every mesh from 3 up folds.
    const stripe = imageFrom(256, 256, (x) => (x === 255 ? FRAME : INTERIOR));
    expect(detectPixelGrid(stripe)).toBe(2);
    expect(survivesAlignment(stripe, 2)).toBe(true);
  });

  it('still reads art inset by a sliver at both ends at its own scale', () => {
    // The other side of the same line. A margin one pixel wide at the top and left and two at the
    // bottom and right is folded into the art's edge cells by the mesh of 8 — a margin that narrow
    // is not a cell, as `boundEndCells` argues — and so its lines are simply not scored: the art's
    // own lattice is every line left, and the reading is the scale the art was drawn at.
    const margin = { r: 250, g: 0, b: 250, a: 255 };
    const art = upscaleNearest(PIXEL_SOURCE, 8);
    const sheet = imageFrom(art.width + 3, art.height + 3, (x, y) => {
      const artX = x - 1;
      const artY = y - 1;
      if (artX < 0 || artY < 0 || artX >= art.width || artY >= art.height) return margin;
      const offset = (artY * art.width + artX) * 4;
      return { r: art.data[offset] ?? 0, g: art.data[offset + 1] ?? 0, b: art.data[offset + 2] ?? 0, a: 255 };
    });
    expect(detectPixelGrid(sheet)).toBe(8);
  });

  it('believes a grid that scores exactly the threshold', () => {
    // The boundary itself. `GRID_DETECTION_THRESHOLD` says "at or above", and 720 of 800 is exactly
    // nine tenths — a returned sheet is rarely flawless, and this is the near-miss the tolerance
    // exists for.
    expect(detectPixelGrid(spottedGrid(20))).toBe(4);
  });

  it('rejects a grid that falls just short of it', () => {
    // One more stray and the scale is not believed, so detection keeps counting down rather than
    // settling on a scale the art was not drawn at.
    expect(detectPixelGrid(spottedGrid(21))).not.toBe(4);
  });

  it('answers null for smooth artwork rather than inventing a grid', () => {
    // A gradient changes at nearly every pixel, so no lattice can account for more than a fraction of
    // it. `null` is the useful answer: it says the model returned a painted image, and the tab then
    // asks for a grid instead of guessing at one.
    const gradient = imageFrom(64, 64, (x, y) => ({
      r: Math.round((x / 63) * 255),
      g: Math.round((y / 63) * 255),
      b: 128,
      a: 255,
    }));
    expect(detectPixelGrid(gradient)).toBeNull();
  });

  it('answers null for an image with nothing in it to measure', () => {
    // The other end of the same honesty. One flat colour edge to edge changes nowhere, so every
    // candidate fits it equally and none of them is a measurement — where the block count would have
    // reported the largest candidate with complete confidence.
    expect(detectPixelGrid(imageFrom(64, 64, () => ({ r: 10, g: 20, b: 30, a: 255 })))).toBeNull();
  });
});

describe('measureSheetScale', () => {
  it('reports an exact reading where every transition falls on the lattice', () => {
    // Nothing is estimated about crisp art, and the reading says so: the tab shows this as a
    // measurement, adopts it as the grid in force, and asks the user for nothing.
    expect(measureSheetScale(upscaleNearest(PIXEL_SOURCE, 8))).toEqual({ grid: 8, measurement: 'EXACT' });
  });

  it('falls back to the estimate where softening has destroyed the transitions', () => {
    // The same art, resampled. `detectPixelGrid` cannot see it — that is the gap this fallback
    // exists for — and what comes back is the same scale carrying the label that stops it being
    // adopted silently.
    const resampled = soften(upscaleNearest(PIXEL_SOURCE, 8));
    expect(detectPixelGrid(resampled)).toBeNull();
    expect(measureSheetScale(resampled)).toEqual({ grid: 8, measurement: 'EDGE_PERIOD' });
  });

  it('never estimates over an exact reading', () => {
    // The two are tried in order and never both. An exact reading has no tolerance in it, so a
    // second opinion could only disagree with it — and the sheet gets one pass rather than two.
    expect(measureSheetScale(spottedGrid(20))).toEqual({ grid: 4, measurement: 'EXACT' });
  });

  it('answers null where no reading finds a scale', () => {
    // Smooth artwork with no scale in it at all, which is what the panel's "type it yourself"
    // guidance is written for.
    const gradient = imageFrom(64, 64, (x, y) => ({
      r: Math.round((x / 63) * 255),
      g: Math.round((y / 63) * 255),
      b: 128,
      a: 255,
    }));
    expect(measureSheetScale(gradient)).toBeNull();
  });

  it('walks the image once for the three estimated readings, wherever in the chain it answers', () => {
    // Each estimated reading used to derive the step profile for itself, so the chain paid for the
    // same linear pass again at every refusal: two walks for a sheet answering on the correlation
    // and three for a sheet answering on nothing. Measured over the eight sheets in
    // `test_sprites/`, that repeated pass was 82–88% of the whole survey.
    const survey = (image: ImageData): number => {
      walks.count = 0;
      measureSheetScale(image);
      return walks.count;
    };

    // A crisp sheet still pays for none of it. `detectPixelGrid` counts transitions through its own
    // `edgeLattice` and shares nothing with the profile, so the survey answers before computing one.
    expect(survey(upscaleNearest(PIXEL_SOURCE, 8))).toBe(0);

    // One walk where the second reading answers, where the third does, and where none of them does.
    expect(survey(soften(upscaleNearest(PIXEL_SOURCE, 8)))).toBe(1);
    expect(survey(detailedSheet(detailedMarks))).toBe(1);
    expect(survey(imageFrom(64, 64, (x, y) => ({ r: x * 4, g: y * 4, b: 128, a: 255 })))).toBe(1);
  });
});
