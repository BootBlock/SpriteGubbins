import {
  COVERAGE_FLOOR,
  LINE_BRIGHT_SHARE,
  LINE_DARK_SHARE,
  LINE_LUMA_RANGE,
  LINE_TRIM_FLOOR,
} from '../constants/quantiser.ts';
import type { GridMesh } from '../types/quantiser.ts';
import { createImage, pixelOffset } from './imageData.ts';
import { lumaOfChannels } from './lineVote.ts';

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
 * **Every pixel at or above {@link COVERAGE_FLOOR} takes part, in proportion to its coverage.** A
 * pixel under the floor is absent, as the keyed field is, and a cell whose present pixels are fewer
 * than half of it resolves to transparency — but art is art however soft its alpha, so a
 * matte-exported sheet sitting at 254 must not vanish. A present pixel weighs its alpha in every sum
 * and every share: the means are premultiplied with the coverage divided back out, so a faint black
 * pixel beside an opaque body darkens it only as much as it shows, and a line's share is the share
 * of the cell's coverage it holds. The cell is written at its own coverage, each present pixel's
 * alpha weighted by itself, so a cell of faint shadow stays a faint shadow and a pixel at the floor
 * can barely thin a solid one. That is a broader gate than the dominant vote's line *rescue* uses,
 * deliberately: the rescue replaces a whole cell with one colour verbatim, where a mean merely
 * leans, so a soft pixel that would be dangerous there is dilution here. Pure, deterministic, and
 * one pass over the image.
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

      let present = 0;
      let coverage = 0;
      let opacity = 0;
      let inkCoverage = 0;
      let inkLuma = 0;
      let inkR = 0;
      let inkG = 0;
      let inkB = 0;
      let bodyCoverage = 0;
      let bodyLuma = 0;
      let bodyR = 0;
      let bodyG = 0;
      let bodyB = 0;
      let trimCoverage = 0;
      let trimLuma = 0;
      let trimR = 0;
      let trimG = 0;
      let trimB = 0;
      for (let y = top; y < bottom; y += 1) {
        for (let x = left; x < right; x += 1) {
          const offset = pixelOffset(image.width, x, y);
          // The coverage is the pixel's weight in every sum below, so each tally is premultiplied
          // and every tally of a kind of pixel is a share of coverage rather than of pixels.
          const alpha = image.data[offset + 3] ?? 0;
          if (alpha < COVERAGE_FLOOR) continue;
          const r = image.data[offset] ?? 0;
          const g = image.data[offset + 1] ?? 0;
          const b = image.data[offset + 2] ?? 0;
          present += 1;
          coverage += alpha;
          opacity += alpha * alpha;
          // The same Rec. 601 integer luma `lineVote.ts` reads from a packed colour, in the form
          // that takes the channels this loop already has in hand rather than packing them first.
          const luma = lumaOfChannels(r, g, b);
          if (luma < inkCeiling) {
            inkCoverage += alpha;
            inkLuma += luma * alpha;
            inkR += r * alpha;
            inkG += g * alpha;
            inkB += b * alpha;
          } else if (luma >= LINE_TRIM_FLOOR) {
            trimCoverage += alpha;
            trimLuma += luma * alpha;
            trimR += r * alpha;
            trimG += g * alpha;
            trimB += b * alpha;
          } else {
            bodyCoverage += alpha;
            bodyLuma += luma * alpha;
            bodyR += r * alpha;
            bodyG += g * alpha;
            bodyB += b * alpha;
          }
        }
      }

      const out = pixelOffset(mesh.x.length, cellX, cellY);
      const area = (right - left) * (bottom - top);
      if (present * 2 < area) continue;

      // The base is the mean of everything that is not ink — bright pixels included, so a pale
      // sheet with the trim dial off reads exactly as it did before the dial existed. The
      // trim-exclusive body tally exists only for the trim *gate*, which judges the tonal gap
      // between the trim and the surface under it.
      const nonInkCoverage = bodyCoverage + trimCoverage;
      const baseR = nonInkCoverage > 0 ? (bodyR + trimR) / nonInkCoverage : inkR / inkCoverage;
      const baseG = nonInkCoverage > 0 ? (bodyG + trimG) / nonInkCoverage : inkG / inkCoverage;
      const baseB = nonInkCoverage > 0 ? (bodyB + trimB) / nonInkCoverage : inkB / inkCoverage;
      // A pull fires only for a genuine line: it must hold a drawn stroke's share of the cell,
      // **and** sit line-far — a full tonal range — from the body it crosses. The absolute
      // threshold alone called any dark shading "ink", so the line dial darkened shaded fills;
      // the range gate is what keeps every strength dial to the lines it names. Ink takes the
      // cell first where both a line and a trim cross it, the same precedence the dominant
      // vote's rescue keeps.
      const inkQualifies =
        inkCoverage > 0 &&
        inkCoverage * LINE_DARK_SHARE >= coverage &&
        nonInkCoverage > 0 &&
        (bodyLuma + trimLuma) / nonInkCoverage - inkLuma / inkCoverage >= LINE_LUMA_RANGE;
      const trimQualifies =
        !inkQualifies &&
        trimEmphasis > 0 &&
        trimCoverage > 0 &&
        trimCoverage * LINE_BRIGHT_SHARE >= coverage &&
        bodyCoverage > 0 &&
        trimLuma / trimCoverage - bodyLuma / bodyCoverage >= LINE_LUMA_RANGE;
      const pull = inkQualifies
        ? Math.min(1, (inkCoverage / coverage) * emphasis)
        : trimQualifies
          ? Math.min(1, (trimCoverage / coverage) * trimEmphasis)
          : 0;
      // Both pulls lean from the same inclusive base toward their line's own mean, and for the
      // trim that is what makes the dial continuous: the base already carries the trim at its
      // natural share, so as the strength approaches nothing the blend approaches exactly the
      // off state, and every notch upward is more trim than the last — a pull that instead leant
      // from the trim-free surface dimmed the trim below off for every strength under one, with
      // a visible cliff at the first notch.
      const towardR = inkQualifies ? inkR / inkCoverage : trimQualifies ? trimR / trimCoverage : baseR;
      const towardG = inkQualifies ? inkG / inkCoverage : trimQualifies ? trimG / trimCoverage : baseG;
      const towardB = inkQualifies ? inkB / inkCoverage : trimQualifies ? trimB / trimCoverage : baseB;

      output.data[out] = Math.round(baseR * (1 - pull) + towardR * pull);
      output.data[out + 1] = Math.round(baseG * (1 - pull) + towardG * pull);
      output.data[out + 2] = Math.round(baseB * (1 - pull) + towardB * pull);
      output.data[out + 3] = Math.round(opacity / coverage);
    }
  }

  return output;
}
