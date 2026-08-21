import { describe, expect, it } from 'vitest';
import { channels, imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { inkWeightedCells } from './inkWeightedVote.ts';
import { packColor } from './imageData.ts';
import { lumaOf } from './lineVote.ts';
import { quantiseImage } from './quantiseImage.ts';
import { regularMesh } from './gridMesh.ts';

/** The fixtures' body — a mid brown, luma 115 — and a drawn outline's near-black, luma 14. */
const BODY: Rgba = { r: 150, g: 110, b: 70, a: 255 };
const INK: Rgba = { r: 16, g: 14, b: 18, a: 255 };

/** One 6 × 6 cell whose first `inkPixels` pixels in scan order are ink, the rest body. */
function cell(inkPixels: number, clear = 0): ImageData {
  return imageFrom(6, 6, (x, y) => {
    const index = y * 6 + x;
    if (index < clear) return { r: 0, g: 0, b: 0, a: 0 };
    return index < clear + inkPixels ? INK : BODY;
  });
}

const single = regularMesh(6, 6, 6, { x: 0, y: 0 });

describe('inkWeightedCells', () => {
  it('darkens a contour cell toward its ink by an emphasised share, keeping the hue', () => {
    // Twelve ink pixels in a cell of thirty-six: a third, emphasised half again, is a pull of one
    // half — the cell becomes the midpoint of body and ink, exactly. Darker than the body, and
    // still browner than the ink: the selective outline, not the detached black one.
    const resolved = inkWeightedCells(cell(12), single, 1.5, 0, 64);
    expect(Array.from(resolved.data)).toEqual([83, 62, 44, 255]);
    expect(lumaOf(packColor({ r: 83, g: 62, b: 44, a: 255 }))).toBeLessThan(lumaOf(packColor(BODY)));
  });

  it('pulls harder at a stronger line setting, and not at all beyond the full pull', () => {
    // The same one-third slice under each rung of the control: at 1× the pull is the share
    // itself; at 2.5× it is capped-adjacent — five sixths of the way to the ink.
    expect(Array.from(inkWeightedCells(cell(12), single, 1, 0, 64).data)).toEqual([105, 78, 53, 255]);
    expect(Array.from(inkWeightedCells(cell(12), single, 2.5, 0, 64).data)).toEqual([38, 30, 27, 255]);
    // A two-thirds slice at 2.5× exceeds a full pull and is capped at the ink itself.
    expect(Array.from(inkWeightedCells(cell(24), single, 2.5, 0, 64).data)).toEqual([16, 14, 18, 255]);
  });

  it('never darkens shading — a dark fill under the ink ceiling is not a line', () => {
    // A shaded fill: mid green over its own deep shadow at luma 52 — under the absolute ceiling,
    // but only 51 below its body, half the tonal range a drawn line sits at. The reported bug:
    // this cell darkened with every step of the line strength, so the dial changed fills. It must
    // answer the body mean at every strength, exactly.
    const shadow: Rgba = { r: 30, g: 70, b: 40, a: 255 };
    const midGreen: Rgba = { r: 60, g: 130, b: 80, a: 255 };
    const shaded = imageFrom(6, 6, (x, y) => (y * 6 + x < 12 ? shadow : midGreen));
    const atLow = inkWeightedCells(shaded, single, 1, 0, 64);
    const atHigh = inkWeightedCells(shaded, single, 2.5, 0, 64);
    expect(Array.from(atLow.data)).toEqual(Array.from(atHigh.data));
    expect(atHigh.data[1]).toBe(midGreen.g);
  });

  it('ignores speckle under the drawn-line share, and answers the body mean exactly', () => {
    // Two ink pixels of thirty-six is anti-aliasing, not a line: under an eighth, no pull at all.
    const resolved = inkWeightedCells(cell(2), single, 1.5, 0, 64);
    expect(Array.from(resolved.data)).toEqual([150, 110, 70, 255]);
  });

  it('resolves a flat cell to its own colour, and a pure ink cell to the ink', () => {
    expect(Array.from(inkWeightedCells(cell(0), single, 1.5, 0, 64).data)).toEqual([150, 110, 70, 255]);
    expect(Array.from(inkWeightedCells(cell(36), single, 1.5, 0, 64).data)).toEqual([16, 14, 18, 255]);
  });

  it('keeps a keyed cell keyed, and judges only the opaque art of a partly keyed one', () => {
    // Twenty transparent of thirty-six: the cell is background and stays it.
    const keyed = inkWeightedCells(cell(0, 20), single, 1.5, 0, 64);
    expect(keyed.data[3]).toBe(0);

    // Ten transparent, nine ink, seventeen body: the ink's share is judged against the twenty-six
    // opaque pixels — over a third — not the whole cell, so the line still pulls.
    const partial = inkWeightedCells(cell(9, 10), single, 1.5, 0, 64);
    const luma = lumaOf(
      packColor({ r: partial.data[0] ?? 0, g: partial.data[1] ?? 0, b: partial.data[2] ?? 0, a: 255 }),
    );
    expect(partial.data[3]).toBe(255);
    expect(luma).toBeLessThan(lumaOf(packColor(BODY)) - 16);
  });

  it('reads art at a soft alpha as art — a matte-exported sheet must not vanish', () => {
    // Exporters write 254 where they mean opaque; only true transparency is the keyed field.
    const soft = imageFrom(6, 6, () => ({ r: 150, g: 110, b: 70, a: 254 }));
    expect(Array.from(inkWeightedCells(soft, single, 1.5, 0, 64).data)).toEqual([150, 110, 70, 255]);
  });

  it('pulls toward a bright trim only when asked, mirrored and ink-first', () => {
    // A third of the cell is gold at luma 202 over a mid body — line-far in the bright direction.
    const gold: Rgba = { r: 235, g: 205, b: 90, a: 255 };
    const trimmed = imageFrom(6, 6, (x, y) => (y * 6 + x < 12 ? gold : BODY));
    // Off by default: the plain non-ink mean, gold included — the reading before the dial.
    expect(Array.from(inkWeightedCells(trimmed, single, 1.5, 0, 64).data)).toEqual([178, 142, 77, 255]);
    // At 1.5 the third pulls the whole base half-way toward the gold mean — from the base the
    // gold is already part of, so the dial is continuous: barely on is barely different from off.
    expect(Array.from(inkWeightedCells(trimmed, single, 1.5, 1.5, 64).data)).toEqual([207, 173, 83, 255]);
    // Monotonic from the first notch: a whisper of strength moves a whisker from off, upward.
    const whisper = inkWeightedCells(trimmed, single, 1.5, 0.1, 64);
    expect(whisper.data[0]).toBeGreaterThanOrEqual(178);
    expect(whisper.data[0]).toBeLessThanOrEqual(181);
    // Ink takes the cell first where both cross it: a qualifying ink slice beside the gold keeps
    // the pull dark, whatever the trim strength.
    const both = imageFrom(6, 6, (x, y) => {
      const index = y * 6 + x;
      if (index < 12) return INK;
      return index < 20 ? gold : BODY;
    });
    const dark = inkWeightedCells(both, single, 2.5, 3, 64);
    expect(
      (54 * (dark.data[0] ?? 0) + 183 * (dark.data[1] ?? 0) + 19 * (dark.data[2] ?? 0)) >> 8,
    ).toBeLessThan(64);
  });

  it('reads the ink ceiling from the dial, in both directions', () => {
    // A dark-brown outline at luma 70 over a pale body: outside the default ceiling, inside a
    // raised one — the artwork that outlines in colour rather than black.
    const brown: Rgba = { r: 120, g: 60, b: 40, a: 255 };
    const pale: Rgba = { r: 210, g: 200, b: 170, a: 255 };
    const sheet = imageFrom(6, 6, (x, y) => (y * 6 + x < 12 ? brown : pale));
    // At the default ceiling the brown is body, and the cell is the plain mean of both.
    expect(Array.from(inkWeightedCells(sheet, single, 2, 0, 64).data)).toEqual([180, 153, 127, 255]);
    const raised = inkWeightedCells(sheet, single, 2, 0, 96);
    expect(raised.data[0]).toBeLessThan(180);
    // And the range's floor still admits true black ink — the dial narrows, never disables.
    expect(Array.from(inkWeightedCells(cell(12), single, 2, 0, 16).data)).toEqual([61, 46, 35, 255]);
  });
  it('is deterministic — the same sheet resolves to the same bytes twice', () => {
    const sheet = imageFrom(24, 24, (x, y) => ((x * 7 + y * 13) % 5 === 0 ? INK : BODY));
    const mesh = regularMesh(24, 24, 6, { x: 0, y: 0 });
    expect(channels(inkWeightedCells(sheet, mesh, 1.5, 0, 64))).toEqual(
      channels(inkWeightedCells(sheet, mesh, 1.5, 0, 64)),
    );
  });
});

describe('quantiseImage, ink-weighted', () => {
  /** Drifting-ish ring art: an ink box outline over the body, quantised against its rhythm. */
  const ringSheet = imageFrom(60, 60, (x, y) => {
    const on = (position: number): boolean => position >= 25 && position < 27;
    return (on(x) && y >= 25 && y < 45) || (on(y) && x >= 25 && x < 45) ? INK : BODY;
  });

  it('differs from the dominant vote on a contour sheet, and honours the colour setting after', () => {
    const dominant = quantiseImage(ringSheet, {
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
    const weighted = quantiseImage(ringSheet, {
      grid: 6,
      key: null,
      vote: 'INK_WEIGHTED',
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
    expect(channels(weighted.image)).not.toEqual(channels(dominant.image));

    // The reduction runs on the reading's output: under a three-bit channel depth each channel
    // can take at most eight values, blends included — which the unsnapped blend above does not
    // satisfy, so this is the ordering observed rather than assumed.
    const snapped = quantiseImage(ringSheet, {
      grid: 6,
      key: null,
      vote: 'INK_WEIGHTED',
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
      reduction: { kind: 'CHANNEL_DEPTH', bitsPerChannel: 3 },
    });
    for (const channel of [0, 1, 2]) {
      const seen = new Set<number>();
      for (let offset = 0; offset < snapped.image.data.length; offset += 4) {
        seen.add(snapped.image.data[offset + channel] ?? 0);
      }
      expect(seen.size).toBeLessThanOrEqual(8);
    }
  });
});
