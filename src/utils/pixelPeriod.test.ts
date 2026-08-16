import { describe, expect, it } from 'vitest';
import { imageFrom, soften } from '../test/images.ts';
import { upscaleNearest } from './upscaleNearest.ts';
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
    expect(estimatePixelGrid(soften(upscaleNearest(variedCells(32), 4)))).toBe(4);
    expect(estimatePixelGrid(soften(upscaleNearest(variedCells(16), 8)))).toBe(8);
    expect(estimatePixelGrid(soften(upscaleNearest(variedCells(8), 16)))).toBe(16);
  });

  it('measures sprite-scale softening, past the old fixed ceiling', () => {
    // Eight cells a side drawn at 64 and then resampled — a 512-pixel sheet of 8 × 8 logical
    // pixels. Under a fixed ceiling of 32 no candidate could reach the truth, and the answer for a
    // sheet this coarse was a divisor at best and `null` at worst.
    expect(estimatePixelGrid(soften(upscaleNearest(variedCells(8), 64)))).toBe(64);
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
      const sheet = soften(upscaleNearest(variedCells(96 / grid), grid));
      expect({ grid, measured: estimatePixelGrid(sheet) }).toEqual({ grid, measured: grid });
    }
  });

  it('refuses a sheet whose only change is a stray feature, however it is arranged', () => {
    // A share of change alone says the change *fits* a lattice, which one feature always does: some
    // candidate puts a line through it, collects every unit of the sheet's change and scores a
    // perfect 1. Requiring the spacing to have been *observed* — two neighbouring lattice lines both
    // carrying change — is what makes it a period rather than a coincidence. The full frame is the
    // case that fixes the guard's shape: once the reading learnt phases, a 256-pixel frame fits a
    // lattice of 127 at phase 1 perfectly and puts change through *two* of its lines, so a bare
    // count of used lines waves it through — but those two lines are the first and last of three,
    // and the line between them passes through nothing. Measured before any of these guards, in
    // order: 21, 21, 25, 21.
    const flat = { r: 40, g: 40, b: 40, a: 255 };
    const mark = { r: 200, g: 10, b: 10, a: 255 };
    const sheets = {
      'one vertical line': imageFrom(64, 64, (x) => (x === 20 ? mark : flat)),
      'a one-pixel cross': imageFrom(64, 64, (x, y) => (x === 20 || y === 20 ? mark : flat)),
      'a separator each way': imageFrom(256, 256, (x, y) => (x === 100 || y === 150 ? mark : flat)),
      'a frame down two sides': imageFrom(128, 128, (x, y) => (x === 127 || y === 127 ? mark : flat)),
      'a full one-pixel frame': imageFrom(256, 256, (x, y) =>
        x === 0 || y === 0 || x === 255 || y === 255 ? mark : flat,
      ),
    };
    for (const [name, sheet] of Object.entries(sheets)) {
      expect({ name, measured: estimatePixelGrid(sheet) }).toEqual({ name, measured: null });
    }
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
    // The counterpart, and what the every-line-used clause in `sawTheSpacing` exists for: art two
    // cells a side has exactly one interior boundary each way, so no adjacency can ever be observed
    // in it — but the one line its scale offers is the one line the art used, and there is no
    // reading of the smallest periodic sheet that could ask for more.
    expect(estimatePixelGrid(soften(upscaleNearest(variedCells(2), 32)))).toBe(32);
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
    const sprite = soften(upscaleNearest(variedCells(8), 4));
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
    expect(estimatePixelGrid(upscaleNearest(variedCells(16), 8))).toBe(8);
  });

  it('answers null for smooth artwork rather than inventing a scale', () => {
    // A gradient changes by roughly the same amount everywhere, so no lattice explains more of it
    // than its own width would collect by chance — which the score subtracts. A wrong scale offered
    // is worse than no scale offered: the user clicks it and gets a sheet reduced by the wrong
    // factor with nothing on screen saying so.
    expect(estimatePixelGrid(GRADIENT)).toBeNull();
    expect(estimatePixelGrid(soften(GRADIENT))).toBeNull();
  });

  it('measures inset art at its own scale, wherever it sits against the corner', () => {
    // The reading takes each axis's best phase, so art moved in from the corner is the same period
    // at a different phase and not a different period. For a long time this was not true: the
    // measurement was anchored at the origin because `alignToGrid` could only snap from the corner,
    // so these insets came back as `null` or as whatever divisor of 8 happened to sit near the
    // corner-anchored lattice — 4 for an inset of 3, `null` for an inset of 6 — and the panel told
    // the user to crop the margin off. `bestGridOffset` removed the constraint at its root, and the
    // margin's own boundary sits on the phased lattice too, so every inset now reads as the scale
    // the art was actually drawn at. **Both forms are checked** because they exercise different
    // readers' fallbacks: a crisp margin reaches this estimator only in fixtures — `detectPixelGrid`
    // answers it first in the app — while a softened one is the shape models return.
    const crisp = upscaleNearest(variedCells(16), 8);
    const softened = soften(crisp);
    for (const inset of [1, 2, 3, 4, 5, 6, 7]) {
      expect({ inset, measured: estimatePixelGrid(shifted(crisp, inset)) }).toEqual({
        inset,
        measured: 8,
      });
      expect({ inset, measured: estimatePixelGrid(shifted(softened, inset)) }).toEqual({
        inset,
        measured: 8,
      });
    }
  });

  it('answers null for softening wider than one pixel either side', () => {
    // The limit the estimator claims, stated as a test rather than left to be discovered. Softening
    // this broad spreads a boundary's step past the window, and what is left measures 0.64 to 0.73
    // against a threshold of 0.9 — so the answer is `null`, and the panel asks for the scale. That
    // is the intended trade: past a ramp this wide there is no lattice left for `alignToGrid` to
    // snap to either.
    for (const grid of [8, 12, 16]) {
      const twiceSoftened = soften(soften(upscaleNearest(variedCells(96 / grid), grid)));
      expect({ grid, measured: estimatePixelGrid(twiceSoftened) }).toEqual({ grid, measured: null });
    }
  });

  it('answers null for an image with nothing in it to measure', () => {
    // One flat colour edge to edge has no steps at all, so there is no scale in it and every
    // candidate would fit equally — the same honesty `detectPixelGrid` shows on the same image.
    expect(estimatePixelGrid(imageFrom(64, 64, () => ({ r: 10, g: 20, b: 30, a: 255 })))).toBeNull();
  });

  it('refuses a lone edge on a tiny sheet, with or without a noise floor under it', () => {
    // The gap the per-axis qualification in `fitsLattice` closes, found by an adversarial probe. A
    // 12-pixel sheet split once holds one real boundary, and the ±1-per-channel noise every
    // re-encode leaves puts *some* mass at every position — so on the axis with no structure at all
    // every lattice line "carried", the spacing qualified vacuously, and the share was then supplied
    // almost entirely by the other axis's single edge, which no period explains. The coarsest
    // candidate the ceiling admits came back as a measurement of an image that has no period in it.
    // The qualifying axis is now held to the same corrected share on its own change, which an axis
    // of noise cannot reach — and the clean variant stays refused by the spacing guard alone, which
    // is what shows the noise was the whole difference.
    const noise = (x: number, y: number, channel: number) =>
      (((x * 374761393 + y * 668265263 + channel * 69119) >>> 3) % 3) - 1;
    const split = (withNoise: boolean) =>
      imageFrom(12, 12, (x, y) => {
        const base = x < 4 ? 40 : 200;
        const wobble = (channel: number) => (withNoise ? noise(x, y, channel) : 0);
        return { r: base + wobble(1), g: base + wobble(2), b: base + wobble(3), a: 255 };
      });

    expect(estimatePixelGrid(split(false))).toBeNull();
    expect(estimatePixelGrid(split(true))).toBeNull();
  });
});
