import type { Rgba } from '../types/quantiser.ts';
import { coverageBlend } from './coverageBlend.ts';
import {
  CLAIM_ABOVE,
  CLAIM_BELOW,
  CLAIM_LEFT,
  CLAIM_PRECISION,
  edgeClaims,
  type ClaimSettings,
} from './edgeClaims.ts';
import {
  CHANNELS_PER_PIXEL,
  FULLY_OPAQUE,
  FULLY_TRANSPARENT,
  createImage,
  readPixel,
  writePixel,
} from './imageData.ts';
import { locateEntries, nearestOklab, type LocatedEntry } from './lockedPalette.ts';
import { MAX_PALETTE_ENTRIES } from './pngPalette.ts';

/** Everything the pass needs: what to claim, and whether a blend may be a new colour. */
export interface AntiAliasSettings extends ClaimSettings {
  /**
   * Whether each blend is taken to the nearest colour the sheet already holds.
   *
   * The caller decides this from two things — the reader's own position, and whether a colour
   * reduction is in force at all. With no reduction there is no statement of which colours the sheet
   * is made of, so there is nothing to keep a blend to; see `AntiAliasPalette`.
   */
  readonly snap: boolean;
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
 * why the light has to be added rather than the bytes. Under {@link AntiAliasSettings.snap} each
 * result is taken to the nearest colour the sheet already holds, so a sheet reduced to a machine's
 * four shades keeps exactly those four — which is what an artist working to a fixed palette does,
 * reaching for the intermediate tone that already exists rather than mixing a new one. It bounds the
 * *hues* and not the colour count: a coverage is an alpha, so softening a silhouette adds pixels
 * that are a held hue at a new coverage, and `countColors` keys on all four channels. The nearest
 * search is paid once per distinct blend rather than once per pixel, and over a set `sheetColors`
 * refuses to build past the size a palette can be at all — the two things that keep it affordable.
 *
 * **Hands back its argument by reference wherever nothing moved**, which is the contract
 * `snapSymmetric` and `snapFrames` keep and for the same reason: a re-segmentation is a linear pass
 * nobody should pay for a sheet that did not change. `OFF` leaves before anything is allocated at
 * all.
 *
 * Pure. It reads every source pixel out of the input and writes only into its own copy, so a claimed
 * pixel whose neighbour is also claimed blends against the colour that neighbour arrived with rather
 * than the one it is about to become — otherwise the sweep order would be part of the answer.
 */
export function antiAlias(image: ImageData, settings: AntiAliasSettings): ImageData {
  if (settings.mode === 'OFF') return image;

  const claims = edgeClaims(image, settings);
  if (claims.count === 0) return image;

  const { width, height, data } = image;
  const output = createImage(width, height);
  output.data.set(data);

  const palette = settings.snap ? sheetColors(image) : null;
  const located = palette === null ? null : locateEntries(palette);
  const resolved = new Map<number, Rgba>();

  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const scaled = claims.coverage[pixel] ?? 0;
    if (scaled === 0) continue;

    const neighbour = pixel + step(claims.side[pixel] ?? 0, width);
    const blend = coverageBlend(
      readPixel(data, pixel * CHANNELS_PER_PIXEL),
      readPixel(data, neighbour * CHANNELS_PER_PIXEL),
      scaled / CLAIM_PRECISION,
    );
    writePixel(
      output.data,
      pixel * CHANNELS_PER_PIXEL,
      located === null ? blend : keep(blend, located, resolved),
    );
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

/**
 * The blend, taken to the nearest colour the sheet already holds — keeping its own coverage.
 *
 * The colour and the coverage are two answers: `nearestOklab` compares colours alone, deliberately,
 * because a palette entry is a colour rather than a compositing state. So a silhouette blend keeps
 * the alpha the coverage gave it and takes only the hue it landed nearest.
 *
 * Memoised on the blended colour, which is what bounds the number of searches. The key drops alpha
 * for the same reason the search does — two blends of one pair of colours at two coverages resolve to
 * the same entry, and looking each of them up separately would be paying for the distinction the
 * search does not make. It is arithmetic on the packed value rather than a spread, because this runs
 * once per claimed pixel and a throwaway object per pixel is what every pass beside this one refuses.
 */
function keep(blend: Rgba, located: readonly LocatedEntry[], resolved: Map<number, Rgba>): Rgba {
  const key = (blend.r * 256 + blend.g) * 256 + blend.b;
  const cached = resolved.get(key);
  if (cached !== undefined) return { r: cached.r, g: cached.g, b: cached.b, a: blend.a };

  const nearest = nearestOklab(blend, located)?.entry ?? blend;
  resolved.set(key, nearest);
  return { r: nearest.r, g: nearest.g, b: nearest.b, a: blend.a };
}

/**
 * Every distinct colour the sheet holds, opaque, in the order it was first met — or `null` where it
 * holds more of them than a palette can name.
 *
 * **The `null` is what bounds the snap, and it is the app's own boundary rather than a new one.**
 * `nearestOklab` is a linear scan, so a search set of this size is paid once per distinct blend; on
 * a sheet reduced to a budget or to a machine's list that set is tens of colours and the cost is
 * nothing. Two reductions do not bound it at all, though — a locked palette at a snap of zero
 * reaches nothing and leaves the sheet exactly as it arrived, and a channel-depth reduction at six
 * bits admits a quarter of a million — and on one of those the search would run for tens of seconds
 * over a set that is not a *palette* in any sense a reader means. {@link MAX_PALETTE_ENTRIES} is
 * where `indexImage` already draws that line, for the same reason: past it, the sheet's colours are
 * not a list anything can be kept to.
 *
 * Alpha is dropped on the way in: a palette is a list of colours, and a soft pixel's own coverage is
 * a fact about that pixel. First-met order is what settles a tie in `nearestOklab`, which takes the
 * earliest entry, so the answer is stable across two runs over the same sheet.
 *
 * It reads the channel array directly rather than through `colorHistogram`, which would build a Map
 * of counts this has no use for — and it stops the moment the sheet passes the ceiling, so the
 * refusal costs a partial pass rather than a whole one.
 */
function sheetColors(image: ImageData): readonly Rgba[] | null {
  const { data } = image;
  const seen = new Set<number>();
  const entries: Rgba[] = [];

  for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
    if ((data[offset + 3] ?? 0) === FULLY_TRANSPARENT) continue;
    const r = data[offset] ?? 0;
    const g = data[offset + 1] ?? 0;
    const b = data[offset + 2] ?? 0;
    const packed = (r * 256 + g) * 256 + b;
    if (seen.has(packed)) continue;
    if (seen.size === MAX_PALETTE_ENTRIES) return null;
    seen.add(packed);
    entries.push({ r, g, b, a: FULLY_OPAQUE });
  }

  return entries;
}
