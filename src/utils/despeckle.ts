import { SPECKLE_NEIGHBOUR_MAJORITY } from '../constants/quantiser.ts';
import { createImage, FULLY_TRANSPARENT, packedColorAt, pixelOffset, writePackedColor } from './imageData.ts';

/**
 * The fill cleanup: each pixel snapped to its neighbourhood's most common colour, where the
 * neighbourhood has genuinely settled and the pixel is only a step away from agreeing.
 *
 * The failure this serves is speckle. Every reading resolves neighbouring cells of one flat
 * surface independently, so a green panel comes back as a scatter of near-identical greens —
 * blends and palette entries a few steps apart that carry no perceptual meaning, and read as
 * noise at 1×. This pass merges exactly that and nothing else, by two gates working together:
 *
 * - at least {@link SPECKLE_NEIGHBOUR_MAJORITY} of the pixel's eight neighbours must already
 *   share one colour — a strict majority, so a lone odd pixel inside a settled region qualifies
 *   and the frontier between two regions never does;
 * - and the pixel must sit within the caller's tolerance of that colour, measured as squared RGB
 *   distance — which is what keeps every line safe, because ink against any fill sits far past
 *   the offered tolerances however many neighbours agree.
 *
 * Every judgement reads the *input* image and writes a copy, so the pass is one simultaneous
 * step rather than a left-to-right smear — a merged pixel cannot recruit the next one within the
 * same call — which is also what makes it deterministic and testable byte for byte. Transparent
 * pixels are outside it entirely: they are the keyed field, they never vote as neighbours, and
 * they are never painted over. A tolerance of zero returns the input's bytes unchanged.
 */
export function despeckle(image: ImageData, tolerance: number): ImageData {
  const output = createImage(image.width, image.height);
  output.data.set(image.data);
  if (tolerance <= 0) return output;
  const limit = tolerance * tolerance;
  const tally = new Map<number, number>();

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const at = pixelOffset(image.width, x, y);
      if ((image.data[at + 3] ?? 0) === FULLY_TRANSPARENT) continue;

      tally.clear();
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
          const near = pixelOffset(image.width, nx, ny);
          if ((image.data[near + 3] ?? 0) === FULLY_TRANSPARENT) continue;
          const key = packedColorAt(image.data, near);
          tally.set(key, (tally.get(key) ?? 0) + 1);
        }
      }

      let modal = 0;
      let count = 0;
      for (const [key, votes] of tally) {
        if (votes > count) {
          modal = key;
          count = votes;
        }
      }
      if (count < SPECKLE_NEIGHBOUR_MAJORITY || modal === packedColorAt(image.data, at)) continue;

      const dr = (image.data[at] ?? 0) - ((modal >>> 24) & 0xff);
      const dg = (image.data[at + 1] ?? 0) - ((modal >>> 16) & 0xff);
      const db = (image.data[at + 2] ?? 0) - ((modal >>> 8) & 0xff);
      if (dr * dr + dg * dg + db * db <= limit) writePackedColor(output.data, at, modal);
    }
  }

  return output;
}
