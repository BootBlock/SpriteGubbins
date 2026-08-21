import { describe, expect, it } from 'vitest';
import { PALETTE_COLOR_COUNTS } from '../constants/quantiser.ts';
import { channels, imageFrom } from '../test/images.ts';
import { upscaleNearest } from './upscaleNearest.ts';
import { VOTE_METHODS } from '../types/quantiser.ts';
import type { QuantiseSettings, Rgba } from '../types/quantiser.ts';
import { channelLevels } from './channelLevels.ts';
import { colorPlanFor } from './colorReduction.ts';
import { countColors, pixelOffset, readPixel, toHex } from './imageData.ts';
import { quantiseImage } from './quantiseImage.ts';
import { spriteSegments } from './spriteSegments.ts';

/** 16 × 16 art, every pixel a different colour. */
const SPRITE = imageFrom(16, 16, (x, y) => ({ r: x * 16 + 1, g: y * 16 + 1, b: 64, a: 255 }));

/** 200 pixels, every one a different colour, already at its own resolution. */
const TWO_HUNDRED_COLORS = imageFrom(20, 10, (x, y) => {
  const n = y * 20 + x;
  return { r: (n * 7) % 256, g: (n * 13) % 256, b: (n * 29) % 256, a: 255 };
});

const MAGENTA: Rgba = { r: 255, g: 0, b: 255, a: 255 };
const TRANSPARENT: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const ART: Rgba = { r: 20, g: 180, b: 60, a: 255 };
/** A second art colour as far from the key as {@link ART} is, for the piece that is smaller than a cell. */
const TRINKET: Rgba = { r: 200, g: 120, b: 30, a: 255 };
/** The two colours the symmetry fixtures at the foot of this file are drawn in. */
const FILL: Rgba = { r: 90, g: 110, b: 140, a: 255 };
const EDGE: Rgba = { r: 210, g: 180, b: 60, a: 255 };

const KEYING = { color: MAGENTA, tolerance: 16 };

/**
 * A 32 × 32 sheet whose art sits **six pixels in from the corner**: a 16 × 16 sprite at [6, 22), and
 * a 4 × 4 trinket at [24, 28) — smaller than one cell of the grid of 8 the sheet is quantised at.
 *
 * The sprite's boundaries at 6 and 22 are the heaviest steps in the image, so `boundaryMesh`
 * anchors on one of them, snaps to the other, and completes the cut between at 14 — the cells
 * become [0, 6), [6, 14), [14, 22), [22, 30), [30, 32) each way: five per axis, the sprite filling
 * four cells exactly and the trinket sitting inside cell (3, 3) with three times as much field
 * around it.
 *
 * The field is a *drifting* magenta — 64 distinct near-magentas, laid out so no two pixels within
 * any 8 × 8 window share a colour. That is exactly what a returned sheet looks like, and it is the
 * condition the ordering test below turns on: each of those colours polls a single vote in the
 * modal alignment, so any colour appearing twice beats all of them.
 *
 * Blue is pinned at 255, so only two channels drift and by at most 7 each: the widest of them is 2.5
 * from the key as the discounted OKLab metric reads it, well inside `KEYING`. The art colours
 * measure 67 and 55, so they are outside the field and the fringe threshold alike and cannot be
 * eroded.
 */
const INSET_SHEET = imageFrom(32, 32, (x, y) => {
  if (x >= 6 && x < 22 && y >= 6 && y < 22) return ART;
  if (x >= 24 && x < 28 && y >= 24 && y < 28) return TRINKET;
  const withinCell = (y % 8) * 8 + (x % 8);
  return { r: 255 - (withinCell % 8), g: Math.floor(withinCell / 8), b: 255, a: 255 };
});

/** The reduced sheet as a grid of colours, which is what the two orderings actually disagree about. */
function pixels(image: ImageData): Rgba[][] {
  const rows: Rgba[][] = [];
  for (let y = 0; y < image.height; y += 1) {
    const row: Rgba[] = [];
    for (let x = 0; x < image.width; x += 1) {
      row.push(readPixel(image.data, pixelOffset(image.width, x, y)));
    }
    rows.push(row);
  }
  return rows;
}

describe('quantiseImage', () => {
  it('recovers the art a sheet was drawn at from the sheet it came back on', () => {
    // The whole feature in one assertion: 16 × 16 art returned on a 128 × 128 canvas comes back as
    // the 16 × 16 art, pixel for pixel, with nothing invented and nothing lost.
    const result = quantiseImage(upscaleNearest(SPRITE, 8), {
      grid: 8,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: null,
    });

    expect(result.image.width).toBe(16);
    expect(result.image.height).toBe(16);
    expect(channels(result.image)).toEqual(channels(SPRITE));
  });

  it('reduces the palette to the colour count it is given', () => {
    const result = quantiseImage(TWO_HUNDRED_COLORS, {
      grid: 1,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: { kind: 'MAX_COLORS', maxColors: 32 },
    });

    expect(countColors(TWO_HUNDRED_COLORS)).toBe(200);
    expect(result.colors).toBe(32);
  });

  it('leaves the colours alone for UNRESTRICTED', () => {
    // `UNRESTRICTED` is `null` rather than a generous cap, and this is what that buys: a painted or
    // 3D-rendered sheet passes through the palette step untouched instead of being reduced to some
    // figure nobody chose. A grid of 1 is the identity for the two steps before it.
    const result = quantiseImage(TWO_HUNDRED_COLORS, {
      grid: 1,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: colorPlanFor('FREE', 'UNRESTRICTED', null, 0).reduction,
    });

    expect(PALETTE_COLOR_COUNTS.UNRESTRICTED).toBeNull();
    expect(result.colors).toBe(countColors(TWO_HUNDRED_COLORS));
    expect(channels(result.image)).toEqual(channels(TWO_HUNDRED_COLORS));
  });

  it('counts the colours of the result, not of the steps that produced it', () => {
    // The summary claims "256 colours became 32", and the second figure is this one. The first is
    // `SheetFacts.colors`, measured once when the sheet loads rather than again on every settings
    // change — so the two are read off different values and both have to mean what they say.
    const source = upscaleNearest(SPRITE, 8);
    const result = quantiseImage(source, {
      grid: 8,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: { kind: 'MAX_COLORS', maxColors: 32 },
    });

    expect(countColors(source)).toBe(256);
    expect(result.colors).toBe(32);
  });

  it('keys the field before the alignment votes, so sub-cell art cannot dilate into it', () => {
    // The load-bearing claim about the pipeline's *order*, stated as the difference it makes.
    //
    // Without keying, the trinket's cell resolves to the trinket: its sixteen pixels of one colour
    // outvote forty-eight drifting magentas polling one vote each, and a 4 × 4 piece comes back as a
    // full 8 × 8 cell of solid colour — dilated to four times its own area.
    const dilated = quantiseImage(INSET_SHEET, {
      grid: 8,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: null,
    });
    const cells = pixels(dilated.image);

    expect(dilated.offset).toEqual({ x: 6, y: 6 });
    expect(dilated.image.width).toBe(5);
    expect(cells[3]?.[3]).toEqual(TRINKET);
    // The sprite fills its four cells exactly — the offset put the lattice on its own boundaries.
    expect(cells[1]?.[1]).toEqual(ART);
    expect(cells[2]?.[2]).toEqual(ART);

    // Keying first collapses those distinct magentas into one value before the vote is taken, so the
    // field outnumbers the trinket in the cell it dominates. The sprite lands on the 2 × 2 it
    // genuinely fills, and everything else — the trinket's cell included, which the field three
    // quarters covers — is empty.
    const keyed = quantiseImage(INSET_SHEET, {
      grid: 8,
      key: KEYING,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: null,
    });

    expect(pixels(keyed.image)).toEqual([
      [TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT],
      [TRANSPARENT, ART, ART, TRANSPARENT, TRANSPARENT],
      [TRANSPARENT, ART, ART, TRANSPARENT, TRANSPARENT],
      [TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT],
      [TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT, TRANSPARENT],
    ]);
  });

  it('reports the sprites on the keyed result, in the result’s own pixels', () => {
    // The segmentation is read off the finished sheet rather than the source, so the box is stated
    // in drawn pixels — the 2 × 2 the sprite resolved to above, not the 16 × 16 it occupied on the
    // sheet. That is the whole reason it travels back with the result: the studio's target size and
    // the atlas cell are stated in the same unit.
    const result = quantiseImage(INSET_SHEET, {
      grid: 8,
      key: KEYING,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: null,
    });

    expect(result.sprites).toEqual({
      kind: 'SEGMENTED',
      boxes: [{ left: 1, top: 1, width: 2, height: 2, pixels: 4 }],
      specks: 0,
    });
  });

  it('reads a result with nothing transparent on it as SOLID, whatever is drawn on it', () => {
    // Nothing has been keyed, so there is no transparency to separate anything by — and the honest
    // answer is that no sprite was found, rather than one box filling the sheet that the atlas
    // calculator would then compare against a component count.
    const result = quantiseImage(INSET_SHEET, {
      grid: 8,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: null,
    });

    expect(result.sprites).toEqual({ kind: 'SOLID' });
  });

  it('reports the share of the sheet the key removed', () => {
    const result = quantiseImage(INSET_SHEET, {
      grid: 8,
      key: KEYING,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: null,
    });

    // 32 × 32 less the 16 × 16 sprite and the 4 × 4 trinket: 752 of 1024. Both art colours are far
    // outside the fringe threshold, so nothing is eroded off them and the figure is exactly the
    // field.
    expect(result.keyedShare).toBe(752 / 1024);
  });

  it('spends no palette slots on the keyed field, and none on the colours it removed', () => {
    // `colorHistogram` excludes fully transparent pixels, which is why nothing downstream needed
    // changing: the field claims no slots, so a strict budget buys the subject's own colours.
    const result = quantiseImage(INSET_SHEET, {
      grid: 8,
      key: KEYING,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: { kind: 'MAX_COLORS', maxColors: 32 },
    });

    // 64 drifting magentas plus the two art colours went in; one colour survives — the sprite's,
    // since the trinket's cell resolved to the field around it a step earlier.
    expect(countColors(INSET_SHEET)).toBe(66);
    expect(result.colors).toBe(1);
  });

  it('recovers inset art exactly, without the margin being cropped off first', () => {
    // The reported failure this pairs with the ordering test above: a returned sheet's art sits
    // wherever composition put it, and a corner-anchored alignment quantised it at the right scale
    // to the wrong lattice — every cell resolved over a window straddling two of the art's own. The
    // offset is measured from the image, so the margin comes back as its own leading pixel and the
    // art comes back pixel for pixel.
    //
    // **The inset is 3, and it must stay under half the grid.** At an inset past halfway, each
    // corner-anchored cell holds a plurality of the *previous* art cell and the modal vote
    // reconstructs this exact expected output by accident — a mutant with the offset stubbed to the
    // corner passed the first version of this test, which used 5. Below halfway the plurality flips
    // to the art cell the phased lattice names, so only the offset-aware pipeline produces this
    // sheet.
    const margin: Rgba = { r: 250, g: 250, b: 250, a: 255 };
    const inset = imageFrom(131, 131, (x, y) => {
      if (x < 3 || y < 3) return margin;
      const cellX = Math.floor((x - 3) / 8);
      const cellY = Math.floor((y - 3) / 8);
      return readPixel(SPRITE.data, pixelOffset(SPRITE.width, cellX, cellY));
    });

    const result = quantiseImage(inset, {
      grid: 8,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: null,
    });

    expect(result.offset).toEqual({ x: 3, y: 3 });
    expect(result.image.width).toBe(17);
    expect(result.image.height).toBe(17);
    expect(readPixel(result.image.data, pixelOffset(17, 0, 0))).toEqual(margin);
    for (let y = 0; y < 16; y += 1) {
      for (let x = 0; x < 16; x += 1) {
        expect(readPixel(result.image.data, pixelOffset(17, x + 1, y + 1))).toEqual(
          readPixel(SPRITE.data, pixelOffset(SPRITE.width, x, y)),
        );
      }
    }
  });

  it('maps every pixel onto a pinned palette rather than onto colours the image chose', () => {
    // The difference a pinned palette makes, stated as the thing a budget cannot do: 200 arbitrary
    // colours come back as four *named* ones, and every pixel is one of exactly those four.
    const gameBoy = colorPlanFor('GAME_BOY_DMG', 'UNRESTRICTED', null, 0).reduction;
    const result = quantiseImage(TWO_HUNDRED_COLORS, {
      grid: 1,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: gameBoy,
    });

    expect(gameBoy?.kind).toBe('PALETTE');
    const survivors = new Set(pixels(result.image).flat().map(toHex));
    expect([...survivors].sort()).toEqual(['#0F380F', '#306230', '#8BAC0F', '#9BBC0F']);
  });

  it('snaps every channel onto the machine’s ladder for a palette that is a colour space', () => {
    // The other half of a pinned palette, and the one that would look like a no-op if it were only
    // counted: the Mega Drive's 512 colours barely reduce a 200-colour image, but every channel that
    // survives is a value the machine could actually output.
    const megaDrive = colorPlanFor('MEGA_DRIVE', 'UNRESTRICTED', null, 0).reduction;
    const result = quantiseImage(TWO_HUNDRED_COLORS, {
      grid: 1,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: megaDrive,
    });

    expect(megaDrive).toEqual({ kind: 'CHANNEL_DEPTH', bitsPerChannel: 3 });
    const rungs = new Set(channelLevels(3));
    for (const pixel of pixels(result.image).flat()) {
      expect(rungs.has(pixel.r) && rungs.has(pixel.g) && rungs.has(pixel.b)).toBe(true);
    }
  });

  it('lets a pinned palette overrule the colour budget rather than running both', () => {
    // The rule the studio states under the budget control, asserted where it is actually applied. A
    // reduction to 32 followed by a map onto four would be two quantisations, and the first would
    // throw away exactly the colours the second needs to choose between.
    expect(colorPlanFor('GAME_BOY_DMG', 'STRICT_32_COLOR', null, 0).reduction).toEqual({
      kind: 'PALETTE',
      entries: [
        { r: 15, g: 56, b: 15, a: 255 },
        { r: 48, g: 98, b: 48, a: 255 },
        { r: 139, g: 172, b: 15, a: 255 },
        { r: 155, g: 188, b: 15, a: 255 },
      ],
    });
  });

  it('keeps a soft edge under a pinned palette, exactly as it does under a channel one', () => {
    // A machine's palette is a list of *colours*, and none of these machines had an alpha channel at
    // all — so mapping onto one may not decide the sheet's shape. Writing the entry whole would set
    // every anti-aliased or soft-keyed pixel to fully opaque, putting a hard halo of palette colour
    // where the sprite used to fade out. The two kinds of palette have to agree about this, or one
    // sheet keeps its edge on the Mega Drive and loses it on the Game Boy.
    const soft = imageFrom(1, 1, () => ({ r: 20, g: 60, b: 20, a: 128 }));

    for (const palette of ['GAME_BOY_DMG', 'MEGA_DRIVE'] as const) {
      const result = quantiseImage(soft, {
        grid: 1,
        key: null,
        vote: 'DOMINANT',
        lineStrength: 1.5,
        trimStrength: 0,
        inkThreshold: 64,
        fillCleanup: 0,
        cleanupPasses: 1,
        spriteGap: 1,
        symmetry: 'OFF' as const,
        symmetryTolerance: 8,
        symmetryConfidence: 90,
        duplicateTolerance: 0,
        duplicateSnap: false,
        frameAlignment: 'OFF' as const,
        frameDriftTolerance: 0,
        dither: 'NONE' as const,
        outlineExpansion: 0,
        colorMerge: 0,
        reduction: colorPlanFor(palette, 'UNRESTRICTED', null, 0).reduction,
      });
      expect(readPixel(result.image.data, 0).a, `${palette} flattened a soft edge`).toBe(128);
    }
  });

  it('recovers a drifting sheet cleanly, which no fixed lattice at any offset could', () => {
    // The sheet a generator actually returns: block spacings wandering between 6 and 7 with the
    // drift accumulating, and per-pixel wobble inside every block. Under a fixed pitch this
    // quantised to a mess — every cell straddling two of the art's own the further the lattice
    // walked — and it is the reported failure the mesh was built for. Run unreduced, so what is
    // asserted is the mesh and the vote alone: the budget's own merging of similar colours is a
    // different behaviour with its own test below.
    const starts = [0, 6, 12, 19, 25, 31, 38, 44, 51];
    const blockColor = (cell: number): Rgba => ({
      r: (cell * 71 + 40) % 200,
      g: (cell * 149 + 80) % 200,
      b: (cell * 37 + 120) % 200,
      a: 255,
    });
    const cellOf = (position: number): number => {
      let cell = 0;
      for (const [index, start] of starts.entries()) if (position >= start) cell = index;
      return cell;
    };
    const wobble = (x: number, y: number, channel: number) =>
      (((x * 374761393 + y * 668265263 + channel * 69119) >>> 3) % 7) - 3;
    const drifting = imageFrom(57, 57, (x, y) => {
      const base = blockColor(cellOf(y) * 10 + cellOf(x));
      return {
        r: Math.max(0, Math.min(255, base.r + wobble(x, y, 1))),
        g: Math.max(0, Math.min(255, base.g + wobble(x, y, 2))),
        b: Math.max(0, Math.min(255, base.b + wobble(x, y, 3))),
        a: 255,
      };
    });

    const result = quantiseImage(drifting, {
      grid: 6,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: null,
    });

    // One output pixel per drifting cell on each axis, and every interior cell resolves to a colour
    // within the wobble of its own block — no cell inherits a neighbouring block's colour, which is
    // what a fixed lattice's straddling cells did.
    expect(result.image.width).toBe(starts.length);
    expect(result.image.height).toBe(starts.length);
    for (let cellY = 1; cellY < starts.length - 1; cellY += 1) {
      for (let cellX = 1; cellX < starts.length - 1; cellX += 1) {
        const got = readPixel(result.image.data, pixelOffset(result.image.width, cellX, cellY));
        const want = blockColor(cellY * 10 + cellX);
        const error = Math.abs(got.r - want.r) + Math.abs(got.g - want.g) + Math.abs(got.b - want.b);
        expect(error, `cell (${String(cellX)}, ${String(cellY)}) drifted to a neighbour`).toBeLessThanOrEqual(
          9,
        );
      }
    }
  });

  it('collapses a region’s near-shades into one bucket before the vote, killing the speckle', () => {
    // The ordering this pipeline converged on with the tools it follows: reduce first, then vote.
    // On generated art every pixel of a flat region is subtly different, so voting first hands each
    // cell to one arbitrary pixel and two neighbouring cells of the same region pick two subtly
    // different shades — the speckle the reported sheet was covered in. Reduced first, the region's
    // shades become one colour and its cells all vote for the same thing: two clean fields, one
    // colour each, where the old order returned sixteen distinct near-shades.
    const left: Rgba = { r: 40, g: 80, b: 120, a: 255 };
    const right: Rgba = { r: 200, g: 60, b: 20, a: 255 };
    const wobble = (x: number, y: number, channel: number) =>
      (((x * 374761393 + y * 668265263 + channel * 69119) >>> 3) % 7) - 3;
    const noisy = imageFrom(24, 24, (x, y) => {
      const base = x < 12 ? left : right;
      return {
        r: Math.max(0, Math.min(255, base.r + wobble(x, y, 1))),
        g: Math.max(0, Math.min(255, base.g + wobble(x, y, 2))),
        b: Math.max(0, Math.min(255, base.b + wobble(x, y, 3))),
        a: 255,
      };
    });

    const result = quantiseImage(noisy, {
      grid: 6,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: { kind: 'MAX_COLORS', maxColors: 2 },
    });

    expect(result.colors).toBe(2);
    const cells = pixels(result.image);
    for (const row of cells) {
      // Every cell of a side is the same colour as the rest of its side — the claim speckle breaks.
      expect(row[1]).toEqual(row[0]);
      expect(row[3]).toEqual(row[2]);
    }
    // And the two buckets are the two regions, not two shades of one: each rep is a real image
    // colour within the wobble of its own side's base.
    const first = cells[0]?.[0];
    const last = cells[0]?.[3];
    if (first === undefined || last === undefined) throw new Error('cells missing');
    expect(
      Math.abs(first.r - left.r) + Math.abs(first.g - left.g) + Math.abs(first.b - left.b),
    ).toBeLessThanOrEqual(9);
    expect(
      Math.abs(last.r - right.r) + Math.abs(last.g - right.g) + Math.abs(last.b - right.b),
    ).toBeLessThanOrEqual(9);
  });

  it('votes by area once the colours are buckets, not by whichever pixel holds the centre', () => {
    // The one place the reduce-before-vote ordering is *observable*, pinned so it cannot silently
    // revert: a cell whose area majority and centre pixel disagree. Voted raw, this cell's wobbled
    // pixels are all distinct, the tie-break hands it to the pixel nearest the centre — a B pixel —
    // and reducing afterwards keeps that wrong answer. Reduced first, A's twenty-four pixels and
    // B's twelve become two buckets and the majority wins. The far-apart regions of the speckle
    // test above cannot tell the orders apart, because a later reduction maps each cell's raw
    // winner to the same bucket the early one would have — this fixture is the discriminator.
    const A: Rgba = { r: 20, g: 200, b: 40, a: 255 };
    const B: Rgba = { r: 230, g: 40, b: 220, a: 255 };
    // A crisp regular grid-6 sheet of distinct blocks, whose boundaries anchor the mesh exactly —
    // so the one special cell cannot pull a cut onto its own interior stripes. That cell, at
    // (1, 1), is columns [A, A, B, B, A, A], and every one of its 36 pixels wears a provably
    // distinct wobble — (i mod 6, ⌊i / 6⌋) is injective over the cell — so the raw vote is a
    // 36-way tie with nothing but the centre tie-break to settle it. A hashed wobble collided,
    // handed A an honest two-vote plurality, and quietly made the orders agree.
    const sheet = imageFrom(24, 24, (x, y) => {
      const cellX = Math.floor(x / 6);
      const cellY = Math.floor(y / 6);
      if (cellX === 1 && cellY === 1) {
        const within = x - 6;
        const base = within >= 2 && within < 4 ? B : A;
        const i = (y - 6) * 6 + within;
        return { r: base.r + (i % 6) - 2, g: base.g + Math.floor(i / 6) - 2, b: base.b, a: 255 };
      }
      const index = cellY * 4 + cellX;
      return { r: index * 16 + 8, g: 255 - index * 12, b: 128, a: 255 };
    });

    // 17 exactly — the fifteen crisp block colours plus the two wobbled clouds — so the reduction
    // stops with each cloud held in one box: its next split would have to carve a cloud in two, and
    // a majority split across sub-buckets is how a generous budget lets the minority win after all.
    const result = quantiseImage(sheet, {
      grid: 6,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: { kind: 'MAX_COLORS', maxColors: 17 },
    });

    const cell = readPixel(result.image.data, pixelOffset(result.image.width, 1, 1));
    const errorToA = Math.abs(cell.r - A.r) + Math.abs(cell.g - A.g) + Math.abs(cell.b - A.b);
    expect(errorToA, 'the majority colour lost its own cell').toBeLessThanOrEqual(9);
  });

  it('leaves every pixel where it is when keying is off', () => {
    // The regression guard for a pass inserted at the front of an existing transform: a sheet that is
    // *entirely* the key colour comes back untouched, and the share is zero rather than unreported.
    const field = imageFrom(4, 4, () => MAGENTA);

    const result = quantiseImage(field, {
      grid: 1,
      key: null,
      vote: 'DOMINANT',
      lineStrength: 1.5,
      trimStrength: 0,
      inkThreshold: 64,
      fillCleanup: 0,
      cleanupPasses: 1,
      spriteGap: 1,
      symmetry: 'OFF' as const,
      symmetryTolerance: 8,
      symmetryConfidence: 90,
      duplicateTolerance: 0,
      duplicateSnap: false,
      frameAlignment: 'OFF' as const,
      frameDriftTolerance: 0,
      dither: 'NONE' as const,
      outlineExpansion: 0,
      colorMerge: 0,
      reduction: null,
    });

    expect(channels(result.image)).toEqual(channels(field));
    expect(result.keyedShare).toBe(0);
  });

  it('never rewrites the sheet it was handed, and answers the same settings identically', () => {
    // The worker keeps one copy of the sheet and runs every settings change against it — see
    // `quantiseWorker.ts` — so purity here is the design's load-bearing assumption, not a style
    // point. A pass that wrote into its input would corrupt the held sheet, every later transform
    // would start from the damage, and the preview would drift further from the source on each
    // dial change while every run of this suite on a fresh image still passed.
    //
    // **The keyless arm is the sharper half of the mutation claim.** Keying copies the sheet
    // before anything else runs, so with a key in force only `keyBackground` ever holds the
    // caller's buffer — with no key, `source` *is* the handed sheet, and the mesh, every reading
    // and a dominant-side reduction read it directly. That is the whole exposure: the merge and
    // the cleanup only ever receive intermediates, so no setting can hand them the caller's
    // buffer. Every dial still sits past its off gate so no pass is skipped, but what a pass's
    // deeper arms do on a busier sheet is each pass's own suite's business — this test holds the
    // two facts about the *composition*, on both sides of the keying fork.
    const before = channels(INSET_SHEET);

    for (const key of [KEYING, null]) {
      for (const vote of VOTE_METHODS) {
        const settings = {
          grid: 8,
          key,
          vote,
          lineStrength: 1.5,
          trimStrength: 0.5,
          inkThreshold: 64,
          fillCleanup: 8,
          cleanupPasses: 2,
          spriteGap: 1,
          symmetry: 'OFF' as const,
          symmetryTolerance: 8,
          symmetryConfidence: 90,
          duplicateTolerance: 0,
          duplicateSnap: false,
          frameAlignment: 'OFF' as const,
          frameDriftTolerance: 0,
          dither: 'NONE' as const,
          outlineExpansion: 0,
          colorMerge: 8,
          reduction: { kind: 'MAX_COLORS', maxColors: 8 } as const,
        };
        const arm = `the ${key === null ? 'unkeyed' : 'keyed'} ${vote} pipeline`;

        const first = quantiseImage(INSET_SHEET, settings);
        expect(channels(INSET_SHEET), `${arm} rewrote its input`).toEqual(before);

        const again = quantiseImage(INSET_SHEET, settings);
        expect(channels(again.image), `${arm} answered the same settings differently`).toEqual(
          channels(first.image),
        );
        expect(again.colors).toBe(first.colors);
        expect(again.offset).toEqual(first.offset);
        expect(again.keyedShare).toBe(first.keyedShare);
      }
    }
  });
});

/**
 * A palette locked off an earlier sheet, in the pipeline.
 *
 * Two claims that can only be made here rather than in `lockedPalette.test.ts`: that the lock is the
 * palette step for *every* reading — the dominant vote runs it before the cells are resolved and the
 * two averaging readings run it after — and that the sheet-wide colour merge stands aside for it, as
 * it already does for a pinned palette. The second is a rule about two passes and is therefore
 * invisible to a test of either one.
 */
describe('quantiseImage — a locked palette', () => {
  const ENTRIES: readonly Rgba[] = [
    { r: 12, g: 14, b: 18, a: 255 },
    { r: 200, g: 100, b: 50, a: 255 },
    { r: 40, g: 160, b: 60, a: 255 },
  ];

  /** 60 pixels, every one a small drift off one of the three entries — the next sheet in a series. */
  const DRIFTED = imageFrom(20, 3, (x, y) => {
    const entry = ENTRIES[y] ?? ENTRIES[0];
    if (entry === undefined) throw new Error('the fixture needs its entries.');
    const nudge = (x % 5) - 2;
    return { r: entry.r + nudge, g: entry.g - nudge, b: entry.b + nudge, a: 255 };
  });

  const settingsFor = (vote: (typeof VOTE_METHODS)[number], colorMerge: number) => ({
    grid: 1,
    key: null,
    vote,
    lineStrength: 1.5,
    trimStrength: 0,
    inkThreshold: 64,
    fillCleanup: 0,
    cleanupPasses: 1,
    spriteGap: 1,
    symmetry: 'OFF' as const,
    symmetryTolerance: 8,
    symmetryConfidence: 90,
    duplicateTolerance: 0,
    duplicateSnap: false,
    frameAlignment: 'OFF' as const,
    frameDriftTolerance: 0,
    dither: 'NONE' as const,
    outlineExpansion: 0,
    colorMerge,
    reduction: { kind: 'LOCKED', entries: ENTRIES, snap: 20 } as const,
  });

  it.each(VOTE_METHODS)('draws %s in the locked colours, whichever side of the vote it runs on', (vote) => {
    const result = quantiseImage(DRIFTED, settingsFor(vote, 0));

    const allowed = new Set(ENTRIES.map(toHex));
    for (const color of new Set(pixels(result.image).flat().map(toHex))) {
      expect(allowed.has(color), `${color} is not a locked colour`).toBe(true);
    }
  });

  it('leaves the sheet-wide merge off, so a dial cannot fold two locked colours into one', () => {
    // A merge wide enough to fold the whole palette into its most-used entry. With a lock in force
    // the pass does not run at all, which is what stops a cleanup dial editing the palette the rest
    // of the series is mapped onto — the same exemption a pinned palette has.
    const merged = quantiseImage(DRIFTED, settingsFor('DOMINANT', 48));
    const unmerged = quantiseImage(DRIFTED, settingsFor('DOMINANT', 0));

    expect(channels(merged.image)).toEqual(channels(unmerged.image));
    expect(merged.colors).toBe(3);
  });

  it('carries a colour the locked sheet never held through the whole pipeline', () => {
    // The escape, end to end: the gem is 53 from its nearest entry, well outside a snap distance of
    // 20, so it reaches the result as itself while every drifted pixel around it is taken.
    const gem: Rgba = { r: 34, g: 211, b: 238, a: 255 };
    const withGem = imageFrom(DRIFTED.width, DRIFTED.height, (x, y) =>
      x === 0 && y === 0 ? gem : readPixel(DRIFTED.data, pixelOffset(DRIFTED.width, x, y)),
    );

    const result = quantiseImage(withGem, settingsFor('DOMINANT', 0));

    expect(readPixel(result.image.data, 0)).toEqual(gem);
    expect(result.colors).toBe(4);
  });
});

/**
 * The ordering rule a dither imposes on the whole pipeline, which is where it lives rather than in
 * any one pass: the palette step moves to the very end, and the two speckle passes move ahead of it.
 *
 * `ditherImage` has its own suite for what the pass *does*. This is about where it sits, which is a
 * fact about the composition and therefore invisible to a test of either half.
 */
describe('quantiseImage — a dither', () => {
  /** A flat mid grey at a grid of 2, which a two-colour palette cannot hold and must spread. */
  const FLAT = imageFrom(32, 32, () => ({ r: 128, g: 128, b: 128, a: 255 }));
  const TWO_TONE = {
    kind: 'PALETTE',
    entries: [
      { r: 0, g: 0, b: 0, a: 255 },
      { r: 255, g: 255, b: 255, a: 255 },
    ],
  } as const;

  const settingsFor = (dither: 'NONE' | 'BAYER_4', reduction: typeof TWO_TONE | null, cleanup: number) => ({
    grid: 2,
    key: null,
    vote: 'DOMINANT' as const,
    lineStrength: 1.5,
    trimStrength: 0,
    inkThreshold: 64,
    fillCleanup: cleanup,
    cleanupPasses: 4,
    spriteGap: 1,
    symmetry: 'OFF' as const,
    symmetryTolerance: 8,
    symmetryConfidence: 90,
    duplicateTolerance: 0,
    duplicateSnap: false,
    frameAlignment: 'OFF' as const,
    frameDriftTolerance: 0,
    colorMerge: cleanup,
    outlineExpansion: 0,
    dither,
    reduction,
  });

  it('spreads a colour the palette cannot hold, where the flat step could only round it', () => {
    expect(quantiseImage(FLAT, settingsFor('NONE', TWO_TONE, 0)).colors).toBe(1);
    expect(quantiseImage(FLAT, settingsFor('BAYER_4', TWO_TONE, 0)).colors).toBe(2);
  });

  it('runs after the merge and the cleanup, so neither can take the pattern back out', () => {
    // Both dials at their ceiling and every pass allowed to settle. Ahead of the dither they see the
    // reading's own output, which is one flat colour and nothing to do; behind it they would find a
    // sheet made entirely of lone dissenting pixels between two colours a whole tonal range apart,
    // and the fill cleanup would put every one of them back.
    const result = quantiseImage(FLAT, settingsFor('BAYER_4', TWO_TONE, 48));
    expect(result.colors).toBe(2);
  });

  it('does nothing at all with no palette to dither against', () => {
    // The control is withdrawn in that state rather than shown doing nothing — see
    // `DownscaleControls` — but the pipeline may not depend on a panel to stay correct.
    const off = quantiseImage(FLAT, settingsFor('NONE', null, 0));
    const on = quantiseImage(FLAT, settingsFor('BAYER_4', null, 0));
    expect(channels(on.image)).toEqual(channels(off.image));
  });

  it('lays the pattern at the resolution the sheet came out at, not the one it went in at', () => {
    // The reason the palette step had to move rather than the pattern being laid earlier: at a grid
    // of 4 a 4 × 4 tile fits inside a single cell, so a pattern laid on the source would be one the
    // modal vote resolves straight back to one colour. Laid on the reading's output it survives,
    // which is what these two assertions separate.
    const coarse = imageFrom(32, 32, () => ({ r: 128, g: 128, b: 128, a: 255 }));
    const result = quantiseImage(coarse, { ...settingsFor('BAYER_4', TWO_TONE, 0), grid: 4 });
    expect(result.image.width).toBe(8);
    expect(result.colors).toBe(2);
  });
});

/**
 * A 24 × 8 sheet at its own resolution, holding two keyed-apart subjects six columns wide.
 *
 * The left one mirrors exactly about its own seam. The right one is the same figure with one pixel
 * knocked out of its left edge, so it is very nearly symmetric — the break in a contour a generator
 * returns, and the case the snap exists for. Two subjects rather than one, so a test can watch a
 * pass reach one of them and leave the other where it was.
 */
const PAIR = imageFrom(24, 8, (x, y) => {
  if (y < 2 || y >= 6) return TRANSPARENT;
  if (x >= 2 && x < 8) return x === 2 || x === 7 ? EDGE : FILL;
  if (x >= 14 && x < 20) {
    if (x === 14 && y === 3) return FILL;
    return x === 14 || x === 19 ? EDGE : FILL;
  }
  return TRANSPARENT;
});

/**
 * A 12 × 8 sheet holding one subject whose two halves are joined by a single pixel on one side only.
 *
 * Rows 2–5 carry two 4-wide blocks at columns 1–4 and 7–10, and row 3 carries one extra pixel at
 * column 5 bridging them. Its mirror at column 6 is empty and the bridge pixel has no neighbour of
 * its own colour inside the sprite, so the snap settles that pair on the empty side — which parts
 * the sprite in two. The one fixture that can tell a segmentation taken after the snap from one
 * carried over.
 */
const BRIDGED = imageFrom(12, 8, (x, y) => {
  if (y < 2 || y >= 6) return TRANSPARENT;
  if (x >= 1 && x < 5) return FILL;
  if (x >= 7 && x < 11) return FILL;
  return x === 5 && y === 3 ? FILL : TRANSPARENT;
});

/** What {@link BRIDGED} segments into before the snap parts it — one box over both blocks. */
const BRIDGED_BOX = { left: 1, top: 2, width: 10, height: 4, pixels: 33 };

/** One subject that mirrors exactly, so a snap admits it and finds nothing in it to change. */
const SYMMETRIC = imageFrom(12, 8, (x, y) =>
  y >= 2 && y < 6 && x >= 3 && x < 9 ? (x === 3 || x === 8 ? EDGE : FILL) : TRANSPARENT,
);

/** The settings the symmetry fixtures share — a grid of 1, no keying, and nothing else engaged. */
function symmetrySettings(symmetry: 'OFF' | 'CHECK' | 'SNAP', symmetryConfidence = 90): QuantiseSettings {
  return {
    grid: 1,
    key: null,
    vote: 'DOMINANT',
    lineStrength: 1.5,
    trimStrength: 0,
    inkThreshold: 64,
    fillCleanup: 0,
    cleanupPasses: 1,
    spriteGap: 1,
    symmetry,
    symmetryTolerance: 0,
    symmetryConfidence,
    duplicateTolerance: 0,
    duplicateSnap: false,
    frameAlignment: 'OFF' as const,
    frameDriftTolerance: 0,
    dither: 'NONE',
    outlineExpansion: 0,
    colorMerge: 0,
    reduction: null,
  };
}

describe('quantiseImage symmetry', () => {
  it('reports no symmetry at all while the control is off', () => {
    // `null` rather than an empty array, and the difference is what the panel reads: nothing was
    // asked, as against nothing was found.
    expect(quantiseImage(PAIR, symmetrySettings('OFF')).symmetry).toBeNull();
  });

  it('scores every sprite it found and changes no pixel under CHECK', () => {
    const checked = quantiseImage(PAIR, symmetrySettings('CHECK'));
    const untouched = quantiseImage(PAIR, symmetrySettings('OFF'));

    expect(checked.symmetry?.map((reading) => reading.axis)).toEqual([4.5, 16.5]);
    expect(checked.symmetry?.map((reading) => reading.confidence)).toEqual([1, 11 / 12]);
    expect(checked.symmetry?.every((reading) => !reading.snapped)).toBe(true);
    expect(channels(checked.image)).toEqual(channels(untouched.image));
  });

  it('settles the sprites that reach the floor and leaves the rest as they arrived', () => {
    // The floor at 90% admits the drifted subject, and the broken edge pixel is restored from its
    // partner rather than the partner being broken to match it — the intact side has the rest of
    // that edge above and below it, and the broken side does not.
    const snapped = quantiseImage(PAIR, symmetrySettings('SNAP', 90));

    expect(snapped.symmetry?.map((reading) => reading.snapped)).toEqual([true, true]);
    expect(readPixel(snapped.image.data, pixelOffset(24, 14, 3))).toEqual(EDGE);
    expect(readPixel(snapped.image.data, pixelOffset(24, 19, 3))).toEqual(EDGE);
  });

  it('leaves a sprite the floor refused exactly as it arrived', () => {
    // The same sheet with the floor above the drifted subject's own share. It is still reported —
    // which is the point of reporting separately from snapping — and not one pixel of it moves.
    const refused = quantiseImage(PAIR, symmetrySettings('SNAP', 95));
    const untouched = quantiseImage(PAIR, symmetrySettings('OFF'));

    expect(refused.symmetry?.map((reading) => reading.snapped)).toEqual([true, false]);
    expect(channels(refused.image)).toEqual(channels(untouched.image));
  });

  it('measures what the snap cost, and counts the colours the snap left', () => {
    // Every figure on the result describes the sheet the reader is looking at, so all of them are
    // taken after the snap rather than before it. The drifted pixel becomes the edge colour, so the
    // difference map has something to report where the untouched result reported nothing.
    const snapped = quantiseImage(PAIR, symmetrySettings('SNAP', 90));
    const untouched = quantiseImage(PAIR, symmetrySettings('OFF'));

    expect(snapped.difference.peak).toBeGreaterThan(untouched.difference.peak);
    expect(snapped.image.width).toBe(untouched.image.width);
  });

  it('re-reads the sprites off the sheet the snap produced, when the snap split one', () => {
    // The case the re-segmentation exists for, and the only one that can tell it apart from carrying
    // the old answer over: the snap clears the pixel that was holding two halves of a sprite
    // together, so what was one region becomes two. A segmentation taken before the snap would
    // report one box for a sheet that now holds two.
    const before = quantiseImage(BRIDGED, symmetrySettings('CHECK'));
    const after = quantiseImage(BRIDGED, symmetrySettings('SNAP', 50));

    expect(before.sprites).toEqual({ kind: 'SEGMENTED', boxes: [BRIDGED_BOX], specks: 0 });
    expect(after.sprites.kind).toBe('SEGMENTED');
    expect(after.sprites).not.toEqual(before.sprites);
    expect(after.sprites).toEqual(spriteSegments(after.image, 1));
  });

  it('leaves the sheet and its reading alone where a qualifying sprite had nothing to settle', () => {
    // A sprite that already mirrors exactly passes any floor and gives the snap nothing to do. The
    // copy it would otherwise hand back is a copy with no edit in it, and the second segmentation
    // paid for it would arrive at the boxes already in hand.
    const settled = quantiseImage(SYMMETRIC, symmetrySettings('SNAP', 50));
    const untouched = quantiseImage(SYMMETRIC, symmetrySettings('OFF'));

    expect(settled.symmetry?.map((reading) => reading.snapped)).toEqual([true]);
    expect(channels(settled.image)).toEqual(channels(untouched.image));
    expect(settled.sprites).toEqual(untouched.sprites);
  });

  it('does not claim to have settled a sprite that has no mirrored pair at all', () => {
    // One column wide — a pole, a spear, a rope. It is symmetric about its own column and there is
    // nothing there to rewrite, so marking it would cost a copy of the sheet and a second
    // segmentation to change no pixel, and the panel would print "settled" on a row where nothing
    // was.
    const pole = imageFrom(9, 8, (x, y) => (x === 4 && y >= 2 && y < 6 ? FILL : TRANSPARENT));

    const read = quantiseImage(pole, symmetrySettings('SNAP', 50));

    expect(read.symmetry?.map((reading) => reading.box.width)).toEqual([1]);
    expect(read.symmetry?.map((reading) => reading.confidence)).toEqual([1]);
    expect(read.symmetry?.map((reading) => reading.snapped)).toEqual([false]);
  });

  it('has nothing to score on a sheet that did not separate into sprites', () => {
    // An empty array rather than `null`: the pass ran and found no sprite to measure, which is a
    // fact about the keying rather than about symmetry — and the panel says so.
    const solid = quantiseImage(SPRITE, symmetrySettings('CHECK'));

    expect(solid.sprites.kind).toBe('SOLID');
    expect(solid.symmetry).toEqual([]);
  });
});

/**
 * The duplicate reading, and the fold it feeds, inside the pipeline.
 *
 * The reading itself is pinned in `duplicateSprites.test.ts` and the block copy in
 * `snapDuplicates.test.ts`. What only this level can establish is the ordering the whole feature
 * rests on: that the reading runs on the finished sheet whether or not the fold does, that the fold
 * lands *before* the colour count and the difference map are taken, and that the finding handed back
 * describes the sheet the reading was taken from rather than the one the fold produced.
 */
describe('quantiseImage — duplicate sprites', () => {
  const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };
  const INK: Rgba = { r: 20, g: 30, b: 40, a: 255 };
  const SPOT: Rgba = { r: 26, g: 36, b: 46, a: 255 };

  /**
   * Two 4 × 4 blocks a clear gutter apart, the second carrying one cell of a slightly different ink.
   *
   * Keying is off and the sheet arrives with its own alpha, which is the state a sheet this app
   * downloaded earlier comes back in — so the segmentation runs on what the file already says is
   * transparent, exactly as `spriteSegments` describes.
   */
  const PAIR = imageFrom(20, 8, (x, y) => {
    if (y < 2 || y >= 6) return CLEAR;
    if (x >= 2 && x < 6) return INK;
    if (x >= 12 && x < 16) return x === 12 && y === 2 ? SPOT : INK;
    return CLEAR;
  });

  const settingsFor = (duplicateTolerance: number, duplicateSnap: boolean) => ({
    grid: 1,
    key: null,
    vote: 'DOMINANT' as const,
    outlineExpansion: 0,
    lineStrength: 1.5,
    trimStrength: 0,
    inkThreshold: 64,
    fillCleanup: 0,
    colorMerge: 0,
    cleanupPasses: 1,
    dither: 'NONE' as const,
    spriteGap: 0,
    symmetry: 'OFF' as const,
    symmetryTolerance: 8,
    symmetryConfidence: 90,
    duplicateTolerance,
    duplicateSnap,
    frameAlignment: 'OFF' as const,
    frameDriftTolerance: 0,
    reduction: null,
  });

  it('reports the finding whether or not the fold is asked for', () => {
    const read = quantiseImage(PAIR, settingsFor(24, false));
    const folded = quantiseImage(PAIR, settingsFor(24, true));

    expect(read.duplicates).toHaveLength(1);
    expect(folded.duplicates).toEqual(read.duplicates);
  });

  it('changes no pixel while only the tolerance is moved', () => {
    // The half of this feature that is a reading. A dial that quietly edited the sheet on the way to
    // producing a count would be the one thing its guidance promises it does not do.
    const off = quantiseImage(PAIR, settingsFor(0, false));
    const on = quantiseImage(PAIR, settingsFor(24, false));

    expect(channels(on.image)).toEqual(channels(off.image));
    expect(off.duplicates).toEqual([]);
    expect(on.duplicates).toHaveLength(1);
  });

  it('folds the repeats into the delivered image when the snap is on', () => {
    const folded = quantiseImage(PAIR, settingsFor(24, true));

    expect(folded.snapped).toBe(true);
    // The spot that told the two sprites apart is gone, so the sheet is down to one ink.
    expect(folded.colors).toBe(1);
  });

  it('counts the colours of the folded sheet, not of the one the reading was taken from', () => {
    // The ordering claim in one assertion: the fold has to land before the colour count, or the
    // figure beside the preview describes a sheet the reader was never shown.
    const read = quantiseImage(PAIR, settingsFor(24, false));
    const folded = quantiseImage(PAIR, settingsFor(24, true));

    expect(read.colors).toBe(2);
    expect(folded.colors).toBe(1);
  });

  it('re-reads the sprite bounds off the folded sheet, and finds the same ones', () => {
    // Every member has the canonical's extent, so the block copied into it keeps its box tight.
    // Only the pixel counts move — and here they do not, since both blocks were already solid.
    const read = quantiseImage(PAIR, settingsFor(24, false));
    const folded = quantiseImage(PAIR, settingsFor(24, true));

    expect(folded.sprites).toEqual(read.sprites);
  });

  it('reports nothing folded where the snap has nothing to act on', () => {
    // The dial is on and the tolerance reaches nothing, which is a state the panel has to be able to
    // describe honestly — a snap that folded nothing has changed nothing.
    const result = quantiseImage(PAIR, settingsFor(0, true));

    expect(result.duplicates).toEqual([]);
    expect(result.snapped).toBe(false);
    expect(channels(result.image)).toEqual(channels(quantiseImage(PAIR, settingsFor(0, false)).image));
  });

  it('reports no duplicates on a sheet that did not segment', () => {
    // A fully opaque sheet is `SOLID`, which carries no boxes — so there is nothing to compare, and
    // the honest answer is an empty finding rather than one group covering the raster.
    const solid = imageFrom(8, 8, () => INK);

    const result = quantiseImage(solid, settingsFor(24, true));

    expect(result.sprites.kind).toBe('SOLID');
    expect(result.duplicates).toEqual([]);
    expect(result.snapped).toBe(false);
  });

  it('measures the difference map against the sheet the reader is given', () => {
    // The fold is part of what the pipeline cost, so a heatmap taken before it would report a
    // faithful sprite the reader can see has been replaced. At a grid of 1 with no reduction the
    // unfolded pass is the source exactly, so its peak is zero — and the folded pass is not, by the
    // one cell the fold overwrote. A map measured on the wrong side would give the same figure twice.
    const read = quantiseImage(PAIR, settingsFor(24, false));
    const folded = quantiseImage(PAIR, settingsFor(24, true));

    expect(read.difference.peak).toBe(0);
    expect(folded.difference.peak).toBeGreaterThan(0);
  });
});

/**
 * The frame-alignment pass, in the pipeline.
 *
 * Two claims that can only be made here rather than in `frameAlignment.test.ts`: that the reading is
 * taken over the sheet as it will actually be downloaded — after the settle and the fold, both of
 * which can move a silhouette — and that a move is reflected in every figure the result carries,
 * because the segmentation is re-read from what the move produced.
 */
describe('quantiseImage frame alignment', () => {
  /**
   * A row of three 4 × 4 blocks whose middle one sits two pixels right of the pitch the outer two
   * keep to. Keying is off and the sheet arrives with its own alpha, which is the state a sheet this
   * app downloaded earlier comes back in.
   */
  const DRIFTED = imageFrom(40, 10, (x, y) => {
    if (y < 3 || y >= 7) return TRANSPARENT;
    return [2, 16, 26].some((left) => x >= left && x < left + 4) ? ART : TRANSPARENT;
  });

  const settingsFor = (
    frameAlignment: 'OFF' | 'CHECK' | 'SNAP',
    frameDriftTolerance: number,
  ): QuantiseSettings => ({
    grid: 1,
    key: null,
    vote: 'DOMINANT' as const,
    outlineExpansion: 0,
    lineStrength: 1.5,
    trimStrength: 0,
    inkThreshold: 64,
    fillCleanup: 0,
    colorMerge: 0,
    cleanupPasses: 1,
    dither: 'NONE' as const,
    spriteGap: 1,
    symmetry: 'OFF' as const,
    symmetryTolerance: 8,
    symmetryConfidence: 90,
    duplicateTolerance: 0,
    duplicateSnap: false,
    frameAlignment,
    frameDriftTolerance,
    reduction: null,
  });

  it('reports nothing at all while the pass is off', () => {
    // `null` is the control's OFF position and nothing else — an empty array would say the pass ran
    // and found no row, which is a different statement the panel has its own paragraph for.
    const result = quantiseImage(DRIFTED, settingsFor('OFF', 0));

    expect(result.strips).toBeNull();
  });

  it('names the frame that wandered without changing a pixel under CHECK', () => {
    const read = quantiseImage(DRIFTED, settingsFor('CHECK', 0));
    const off = quantiseImage(DRIFTED, settingsFor('OFF', 0));

    expect(read.strips?.[0]?.frames.map((frame) => frame.drift.x)).toEqual([0, 2, 0]);
    expect(read.strips?.[0]?.frames.map((frame) => frame.snapped)).toEqual([false, false, false]);
    expect(channels(read.image)).toEqual(channels(off.image));
  });

  it('carries the frame onto its slot under SNAP, and re-reads the sheet from what that produced', () => {
    const moved = quantiseImage(DRIFTED, settingsFor('SNAP', 0));

    // The reading still describes the sheet as it stood *before* the move, which is the only state
    // the figures mean anything in — re-measuring afterwards would report a row that was always
    // aligned and lose the record of what the dial did.
    expect(moved.strips?.[0]?.frames.map((frame) => frame.drift.x)).toEqual([0, 2, 0]);
    expect(moved.strips?.[0]?.frames[1]?.snapped).toBe(true);
    // And the segmentation beside it describes the sheet the reader is given.
    const boxes = moved.sprites.kind === 'SEGMENTED' ? moved.sprites.boxes : [];
    expect(boxes.map((box) => box.left)).toEqual([2, 14, 26]);
  });

  it('leaves a frame inside the tolerance where it is', () => {
    const held = quantiseImage(DRIFTED, settingsFor('SNAP', 2));
    const read = quantiseImage(DRIFTED, settingsFor('CHECK', 0));

    expect(held.strips?.[0]?.frames.map((frame) => frame.snapped)).toEqual([false, false, false]);
    expect(channels(held.image)).toEqual(channels(read.image));
  });

  it('has nothing to read on a sheet that did not segment', () => {
    // A fully opaque sheet is `SOLID`, which carries no boxes — so there is no row to fit a spacing
    // to, and the honest answer is that the pass ran and found no strip.
    const solid = imageFrom(8, 8, () => ART);

    const result = quantiseImage(solid, settingsFor('SNAP', 0));

    expect(result.sprites.kind).toBe('SOLID');
    expect(result.strips).toEqual([]);
  });

  it('measures the difference map against the sheet the reader is given', () => {
    // The move is part of what the pipeline did, so a heatmap taken before it would report a sheet
    // the reader can see has changed. At a grid of 1 with no reduction the unmoved pass is the
    // source exactly, so its peak is zero — and the moved pass is not.
    expect(quantiseImage(DRIFTED, settingsFor('CHECK', 0)).difference.peak).toBe(0);
    expect(quantiseImage(DRIFTED, settingsFor('SNAP', 0)).difference.peak).toBeGreaterThan(0);
  });
});
