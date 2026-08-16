import {
  LINE_BRIGHT_SHARE,
  LINE_DARK_SHARE,
  LINE_LUMA_RANGE,
  LINE_TRIM_FLOOR,
} from '../constants/quantiser.ts';
import type { GridMesh } from '../types/quantiser.ts';
import { createImage, FULLY_OPAQUE, FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

/**
 * One pixel per mesh cell, as the cell's body colour pulled toward the line that crosses it — the
 * ink-weighted reading, and the automation of what pixel artists call selective outlining.
 *
 * The failure this serves: a contour cell holds ink *and* the body it outlines, and any reading
 * that must pick one loses the other — pure ink detaches the line from its surface, pure body
 * snaps the line. Practice resolves it the third way: an outline drawn as a darker shade of the
 * colour it outlines, which is what a cell here becomes. The body pixels' mean carries the local
 * hue; where the cell's ink — the pixels under the caller's `inkCeiling`, defaulting to the same
 * darkest-quarter anchor the dominant vote's rescue uses — holds a share no anti-aliased speckle
 * reaches *and* sits a full tonal range below that body, the mean is blended toward the ink's own
 * mean by that share, amplified by the caller's `emphasis`, so a one-third slice reads as a line
 * rather than a shadow. `trimEmphasis` is the bright mirror for gold edging and rim light —
 * pixels at or above the trim floor, held to the stricter bright share, pulling only where a
 * qualifying ink stroke has not already taken the cell — at zero it is fully inert, and it leans
 * from the same inclusive base as the ink pull, which is what keeps the dial continuous at the
 * off end and monotonic along its whole travel. The
 * mechanism is the inverse-bilateral weighting of detail-preserving downscaling, specialised to
 * the details pixel art cannot lose.
 *
 * **This reading averages, deliberately** — the one thing the dominant vote never does — so it
 * runs on unreduced colours and `quantiseImage` applies the palette step to its output, where the
 * darkened line tones it exists to create are real colours a palette can keep.
 *
 * Every pixel that carries any colour takes part: transparency here means the keyed field, and a
 * cell more than half keyed resolves to transparency — but art is art however soft its alpha, and
 * a matte-exported sheet sitting at 254 must not vanish. That is a broader gate than the dominant
 * vote's line *rescue* uses, deliberately: the rescue replaces a whole cell with one colour
 * verbatim, where a mean merely leans, so a soft pixel that would be dangerous there is dilution
 * here. Pure, deterministic, and one pass over the image.
 */
export function inkWeightedCells(
  image: ImageData,
  mesh: GridMesh,
  emphasis: number,
  trimEmphasis: number,
  inkCeiling: number,
): ImageData {
  const output = createImage(mesh.x.length, mesh.y.length);

  for (const [cellY, top] of mesh.y.entries()) {
    const bottom = Math.min(mesh.y[cellY + 1] ?? image.height, image.height);
    for (const [cellX, left] of mesh.x.entries()) {
      const right = Math.min(mesh.x[cellX + 1] ?? image.width, image.width);

      let opaque = 0;
      let inkCount = 0;
      let inkLuma = 0;
      let inkR = 0;
      let inkG = 0;
      let inkB = 0;
      let bodyCount = 0;
      let bodyLuma = 0;
      let bodyR = 0;
      let bodyG = 0;
      let bodyB = 0;
      let trimCount = 0;
      let trimLuma = 0;
      let trimR = 0;
      let trimG = 0;
      let trimB = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const offset = pixelOffset(image.width, x, y);
          if ((image.data[offset + 3] ?? 0) === FULLY_TRANSPARENT) continue;
          const r = image.data[offset] ?? 0;
          const g = image.data[offset + 1] ?? 0;
          const b = image.data[offset + 2] ?? 0;
          opaque += 1;
          // The same Rec. 601 integer luma `lineVote.ts` reads from a packed colour, unpacked
          // because this loop has the channels in hand — a test pins the two arithmetics equal.
          const luma = (54 * r + 183 * g + 19 * b) >> 8;
          if (luma < inkCeiling) {
            inkCount += 1;
            inkLuma += luma;
            inkR += r;
            inkG += g;
            inkB += b;
          } else if (luma >= LINE_TRIM_FLOOR) {
            trimCount += 1;
            trimLuma += luma;
            trimR += r;
            trimG += g;
            trimB += b;
          } else {
            bodyCount += 1;
            bodyLuma += luma;
            bodyR += r;
            bodyG += g;
            bodyB += b;
          }
        }
      }

      const out = pixelOffset(mesh.x.length, cellX, cellY);
      const area = (right - left) * (bottom - top);
      if (opaque * 2 < area) continue;

      // The base is the mean of everything that is not ink — bright pixels included, so a pale
      // sheet with the trim dial off reads exactly as it did before the dial existed. The
      // trim-exclusive body tally exists only for the trim *gate*, which judges the tonal gap
      // between the trim and the surface under it.
      const nonInkCount = bodyCount + trimCount;
      const baseR = nonInkCount > 0 ? (bodyR + trimR) / nonInkCount : inkR / inkCount;
      const baseG = nonInkCount > 0 ? (bodyG + trimG) / nonInkCount : inkG / inkCount;
      const baseB = nonInkCount > 0 ? (bodyB + trimB) / nonInkCount : inkB / inkCount;
      // A pull fires only for a genuine line: it must hold a drawn stroke's share of the cell,
      // **and** sit line-far — a full tonal range — from the body it crosses. The absolute
      // threshold alone called any dark shading "ink", so the line dial darkened shaded fills;
      // the range gate is what keeps every strength dial to the lines it names. Ink takes the
      // cell first where both a line and a trim cross it, the same precedence the dominant
      // vote's rescue keeps.
      const inkQualifies =
        inkCount > 0 &&
        inkCount * LINE_DARK_SHARE >= opaque &&
        nonInkCount > 0 &&
        (bodyLuma + trimLuma) / nonInkCount - inkLuma / inkCount >= LINE_LUMA_RANGE;
      const trimQualifies =
        !inkQualifies &&
        trimEmphasis > 0 &&
        trimCount > 0 &&
        trimCount * LINE_BRIGHT_SHARE >= opaque &&
        bodyCount > 0 &&
        trimLuma / trimCount - bodyLuma / bodyCount >= LINE_LUMA_RANGE;
      const pull = inkQualifies
        ? Math.min(1, (inkCount / opaque) * emphasis)
        : trimQualifies
          ? Math.min(1, (trimCount / opaque) * trimEmphasis)
          : 0;
      // Both pulls lean from the same inclusive base toward their line's own mean, and for the
      // trim that is what makes the dial continuous: the base already carries the trim at its
      // natural share, so as the strength approaches nothing the blend approaches exactly the
      // off state, and every notch upward is more trim than the last — a pull that instead leant
      // from the trim-free surface dimmed the trim below off for every strength under one, with
      // a visible cliff at the first notch.
      const towardR = inkQualifies ? inkR / inkCount : trimQualifies ? trimR / trimCount : baseR;
      const towardG = inkQualifies ? inkG / inkCount : trimQualifies ? trimG / trimCount : baseG;
      const towardB = inkQualifies ? inkB / inkCount : trimQualifies ? trimB / trimCount : baseB;

      output.data[out] = Math.round(baseR * (1 - pull) + towardR * pull);
      output.data[out + 1] = Math.round(baseG * (1 - pull) + towardG * pull);
      output.data[out + 2] = Math.round(baseB * (1 - pull) + towardB * pull);
      output.data[out + 3] = FULLY_OPAQUE;
    }
  }

  return output;
}
