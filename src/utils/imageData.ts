import type { Rgba } from '../types/quantiser.ts';

/**
 * Reading and writing pixels, and counting the colours in an image.
 *
 * `ImageData` is a plain value — a width, a height and a flat `Uint8ClampedArray` — so working with
 * it here breaks none of the purity this directory depends on. Nothing in this file touches a
 * canvas, a document or a store; the DOM half of the feature lives in `src/hooks/`.
 *
 * Every read goes through {@link readPixel} for one reason beyond tidiness: `noUncheckedIndexedAccess`
 * makes `data[offset]` a `number | undefined`, and a `?? 0` at each of the dozens of call sites is
 * both noise and a place to forget one. Here it is written once.
 */

/** The alpha at which a pixel carries no colour at all, and is left exactly as it was found. */
export const FULLY_TRANSPARENT = 0;

/** The alpha at which a pixel is wholly its own colour, carrying nothing of what lies behind it. */
export const FULLY_OPAQUE = 255;

/** RGBA. The stride of `ImageData.data`, and the number of channels a colour is compared across. */
export const CHANNELS_PER_PIXEL = 4;

/** Where pixel (x, y) starts in the flat channel array of an image this wide. */
export function pixelOffset(width: number, x: number, y: number): number {
  return (y * width + x) * CHANNELS_PER_PIXEL;
}

export function readPixel(data: Uint8ClampedArray, offset: number): Rgba {
  return {
    r: data[offset] ?? 0,
    g: data[offset + 1] ?? 0,
    b: data[offset + 2] ?? 0,
    a: data[offset + 3] ?? 0,
  };
}

/**
 * Write a colour into a channel array.
 *
 * Mutating, and still pure in the sense this directory means: the array is one the caller has just
 * created for its own return value, never shared state. Every exported transform below and in its
 * siblings allocates its output and hands back a fresh `ImageData`.
 */
export function writePixel(data: Uint8ClampedArray, offset: number, color: Rgba): void {
  data[offset] = color.r;
  data[offset + 1] = color.g;
  data[offset + 2] = color.b;
  data[offset + 3] = color.a;
}

/**
 * A colour as one integer, so it can key a `Map`.
 *
 * Multiplication rather than the usual `r << 24 | …`: a red channel above 127 makes the shifted form
 * negative, and two colours that differ only in sign handling are exactly the kind of bug a
 * histogram hides. This form stays a positive integer well inside the safe range.
 */
export function packColor(color: Rgba): number {
  return ((color.r * 256 + color.g) * 256 + color.b) * 256 + color.a;
}

export function unpackColor(key: number): Rgba {
  return {
    r: Math.floor(key / 16777216) % 256,
    g: Math.floor(key / 65536) % 256,
    b: Math.floor(key / 256) % 256,
    a: key % 256,
  };
}

/**
 * `#RRGGBB`, uppercase.
 *
 * Here rather than beside either caller, because both of them state a colour to a *reader*: the
 * identity digest writes its palette as hex the way `baseline-prompt-new.md` §5's worked example does,
 * and the quantiser's keying control shows the key colour it is matching against. Two implementations
 * of "a colour as text" would be two answers to one question, and the case of the digits is exactly the
 * half that would quietly diverge.
 *
 * Alpha is dropped. Neither caller is describing a compositing state, and `#RRGGBBAA` is not the
 * spelling either of them wants.
 */
export function toHex(color: Rgba): string {
  return `#${[color.r, color.g, color.b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** A blank image of the given size, every channel zero. */
export function createImage(width: number, height: number): ImageData {
  return new ImageData(new Uint8ClampedArray(width * height * CHANNELS_PER_PIXEL), width, height);
}

/**
 * Every distinct colour in the image and how many pixels carry it, in the order they are first met.
 *
 * **Fully transparent pixels are excluded.** They describe nothing, and counting them would let a
 * keyed sheet's empty field claim palette slots that should have gone to the sprite — so they take
 * no part in the histogram, no part in the palette, and are passed through untouched by
 * `applyPalette`.
 *
 * Insertion order is scan order, which is what makes every tie-break downstream deterministic.
 */
export function colorHistogram(image: ImageData): ReadonlyMap<number, number> {
  const counts = new Map<number, number>();
  for (let offset = 0; offset < image.data.length; offset += CHANNELS_PER_PIXEL) {
    const color = readPixel(image.data, offset);
    if (color.a === FULLY_TRANSPARENT) continue;
    const key = packColor(color);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * How many distinct colours the image uses, transparency aside.
 *
 * The figure the summary reports before and after, so it has to mean the same thing in both places:
 * a sheet that was 4,000 colours and is now 32 is the whole claim this feature makes.
 */
export function countColors(image: ImageData): number {
  return colorHistogram(image).size;
}
