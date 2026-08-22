import type { Rgba } from '../types/quantiser.ts';
import { FULLY_TRANSPARENT, FULLY_OPAQUE } from './imageData.ts';
import { linearToByte, srgbToLinear } from './oklab.ts';

/**
 * One pixel mixed toward another by a coverage — the blend an anti-aliasing pass writes.
 *
 * **Linear light, not sRGB bytes and not OKLab.** A coverage says what fraction of the pixel's area
 * the neighbouring region really occupies, so the pixel emits that fraction of the neighbour's
 * light and the rest of its own — and light adds linearly. Averaging the *bytes* averages a
 * gamma-encoded quantity and lands nowhere in particular: half of black and white is sRGB 188 here,
 * where a byte average gives 128 and an OKLab average gives something further off still. That figure
 * is `oklab.ts`'s own, stated there for the dither's mixing plan, and this pass is asking the same
 * question of the same transfer function.
 *
 * **Premultiplied, which is what makes a transparent neighbour mean anything.** `ImageData` carries
 * whatever bytes happened to sit under a cleared pixel, so a clear pixel's colour is not a colour —
 * `pixelDistance` refuses to compare it for exactly that reason. Mixing the two premultiplied and
 * dividing the coverage back out is the compositing answer and needs no special case: blending
 * toward a clear neighbour thins the pixel and keeps its own hue, blending a clear pixel toward an
 * opaque one gives it that neighbour's colour at a low coverage, and two opaque pixels reduce to the
 * plain linear mix.
 *
 * `coverage` is a fraction in `[0, 1]`, where `0` hands back {@link target} unchanged and `1` is the
 * neighbour outright. Callers hold it to that range; nothing is clamped here, because a coverage
 * outside it is an error in the geometry that produced it rather than a colour to be rescued.
 *
 * Pure, and allocating one object per call — which is affordable because an anti-aliasing pass
 * touches the pixels along a contour rather than every pixel of a sheet, and because the caller
 * memoises the answer per distinct blend.
 */
export function coverageBlend(target: Rgba, toward: Rgba, coverage: number): Rgba {
  const targetAlpha = target.a / FULLY_OPAQUE;
  const towardAlpha = toward.a / FULLY_OPAQUE;
  const alpha = targetAlpha + (towardAlpha - targetAlpha) * coverage;

  // Nothing is left to carry a colour, so there is no hue to divide back out — and the bytes under
  // a cleared pixel are not a colour to preserve. Zero throughout is what `createImage` leaves and
  // what every other pass in the pipeline writes when it clears a pixel.
  if (alpha <= 0) {
    return { r: 0, g: 0, b: 0, a: FULLY_TRANSPARENT };
  }

  return {
    r: channel(target.r, targetAlpha, toward.r, towardAlpha, coverage, alpha),
    g: channel(target.g, targetAlpha, toward.g, towardAlpha, coverage, alpha),
    b: channel(target.b, targetAlpha, toward.b, towardAlpha, coverage, alpha),
    a: Math.round(alpha * FULLY_OPAQUE),
  };
}

/**
 * One channel of the mix: both sides premultiplied into linear light, interpolated, and the
 * resulting coverage divided back out before the gamma encode.
 *
 * The division is what makes the result a *colour* again rather than a colour already dimmed by its
 * own coverage — writing the premultiplied value straight into an `ImageData`, which is
 * un-premultiplied, would darken every soft pixel toward black in proportion to how soft it is.
 */
function channel(
  targetByte: number,
  targetAlpha: number,
  towardByte: number,
  towardAlpha: number,
  coverage: number,
  alpha: number,
): number {
  const from = srgbToLinear(targetByte) * targetAlpha;
  const to = srgbToLinear(towardByte) * towardAlpha;
  return linearToByte((from + (to - from) * coverage) / alpha);
}
