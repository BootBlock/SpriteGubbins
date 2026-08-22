import { describe, expect, it } from 'vitest';
import { antiAlias, type AntiAliasSettings } from './antiAlias.ts';
import { coverageBlend } from './coverageBlend.ts';
import { CLAIM_ABOVE, CLAIM_BELOW, CLAIM_LEFT, CLAIM_PRECISION, edgeClaims } from './edgeClaims.ts';
import {
  CHANNELS_PER_PIXEL,
  FULLY_OPAQUE,
  FULLY_TRANSPARENT,
  countColors,
  createImage,
  readPixel,
} from './imageData.ts';
import type { Rgba } from '../types/quantiser.ts';

const INK: Rgba = { r: 20, g: 20, b: 20, a: FULLY_OPAQUE };
const PAPER: Rgba = { r: 235, g: 235, b: 235, a: FULLY_OPAQUE };
const MID: Rgba = { r: 128, g: 128, b: 128, a: FULLY_OPAQUE };
const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };

function imageFrom(width: number, height: number, at: (x: number, y: number) => Rgba): ImageData {
  const image = createImage(width, height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const color = at(x, y);
      const offset = (y * width + x) * CHANNELS_PER_PIXEL;
      image.data[offset] = color.r;
      image.data[offset + 1] = color.g;
      image.data[offset + 2] = color.b;
      image.data[offset + 3] = color.a;
    }
  }
  return image;
}

/** The `stepped` fixture `edgeClaims.test.ts` derives its claims from — one contour, one step. */
const stepped = (top: Rgba, bottom: Rgba): ImageData =>
  imageFrom(12, 6, (x, y) => (y < (x < 6 ? 2 : 3) ? top : bottom));

/**
 * The shapes the exact-blend sweep below is run over — one contour of each kind the reconstruction
 * has a different answer for.
 *
 * A single step exercises a run terminated at one end; a hairline puts two contours a pixel apart,
 * so the two runs compete for the same pixels; a right angle is where a horizontal claim and a
 * vertical one meet; and a disc is a contour whose run lengths change continuously along it.
 */
const SHAPES: Readonly<Record<string, ImageData>> = {
  step: stepped(PAPER, INK),
  hairline: imageFrom(16, 10, (x, y) => (y === 6 - Math.floor(x / 4) ? INK : PAPER)),
  corner: imageFrom(16, 12, (x, y) => (y >= 8 && x >= 8 ? INK : PAPER)),
  disc: imageFrom(24, 24, (x, y) => ((x - 12) ** 2 + (y - 12) ** 2 < 64 ? INK : PAPER)),
};

const SETTINGS: AntiAliasSettings = {
  mode: 'BOTH',
  threshold: 24,
  strength: 1,
  shortestRun: 2,
  snap: false,
};

const at = (image: ImageData, x: number, y: number): Rgba =>
  readPixel(image.data, (y * image.width + x) * CHANNELS_PER_PIXEL);

/** The claimed neighbour's offset from the claiming pixel — the mapping `antiAlias` applies. */
const step = (side: number, width: number): number => {
  if (side === CLAIM_ABOVE) return -width;
  if (side === CLAIM_BELOW) return width;
  return side === CLAIM_LEFT ? -1 : 1;
};

describe('antiAlias', () => {
  it('hands the sheet straight back with the pass off', () => {
    const source = stepped(PAPER, INK);
    expect(antiAlias(source, { ...SETTINGS, mode: 'OFF' })).toBe(source);
  });

  it('hands the sheet straight back where nothing was claimed', () => {
    // By reference, not by value: `quantiseImage` compares identities to decide whether the
    // segmentation has to be re-read, and a copy would cost a linear pass over the whole sheet on
    // every transform a reader never asked to soften.
    const flat = imageFrom(12, 6, () => PAPER);
    expect(antiAlias(flat, SETTINGS)).toBe(flat);
    // A contour every claim is refused on — the 45° staircase — takes the same path.
    const diagonal = imageFrom(12, 12, (x, y) => (y < x ? PAPER : INK));
    expect(antiAlias(diagonal, SETTINGS)).toBe(diagonal);
  });

  it('writes exactly the blend each claim describes, and leaves every other pixel alone', () => {
    // The pass's whole contract, asserted pixel by pixel against the claims the geometry produced —
    // and against the sheet **as it arrived**, which is what says the sweep order is not part of the
    // answer: every neighbour read here is the source's, never one this pass may already have moved.
    for (const [name, source] of Object.entries(SHAPES)) {
      const result = antiAlias(source, SETTINGS);
      const claims = edgeClaims(source, SETTINGS);
      expect(claims.count, `${name} claimed nothing, so this shape proves nothing`).toBeGreaterThan(0);

      for (let pixel = 0; pixel < source.width * source.height; pixel += 1) {
        const offset = pixel * CHANNELS_PER_PIXEL;
        const scaled = claims.coverage[pixel] ?? 0;
        if (scaled === 0) {
          expect(readPixel(result.data, offset), `${name} at ${String(pixel)}`).toEqual(
            readPixel(source.data, offset),
          );
          continue;
        }
        const neighbour = pixel + step(claims.side[pixel] ?? 0, source.width);
        expect(readPixel(result.data, offset), `${name} at ${String(pixel)}`).toEqual(
          coverageBlend(
            readPixel(source.data, offset),
            readPixel(source.data, neighbour * CHANNELS_PER_PIXEL),
            scaled / CLAIM_PRECISION,
          ),
        );
      }
    }
  });

  it('touches no alpha byte under INTERIOR', () => {
    // The whole promise of that position: no silhouette moves, so the sprite bounds, the atlas cell
    // each one needs and everything measured off them are exactly as the passes above left them.
    const source = imageFrom(12, 6, (x, y) => (y < (x < 6 ? 2 : 3) ? PAPER : CLEAR));
    const withInk = imageFrom(12, 6, (x, y) => (y >= 4 ? CLEAR : y < (x < 6 ? 2 : 3) ? PAPER : INK));
    const result = antiAlias(withInk, { ...SETTINGS, mode: 'INTERIOR' });
    expect(result).not.toBe(withInk);
    for (let offset = 3; offset < result.data.length; offset += CHANNELS_PER_PIXEL) {
      expect(result.data[offset]).toBe(withInk.data[offset]);
    }
    // And the silhouette-only pass leaves that same sheet's interior contour alone, which is the
    // same claim from the other side.
    expect(antiAlias(source, { ...SETTINGS, mode: 'INTERIOR' })).toBe(source);
  });

  it('writes partial coverage into the silhouette under SILHOUETTE', () => {
    const source = imageFrom(12, 6, (x, y) => (y < (x < 6 ? 2 : 3) ? PAPER : CLEAR));
    const result = antiAlias(source, { ...SETTINGS, mode: 'SILHOUETTE' });
    const softened = at(result, 5, 2);
    expect(softened.a).toBeGreaterThan(FULLY_TRANSPARENT);
    expect(softened.a).toBeLessThan(FULLY_OPAQUE);
    // The colour comes from the solid side, because a cleared pixel carries no colour to mix in.
    expect({ r: softened.r, g: softened.g, b: softened.b }).toEqual({
      r: PAPER.r,
      g: PAPER.g,
      b: PAPER.b,
    });
  });

  it('keeps the colour count where the blends are snapped, and raises it where they are not', () => {
    // A sheet already holding an intermediate tone, so there is something for a snap to reach: the
    // point of that position is that an artist working to a fixed palette takes the shade that
    // exists rather than mixing a new one.
    const source = imageFrom(12, 9, (x, y) =>
      y < (x < 6 ? 2 : 3) ? PAPER : y < (x < 6 ? 5 : 6) ? MID : INK,
    );
    const before = countColors(source);
    expect(countColors(antiAlias(source, { ...SETTINGS, snap: true }))).toBe(before);
    expect(countColors(antiAlias(source, { ...SETTINGS, snap: false }))).toBeGreaterThan(before);
  });

  it('snaps a blend to a colour the sheet already holds rather than to the nearer endpoint', () => {
    const source = imageFrom(12, 9, (x, y) =>
      y < (x < 6 ? 2 : 3) ? PAPER : y < (x < 6 ? 5 : 6) ? MID : INK,
    );
    const snapped = antiAlias(source, { ...SETTINGS, snap: true });
    for (let pixel = 0; pixel < source.width * source.height; pixel += 1) {
      const color = readPixel(snapped.data, pixel * CHANNELS_PER_PIXEL);
      expect([PAPER, MID, INK].map((entry) => entry.r)).toContain(color.r);
    }
  });

  it('leaves the sheet further from its neighbours as the strength falls', () => {
    const source = stepped(PAPER, INK);
    const full = at(antiAlias(source, SETTINGS), 5, 2);
    const half = at(antiAlias(source, { ...SETTINGS, strength: 0.5 }), 5, 2);
    // The claimed pixel is ink blending toward paper, so a weaker strength keeps it darker.
    expect(half.r).toBeGreaterThan(INK.r);
    expect(half.r).toBeLessThan(full.r);
  });
});
