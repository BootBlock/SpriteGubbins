import { FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

/**
 * The fill cleanup: each pixel snapped to its neighbourhood's most common colour, where the
 * neighbourhood has genuinely settled and the pixel is only a step away from agreeing.
 *
 * The failure this serves is speckle. Every reading resolves neighbouring cells of one flat
 * surface independently, so a green panel comes back as a scatter of near-identical greens —
 * blends and palette entries a few steps apart that carry no perceptual meaning, and read as
 * noise at 1×. This pass merges exactly that and nothing else, by two gates working together:
 *
 * - a **strict majority of the neighbours the pixel has** must already share one colour — of its
 *   eight in the interior, five at an image edge, three in a corner — so a lone odd pixel inside
 *   a settled region qualifies wherever it sits, and the frontier between two regions never does:
 *   a boundary pixel's neighbourhood is split, and a split is not a majority;
 * - and the pixel must sit within the caller's tolerance of that colour, measured as squared RGB
 *   distance — which is what keeps every line safe, because ink against any fill sits far past
 *   the offered tolerances however many neighbours agree.
 *
 * **Colour here means RGB; alpha is coverage, and the pass never touches it.** Neighbours tally
 * by their RGB alone — a matte-exported sheet mixing alpha 254 with 255 is one colour, not two —
 * a pixel already matching the modal RGB is left alone whatever its alpha, and a merged pixel
 * takes the modal RGB while keeping its own alpha. Fully transparent pixels are outside all of
 * it: they are the keyed field, they never vote as neighbours, and they are never painted over.
 *
 * Every judgement reads the *input* image and writes a copy, so the pass is one simultaneous
 * step rather than a left-to-right smear — a merged pixel cannot recruit the next one within the
 * same call — which is also what makes it deterministic and testable byte for byte. A tolerance
 * of zero returns the input's bytes unchanged.
 */
export function despeckle(image: ImageData, tolerance: number): ImageData {
  const output = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  if (tolerance <= 0) return output;
  const limit = tolerance * tolerance;
  const tally = new Map<number, number>();

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const at = pixelOffset(image.width, x, y);
      if ((image.data[at + 3] ?? 0) === FULLY_TRANSPARENT) continue;

      tally.clear();
      let present = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
          const near = pixelOffset(image.width, nx, ny);
          if ((image.data[near + 3] ?? 0) === FULLY_TRANSPARENT) continue;
          present += 1;
          const key =
            ((image.data[near] ?? 0) * 256 + (image.data[near + 1] ?? 0)) * 256 + (image.data[near + 2] ?? 0);
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
      const own = ((image.data[at] ?? 0) * 256 + (image.data[at + 1] ?? 0)) * 256 + (image.data[at + 2] ?? 0);
      if (count < Math.floor(present / 2) + 1 || modal === own) continue;

      const modalR = (modal >>> 16) & 0xff;
      const modalG = (modal >>> 8) & 0xff;
      const modalB = modal & 0xff;
      const dr = (image.data[at] ?? 0) - modalR;
      const dg = (image.data[at + 1] ?? 0) - modalG;
      const db = (image.data[at + 2] ?? 0) - modalB;
      if (dr * dr + dg * dg + db * db <= limit) {
        output.data[at] = modalR;
        output.data[at + 1] = modalG;
        output.data[at + 2] = modalB;
      }
    }
  }

  return output;
}
