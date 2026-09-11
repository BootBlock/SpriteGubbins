import { describe, expect, it, vi } from 'vitest';
import { detailedMarks, detailedSheet } from '../test/detailedSheet.ts';
import { framedSheet, imageFrom, soften } from '../test/images.ts';
import { leadingCells, spottedGrid } from '../test/spottedGrid.ts';
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

const FRAME = { r: 255, g: 255, b: 255, a: 255 };
const INTERIOR = { r: 10, g: 160, b: 170, a: 255 };

/** `PIXEL_SOURCE` drawn at 8, inset into a flat magenta field by `lead` pixels and trailed by `trail`. */
function insetArt(lead: number, trail: number): ImageData {
  const margin = { r: 250, g: 0, b: 250, a: 255 };
  const art = upscaleNearest(PIXEL_SOURCE, 8);
  return imageFrom(art.width + lead + trail, art.height + lead + trail, (x, y) => {
    const artX = x - lead;
    const artY = y - lead;
    if (artX < 0 || artY < 0 || artX >= art.width || artY >= art.height) return margin;
    const offset = (artY * art.width + artX) * 4;
    return { r: art.data[offset] ?? 0, g: art.data[offset + 1] ?? 0, b: art.data[offset + 2] ?? 0, a: 255 };
  });
}

/** A flat 256² sheet with the columns `from` to `to` inclusive drawn in the frame colour. */
function columnLine(from: number, to: number): ImageData {
  return imageFrom(256, 256, (x) => (x >= from && x <= to ? FRAME : INTERIOR));
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
    // and one pixel in, where the mesh folds it, it is one line in sixteen, under the tenth a scale
    // may discard — so nothing about the sheet needs preparing any more.
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
    // the sheet to one colour. A line no mesh of a scale can cut on never counts for that scale,
    // so detection counts down to the coarsest one whose mesh keeps the frame: 2 for a band of one
    // pixel and 3 for a band of two, the grids at which the bound admits them. At three pixels the
    // band is a cell at any grid, and the coarse reading was always right.
    for (const [border, expected] of [
      [1, 2],
      [2, 3],
      [3, 125],
    ] as const) {
      const sheet = framedSheet(256, border, FRAME, INTERIOR);
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

  it('still refuses a one-pixel line beside an end band', () => {
    // The reason a folded line still counts *against* a scale. A line at column 2 changes on lines 2
    // and 3, and the stray-feature guard rests on no phase class holding both — but line 2 is inside
    // the band every mesh from 4 up folds. Were it dropped from the total as well as the phase count,
    // line 3 alone would be a perfect share at 128, and the reduction would delete the line.
    for (const column of [1, 2, 253, 254]) {
      expect({ column, measured: detectPixelGrid(columnLine(column, column)) }).toEqual({
        column,
        measured: null,
      });
    }
    // Two pixels wide, one in from the edge, it changes on lines 1 and 3: one phase class of 2 holds
    // both and the mesh of 2 keeps both, so that reading stands.
    expect(detectPixelGrid(columnLine(1, 2))).toBe(2);
    expect(survivesAlignment(columnLine(1, 2), 2)).toBe(true);
  });

  it('reads art inset by a sliver at its own scale while the sliver is under a tenth of its change', () => {
    // The cost of counting a folded line against a scale, stated where it is paid. Sixteen cells of
    // art at 8, trailed by a two-pixel margin, change on sixteen lines an axis, and the margin's is
    // the one the mesh of 8 folds: fifteen in sixteen is over nine tenths, and the reading is 8.
    expect(detectPixelGrid(insetArt(0, 2))).toBe(8);
    // Give the same art a one-pixel margin in front as well and the mesh of 8 folds two lines in
    // seventeen — more of the sheet's change than the threshold lets a scale discard. The reading
    // falls to 2, whose mesh keeps both margins: too fine, which a reader can see and finish, rather
    // than a coarse reading that quietly drops change.
    expect(detectPixelGrid(insetArt(1, 2))).toBe(2);
  });

  it('believes a grid that scores exactly the threshold', () => {
    // The boundary itself. `GRID_DETECTION_THRESHOLD` says "at or above", and 720 of 800 is exactly
    // nine tenths — a returned sheet is rarely flawless, and this is the near-miss the tolerance
    // exists for.
    expect(detectPixelGrid(spottedGrid({ spoils: leadingCells(20) }))).toBe(4);
  });

  it('rejects a grid that falls just short of it', () => {
    // One more stray and the scale is not believed, so detection keeps counting down rather than
    // settling on a scale the art was not drawn at.
    expect(detectPixelGrid(spottedGrid({ spoils: leadingCells(21) }))).not.toBe(4);
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
    expect(measureSheetScale(spottedGrid({ spoils: leadingCells(20) }))).toEqual({
      grid: 4,
      measurement: 'EXACT',
    });
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
