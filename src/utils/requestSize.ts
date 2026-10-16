import type { PixelExtent, RequestSizeLimits } from '../types/output.ts';
import { greatestCommonDivisor } from './greatestCommonDivisor.ts';

/**
 * The largest size a request can ask for at exactly this ratio, within every limit the vendor states
 * and inside its stable sizes, or `null` where no size meets them all.
 *
 * **The largest, because a sheet is the densest image this app asks for.** Its components share one
 * canvas, so a larger canvas gives each of them more pixels to be drawn at, or more room for the
 * whole-number enlargement a native pixel grid is presented at, and the Quantise tab reduces the sheet
 * afterwards whatever size it arrives at. The stable bound stops it short of the sizes a
 * vendor calls experimental, and is read as both a longest edge and a pixel count, so neither a
 * square nor a strip can pass it on the other measure.
 *
 * **Exact, not near.** Width and height are the ratio's terms scaled by one whole factor, and that
 * factor is a multiple of the smallest step that puts both edges on the vendor's multiple, so a size
 * this returns is the shape the prompt lays its grid out for.
 *
 * The resolution profile plays no part. Its shares of the grid hold on any canvas, and the pixel
 * sizes `RETRO_16_BIT` and `CUSTOM` state are floors the prompt works out against the smaller
 * `NOMINAL_SHEET_SIZE`, which every size this returns for GPT Image exceeds on both edges.
 */
export function requestSizeFor(
  ratio: { readonly width: number; readonly height: number },
  limits: RequestSizeLimits,
): PixelExtent | null {
  const divisor = greatestCommonDivisor(ratio.width, ratio.height);
  const across = ratio.width / divisor;
  const down = ratio.height / divisor;
  const widthStep = limits.edgeMultiple / greatestCommonDivisor(limits.edgeMultiple, across);
  const heightStep = limits.edgeMultiple / greatestCommonDivisor(limits.edgeMultiple, down);
  const step = (widthStep * heightStep) / greatestCommonDivisor(widthStep, heightStep);
  const longestEdge = Math.min(limits.maxEdge, Math.max(limits.stable.width, limits.stable.height));
  const mostPixels = Math.min(limits.maxPixels, limits.stable.width * limits.stable.height);
  const fits = (factor: number) =>
    Math.max(across, down) * factor <= longestEdge && across * down * factor * factor <= mostPixels;

  let factor = 0;
  while (fits(factor + step)) factor += step;
  const size = { width: across * factor, height: down * factor };
  const pixels = size.width * size.height;
  const meetsRatio = Math.max(across, down) <= limits.maxRatio * Math.min(across, down);
  return factor > 0 && pixels >= limits.minPixels && meetsRatio ? size : null;
}
