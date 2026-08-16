/**
 * OKLab, both ways: sRGB bytes in, and — for the one caller that needs to *make* a colour — out.
 *
 * Scaled so colour distances read on the channels' own order of magnitude.
 *
 * This is the metric behind every colour-tolerance gate in the quantiser — the sheet-wide merge,
 * the fill cleanup and the background keying. All three began in RGB, where Euclidean distance is
 * cheap and systematically wrong: the sRGB cube crowds dark colours together and spreads light
 * ones, and weighs a step in blue the same as the far more visible step in green. So one dial
 * value folded navies a reader tells apart while standing greens no reader can, and no setting
 * existed that did both jobs. OKLab is Björn Ottosson's 2020 perceptual space — the one the app's
 * design tokens already speak as OKLCH — built so that Euclidean distance approximates how far
 * apart two colours *look*. The gates measure there instead, and the dials mean one thing across
 * the whole gamut.
 *
 * **The axes are scaled by 255**, so black to white measures 255 rather than 1 and a dial keeps
 * the integer range every other control in the tab has. L runs 0 (black) to 255 (white); `a` and
 * `b` are the chroma axes, roughly green–red and blue–yellow, and run about −80 to +71 across the
 * sRGB gamut. Nothing downstream may assume any other scale: the dial ranges, the keying ladder
 * and every calibration figure in `constants/quantiser.ts` are stated in these units.
 *
 * **Channels are the integer bytes an image carries, 0 to 255.** The gamma decode is a 256-entry
 * table because every caller reads from a `Uint8ClampedArray` or an `Rgba` built from one, so the
 * domain genuinely is 256 values — a fractional channel would index past the table and read as
 * black via the `?? 0` the indexed access demands. Callers with arithmetic colour (a blend, an
 * average) round to bytes first, which is what constructing the pixel does anyway.
 *
 * Pure, dependency-free, and shaped for the two ways the app calls it: once per palette entry,
 * where an allocation is nothing, and once or twice per pixel of a sixteen-megapixel sheet, where
 * it is not — {@link srgbToOklabInto} exists so that the hot path can reuse one scratch object
 * instead of allocating thirty-three million.
 *
 * **The two directions live in one file because their matrices are inverses of each other.** Split
 * apart, one of them can be corrected without the other, and the pair stops round-tripping — which is
 * a failure with no symptom until a colour comes back subtly wrong. {@link oklchToOklab} and
 * {@link oklabToSrgb} are the way back, and exist for the difference heatmap: it paints the app's own
 * role colours into **pixel data**, which has no element to carry a class and no computed style to
 * read — so the tokens' `oklch()` triples have to be resolved in code. `oklab.test.ts` pins the
 * round trip.
 */

import type { Rgba } from '../types/quantiser.ts';
import { FULLY_OPAQUE } from './imageData.ts';

/** One OKLab colour on the scaled axes: `L` 0–255 black to white, `a` green–red, `b` blue–yellow. */
export interface Oklab {
  readonly L: number;
  readonly a: number;
  readonly b: number;
}

/** The caller-owned scratch {@link srgbToOklabInto} fills — the allocation-free path's one shape. */
export interface MutableOklab {
  L: number;
  a: number;
  b: number;
}

/**
 * Linear light for each of the 256 byte values, decoded once at module load.
 *
 * The sRGB transfer function splits at 0.04045: a linear toe below, a 2.4 power curve above. Per
 * pixel that power is the most expensive step of the whole conversion, and the domain is 256
 * values — so it is paid 256 times here and never again.
 */
const SRGB_TO_LINEAR = new Float64Array(256);
for (let byte = 0; byte < 256; byte += 1) {
  const value = byte / 255;
  SRGB_TO_LINEAR[byte] = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** How far the unit OKLab axes are stretched, so black to white reads 255 — see the module note. */
const CHANNEL_SCALE = 255;

/**
 * The OKLab colour of the sRGB bytes `r`, `g`, `b`, written into `out`.
 *
 * The two matrices are Ottosson's own, stated to the precision he published: linear sRGB into the
 * long/medium/short cone responses, a cube root apiece, and the cone responses into L, a, b. They
 * are the *definition* of OKLab rather than tunable numbers — a digit moved here is a different
 * colour space, and `oklab.test.ts` pins the published reference conversions so one cannot move
 * quietly.
 */
export function srgbToOklabInto(out: MutableOklab, r: number, g: number, b: number): void {
  const lr = SRGB_TO_LINEAR[r] ?? 0;
  const lg = SRGB_TO_LINEAR[g] ?? 0;
  const lb = SRGB_TO_LINEAR[b] ?? 0;

  const long = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const medium = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const short = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  out.L = CHANNEL_SCALE * (0.2104542553 * long + 0.793617785 * medium - 0.0040720468 * short);
  out.a = CHANNEL_SCALE * (1.9779984951 * long - 2.428592205 * medium + 0.4505937099 * short);
  out.b = CHANNEL_SCALE * (0.0259040371 * long + 0.7827717662 * medium - 0.808675766 * short);
}

/**
 * The OKLab colour of the sRGB bytes `r`, `g`, `b`, as a fresh object.
 *
 * The once-per-colour form: the merge converts each palette entry with this, the cleanup fills its
 * per-colour cache with it, and the keying converts the key itself. Per-pixel work goes through
 * {@link srgbToOklabInto} instead.
 */
export function srgbToOklab(r: number, g: number, b: number): Oklab {
  const out: MutableOklab = { L: 0, a: 0, b: 0 };
  srgbToOklabInto(out, r, g, b);
  return out;
}

/**
 * A colour written the way `index.css` writes one — `oklch(L C h)`, lightness 0–1 — as this file's
 * {@link Oklab}.
 *
 * The polar form is what a *palette* is stated in, because that is the form a hue wheel is a fact
 * about: ten stops 36° apart at one lightness is a sentence about `h` and `L`. The rectangular form
 * is what a *gradient* has to be interpolated in — mixing two colours by their hue angle swings the
 * blend through every hue between them, so a ramp from the near-neutral page ground to a saturated
 * green would pass through the cyan this app reserves for meaning "live". Straight lines in `a` and
 * `b` run through the neutral axis instead, which is what `color-mix(in oklab, …)` does in the
 * stylesheet and what the heatmap's ramp does in code.
 *
 * `lightness` is CSS's 0–1, and the returned `L` is this file's 0–255 — the scale everything
 * downstream of it assumes.
 */
export function oklchToOklab(lightness: number, chroma: number, hueDegrees: number): Oklab {
  const hue = (hueDegrees * Math.PI) / 180;
  return {
    L: CHANNEL_SCALE * lightness,
    a: CHANNEL_SCALE * chroma * Math.cos(hue),
    b: CHANNEL_SCALE * chroma * Math.sin(hue),
  };
}

/**
 * The inverse of {@link srgbToOklab}: an OKLab colour back to opaque sRGB bytes.
 *
 * The matrices are Ottosson's `oklab_to_linear_srgb`, which is the exact inverse of the pair above —
 * so the two round-trip, and a digit moved in either breaks that rather than shifting a colour
 * slightly.
 *
 * **Clamped, the way a browser clamps.** OKLab describes colours sRGB cannot show, and the honest
 * answers to "which of those is this" are a gamut-mapping algorithm or the nearest thing in range;
 * this takes the second, which is what CSS does with an out-of-gamut `oklch()` and therefore what
 * makes a colour resolved here match the same token resolved by the engine. Alpha is
 * {@link FULLY_OPAQUE} because every caller is naming a colour, not a coverage.
 */
export function oklabToSrgb(color: Oklab): Rgba {
  const L = color.L / CHANNEL_SCALE;
  const a = color.a / CHANNEL_SCALE;
  const b = color.b / CHANNEL_SCALE;

  const long = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const medium = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const short = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: toByte(4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short),
    g: toByte(-1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short),
    b: toByte(-0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short),
    a: FULLY_OPAQUE,
  };
}

/**
 * One linear-light channel as the byte an image carries: gamma-encoded, clamped, rounded.
 *
 * The encode is the exact inverse of the decode {@link SRGB_TO_LINEAR} tabulates — same split, same
 * exponent — which is what makes `oklabToSrgb(srgbToOklab(…))` give back the byte it started with.
 */
function toByte(linear: number): number {
  const clamped = Math.min(Math.max(linear, 0), 1);
  const encoded = clamped <= 0.0031308 ? 12.92 * clamped : 1.055 * clamped ** (1 / 2.4) - 0.055;
  return Math.round(encoded * 255);
}
