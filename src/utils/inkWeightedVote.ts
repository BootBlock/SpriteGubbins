import { INK_BLEND_EMPHASIS, LINE_DARK_SHARE, LINE_INK_CEILING } from '../constants/quantiser.ts';
import type { GridMesh } from '../types/quantiser.ts';
import { createImage, FULLY_OPAQUE, pixelOffset } from './imageData.ts';

/**
 * One pixel per mesh cell, as the cell's body colour pulled toward the line that crosses it — the
 * ink-weighted reading, and the automation of what pixel artists call selective outlining.
 *
 * The failure this serves: a contour cell holds ink *and* the body it outlines, and any reading
 * that must pick one loses the other — pure ink detaches the line from its surface, pure body
 * snaps the line. Practice resolves it the third way: an outline drawn as a darker shade of the
 * colour it outlines, which is what a cell here becomes. The body pixels' mean carries the local
 * hue; where the cell's ink — its darkest-quarter pixels, the same absolute anchor the dominant
 * vote's rescue uses — holds a share no anti-aliased speckle reaches, the mean is blended toward
 * the ink's own mean by that share, amplified by {@link INK_BLEND_EMPHASIS} so a one-third slice
 * reads as a line rather than a shadow. The mechanism is the inverse-bilateral weighting of
 * detail-preserving downscaling, specialised to the one detail pixel art cannot lose.
 *
 * **This reading averages, deliberately** — the one thing the dominant vote never does — so it
 * runs on unreduced colours and `quantiseImage` applies the palette step to its output, where the
 * darkened line tones it exists to create are real colours a palette can keep.
 *
 * Only fully opaque pixels take part, as in every cell judgement: a keyed field stays keyed — a
 * cell more than half transparent resolves to transparency — and a translucent fringe neither
 * shifts a mean nor reads as ink. Pure, deterministic, and one pass over the image.
 */
export function inkWeightedCells(image: ImageData, mesh: GridMesh): ImageData {
  const output = createImage(mesh.x.length, mesh.y.length);

  for (const [cellY, top] of mesh.y.entries()) {
    const bottom = Math.min(mesh.y[cellY + 1] ?? image.height, image.height);
    for (const [cellX, left] of mesh.x.entries()) {
      const right = Math.min(mesh.x[cellX + 1] ?? image.width, image.width);

      let opaque = 0;
      let inkCount = 0;
      let inkR = 0;
      let inkG = 0;
      let inkB = 0;
      let bodyCount = 0;
      let bodyR = 0;
      let bodyG = 0;
      let bodyB = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const offset = pixelOffset(image.width, x, y);
          if ((image.data[offset + 3] ?? 0) !== FULLY_OPAQUE) continue;
          const r = image.data[offset] ?? 0;
          const g = image.data[offset + 1] ?? 0;
          const b = image.data[offset + 2] ?? 0;
          opaque += 1;
          // The same Rec. 601 integer luma `lineVote.ts` reads from a packed colour, unpacked
          // because this loop has the channels in hand — a test pins the two arithmetics equal.
          if ((54 * r + 183 * g + 19 * b) >> 8 < LINE_INK_CEILING) {
            inkCount += 1;
            inkR += r;
            inkG += g;
            inkB += b;
          } else {
            bodyCount += 1;
            bodyR += r;
            bodyG += g;
            bodyB += b;
          }
        }
      }

      const out = pixelOffset(mesh.x.length, cellX, cellY);
      const area = (right - left) * (bottom - top);
      if (opaque * 2 < area) continue;

      // The body's mean where there is one; a cell of pure ink is its own answer.
      const baseR = bodyCount > 0 ? bodyR / bodyCount : inkR / inkCount;
      const baseG = bodyCount > 0 ? bodyG / bodyCount : inkG / inkCount;
      const baseB = bodyCount > 0 ? bodyB / bodyCount : inkB / inkCount;
      // Ink pulls only once it holds a drawn line's share, and then in proportion.
      const qualifies = inkCount > 0 && inkCount * LINE_DARK_SHARE >= opaque;
      const pull = qualifies ? Math.min(1, (inkCount / opaque) * INK_BLEND_EMPHASIS) : 0;
      const towardR = inkCount > 0 ? inkR / inkCount : baseR;
      const towardG = inkCount > 0 ? inkG / inkCount : baseG;
      const towardB = inkCount > 0 ? inkB / inkCount : baseB;

      output.data[out] = Math.round(baseR * (1 - pull) + towardR * pull);
      output.data[out + 1] = Math.round(baseG * (1 - pull) + towardG * pull);
      output.data[out + 2] = Math.round(baseB * (1 - pull) + towardB * pull);
      output.data[out + 3] = FULLY_OPAQUE;
    }
  }

  return output;
}
