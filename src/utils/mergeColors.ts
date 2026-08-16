import { FULLY_TRANSPARENT, pixelOffset } from './imageData.ts';

/**
 * The colour merge: every colour in the image folded into the most popular colour within reach of
 * it, so near-duplicates collapse sheet-wide.
 *
 * The failure this serves is the one the per-pixel cleanup cannot touch: *dense* speckle. A
 * reduced sheet keeps several entries a dozen RGB steps apart for what the eye reads as one
 * surface, and neighbouring pixels alternate between them everywhere — so no pixel is ever the
 * lone dissenter a neighbourhood pass can outvote, and the fills stay dithered however hard that
 * pass runs. The redundancy is in the *palette*, and this pass removes it there: colours are
 * ranked by how many pixels carry them, each colour in rank order either stands (no keeper within
 * the tolerance) or folds into the first keeper it sits within tolerance of, and every pixel of a
 * folded colour is repainted with its keeper. One decision per colour, applied everywhere at once
 * — which is what makes a green panel become *one* green rather than a negotiation, and what
 * makes the per-pixel cleanup effective afterwards, because majorities can finally form.
 *
 * Population order is what keeps it honest: the colours that stand are the ones the sheet
 * actually uses most, so a surface's dominant shade absorbs its satellites rather than the other
 * way round — and rank ties break by packed value, so the outcome is deterministic on every
 * input. Distance is straight-line RGB against the caller's tolerance; linework survives for the
 * same reason it survives the cleanup — ink sits far past every offered rung from any fill.
 * Colour means RGB and alpha is coverage, untouched: colours tally across their alphas, and a
 * repainted pixel keeps its own. Fully transparent pixels are outside it entirely. A tolerance of
 * zero returns the input's bytes unchanged.
 */
export function mergeColors(image: ImageData, tolerance: number): ImageData {
  const output = new ImageData(new Uint8ClampedArray(image.data), image.width, image.height);
  if (tolerance <= 0) return output;
  const limit = tolerance * tolerance;

  const counts = new Map<number, number>();
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const at = pixelOffset(image.width, x, y);
      if ((image.data[at + 3] ?? 0) === FULLY_TRANSPARENT) continue;
      const key = ((image.data[at] ?? 0) * 256 + (image.data[at + 1] ?? 0)) * 256 + (image.data[at + 2] ?? 0);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]).map(([key]) => key);
  const keepers: number[] = [];
  const target = new Map<number, number>();
  for (const key of ranked) {
    const r = (key >>> 16) & 0xff;
    const g = (key >>> 8) & 0xff;
    const b = key & 0xff;
    let home = key;
    for (const keeper of keepers) {
      const dr = r - ((keeper >>> 16) & 0xff);
      const dg = g - ((keeper >>> 8) & 0xff);
      const db = b - (keeper & 0xff);
      if (dr * dr + dg * dg + db * db <= limit) {
        home = keeper;
        break;
      }
    }
    if (home === key) keepers.push(key);
    else target.set(key, home);
  }
  if (target.size === 0) return output;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const at = pixelOffset(image.width, x, y);
      if ((output.data[at + 3] ?? 0) === FULLY_TRANSPARENT) continue;
      const key =
        ((output.data[at] ?? 0) * 256 + (output.data[at + 1] ?? 0)) * 256 + (output.data[at + 2] ?? 0);
      const home = target.get(key);
      if (home === undefined) continue;
      output.data[at] = (home >>> 16) & 0xff;
      output.data[at + 1] = (home >>> 8) & 0xff;
      output.data[at + 2] = home & 0xff;
    }
  }

  return output;
}
