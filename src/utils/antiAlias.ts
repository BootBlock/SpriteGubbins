import type { ColorReduction } from '../types/quantiser.ts';
import { blendSnap } from './blendSnap.ts';
import { coverageBlend } from './coverageBlend.ts';
import {
  CLAIM_ABOVE,
  CLAIM_BELOW,
  CLAIM_LEFT,
  CLAIM_PRECISION,
  edgeClaims,
  type ClaimSettings,
} from './edgeClaims.ts';
import { CHANNELS_PER_PIXEL, createImage, readPixel, writePixel } from './imageData.ts';

/** Everything the pass needs: what to claim, and which colours a blend may be. */
export interface AntiAliasSettings extends ClaimSettings {
  /**
   * The colour reduction each blend is kept to, or `null` where a blend is written as it is mixed.
   *
   * The caller decides this from two things — the reader's own position, and whether a colour
   * reduction is in force at all. With no reduction there is no statement of which colours the sheet
   * is made of, so there is nothing to keep a blend to; see `AntiAliasPalette`. `blendSnap` says
   * what each reduction keeps a blend to.
   */
  readonly snapTo: ColorReduction | null;
}

/**
 * Anti-aliasing, applied to a finished sheet: the sub-pixel coverage its own step patterns imply,
 * written as blended pixels.
 *
 * **The one pass in this pipeline that puts smooth colour back, and it is last for that reason.**
 * Everything ahead of it takes a resampled render apart into flat cells, which is what turns a
 * returned sheet into pixel art and what leaves every contour a staircase of axis-aligned steps. A
 * hand pixel artist answers a shallow one of those with a few intermediate pixels — the Wesnoth
 * project's sprite guide states the rule as the pixel taking "the color of the line by exact
 * fraction of how much the line covers the pixel" — and nothing in the app did it. No prompt wording
 * reaches it either: the template asks a model for *no* anti-aliased edges on purpose, because what
 * a model returns unasked is a soft resampled ramp rather than placed, palette-aware pixels.
 *
 * **How the coverage is recovered.** From the steps themselves, which is the premise of Alexander
 * Reshetov's *Morphological Antialiasing* (HPG 2009) and of the family after it — and which
 * *Improved Morphological Anti-Aliasing for Japanese Animation* (SIGGRAPH Asia 2024) applies to
 * exactly this subject, an aliased 2D raster drawing with no geometry to consult. `edgeClaims` and
 * `edgeRuns` hold that half, down to the trapezoid area each pixel is owed.
 *
 * **The blend is a linear-light mix, and the palette is a constraint on it.** `coverageBlend` says
 * why the light has to be added rather than the bytes. Under {@link AntiAliasSettings.snapTo} each
 * result is taken to the nearest colour the reduction in force allows, so a sheet reduced to a
 * machine's four shades keeps exactly those four, and a sheet reduced to a machine's channel depth
 * stays on its ladder — which is what an artist working to a fixed palette does, reaching for the
 * intermediate tone that already exists rather than mixing a new one. It bounds the *hues* and not
 * the colour count: a coverage is an alpha, so softening a silhouette adds pixels that are a held
 * hue at a new coverage, and `countColors` keys on all four channels. `blendSnap` states what each
 * reduction allows, and what keeps the search affordable.
 *
 * **Hands back its argument by reference wherever nothing moved**, which is the contract
 * `snapSymmetric` and `snapFrames` keep and for the same reason: a re-segmentation is a linear pass
 * nobody should pay for a sheet that did not change. `OFF` leaves before anything is allocated at
 * all.
 *
 * `held` is where a budget's snap finds the colours the sheet holds, and it is `image` itself unless
 * `image` is one region of a sheet cut into several, whose colours the regions hold between them.
 *
 * Pure. It reads every source pixel out of the input and writes only into its own copy, so a claimed
 * pixel whose neighbour is also claimed blends against the colour that neighbour arrived with rather
 * than the one it is about to become — otherwise the sweep order would be part of the answer.
 */
export function antiAlias(
  image: ImageData,
  settings: AntiAliasSettings,
  held: readonly ImageData[] = [image],
): ImageData {
  if (settings.mode === 'OFF') return image;

  const claims = edgeClaims(image, settings);
  if (claims.count === 0) return image;

  const { width, height, data } = image;
  const output = createImage(width, height);
  output.data.set(data);

  const snap = settings.snapTo === null ? null : blendSnap(settings.snapTo, held);

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const scaled = claims.coverage[pixel] ?? 0;
    if (scaled === 0) continue;

    const neighbour = pixel + step(claims.side[pixel] ?? 0, width);
    const blend = coverageBlend(
      readPixel(data, pixel * CHANNELS_PER_PIXEL),
      readPixel(data, neighbour * CHANNELS_PER_PIXEL),
      scaled / CLAIM_PRECISION,
    );
    writePixel(output.data, pixel * CHANNELS_PER_PIXEL, snap === null ? blend : snap(blend));
  }

  return output;
}

/**
 * How far the claimed neighbour sits from the claiming pixel, in whole pixels.
 *
 * The four codes `edgeClaims` writes, resolved against the sheet's width here rather than stored as
 * an offset there — an offset is four bytes a pixel where a code is one, and at the 16.8 million
 * pixels this app admits that is fifty megabytes of difference for a number this line recovers.
 */
function step(side: number, width: number): number {
  if (side === CLAIM_ABOVE) return -width;
  if (side === CLAIM_BELOW) return width;
  return side === CLAIM_LEFT ? -1 : 1;
}
