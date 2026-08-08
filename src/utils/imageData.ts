import type { Rgba } from '../types/quantiser.ts';

/**
 * Reading and writing pixels, and counting the colours in an image.
 *
 * `ImageData` is a plain value — a width, a height and a flat `Uint8ClampedArray` — so working with
 * it here breaks none of the purity this directory depends on. Nothing in this file touches a
 * canvas, a document or a store; the DOM half of the feature lives in `src/hooks/`.
 *
 * **Nothing outside this file indexes a channel array**, and that is the rule the whole set of
 * primitives below exists to keep: `noUncheckedIndexedAccess` makes `data[offset]` a
 * `number | undefined`, so a `?? 0` at each of the dozens of call sites would be both noise and a
 * place to forget one. Every one of them is written here instead.
 *
 * They come in two forms, and which to reach for is decided by how often it runs. {@link readPixel}
 * and {@link writePixel} hand back and take an {@link Rgba}, which is what a caller reasoning about a
 * *colour* wants — a palette entry, a key to match against. {@link alphaAt},
 * {@link packedColorAt}, {@link writePackedColor} and {@link copyPixel} do the same work without the
 * object, and are what the per-pixel loops use: at the 16.8 million pixels this app admits, a
 * short-lived `{r, g, b, a}` per pixel per pass is tens of millions of allocations whose only purpose
 * is to be read once and discarded, and it was measurably most of the cost of the pipeline.
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
 * The alpha channel alone, without reading the other three.
 *
 * The pipeline asks "is this pixel transparent?" far more often than it asks what colour it is —
 * `applyPalette` and `colorHistogram` both decide it before anything else — and answering from one
 * channel rather than a whole {@link Rgba} is the difference between one array read and four plus an
 * object.
 */
export function alphaAt(data: Uint8ClampedArray, offset: number): number {
  return data[offset + 3] ?? 0;
}

/**
 * {@link packColor} straight off the channel array, without the {@link Rgba} in between.
 *
 * The same integer {@link packColor} returns for the same pixel — this is the packing, reading its
 * four channels itself rather than being handed an object. That equivalence is what lets the two be
 * used interchangeably, and a test pins it.
 *
 * Every pass in the quantiser packs one colour per pixel — to key a histogram, to vote for a cell's
 * modal colour, to compare a pixel with its neighbour — which is why this form exists at all; see the
 * note at the top of the file.
 */
export function packedColorAt(data: Uint8ClampedArray, offset: number): number {
  const r = data[offset] ?? 0;
  const g = data[offset + 1] ?? 0;
  const b = data[offset + 2] ?? 0;
  return ((r * 256 + g) * 256 + b) * 256 + (data[offset + 3] ?? 0);
}

/**
 * {@link writePixel} for a packed colour, without the {@link Rgba} in between.
 *
 * The counterpart to {@link packedColorAt}, and the reason a transform can carry packed integers all
 * the way from its input to its output: `alignToGrid` votes in packed values and writes the winner,
 * `applyPalette` looks one up and writes what it found, and neither has to unpack a colour it is only
 * going to store again.
 */
export function writePackedColor(data: Uint8ClampedArray, offset: number, packed: number): void {
  data[offset] = Math.floor(packed / 16777216) % 256;
  data[offset + 1] = Math.floor(packed / 65536) % 256;
  data[offset + 2] = Math.floor(packed / 256) % 256;
  data[offset + 3] = packed % 256;
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
 * One pixel, verbatim, at the same position in another image of the same width.
 *
 * The pass-through case, and it earns a name because both transforms that have one would otherwise
 * spell it as a pack immediately undone by a write: `keyBackground` copies every pixel the key did
 * not match, and `applyPalette` copies every fully transparent pixel rather than mapping it onto a
 * colour the sheet says is not there.
 */
export function copyPixel(source: Uint8ClampedArray, target: Uint8ClampedArray, offset: number): void {
  target[offset] = source[offset] ?? 0;
  target[offset + 1] = source[offset + 1] ?? 0;
  target[offset + 2] = source[offset + 2] ?? 0;
  target[offset + 3] = source[offset + 3] ?? 0;
}

/**
 * A colour as one integer, so it can key a `Map`.
 *
 * Multiplication rather than the usual `r << 24 | …`: a red channel above 127 makes the shifted form
 * negative, and two colours that differ only in sign handling are exactly the kind of bug a
 * histogram hides. This form stays a positive integer well inside the safe range.
 *
 * {@link packedColorAt} is this same packing read straight off a channel array, and is what the
 * per-pixel loops use; this form is for a colour that is already an {@link Rgba}.
 */
export function packColor(color: Rgba): number {
  return ((color.r * 256 + color.g) * 256 + color.b) * 256 + color.a;
}

/** The object form of {@link writePackedColor} — the two undo {@link packColor} identically. */
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

/**
 * The inverse of {@link toHex}: `#RRGGBB` back to an opaque colour.
 *
 * Beside it because they are one convention read in two directions, and the pair is what stops the
 * palette library and the quantiser disagreeing about what `#0F380F` is. Deliberately strict —
 * exactly six digits, with the hash — since its only inputs are the literals in
 * `src/constants/palettes/`, which a test checks are all written that way. `parseColorFromText` is
 * the *lenient* reader and belongs to the free-text fields; a second lenient one here would be a
 * second answer to a question that already has one.
 *
 * Returns `null` on anything else rather than a fallback colour, so a malformed entry drops out of
 * the palette instead of silently becoming black.
 */
export function fromHex(hex: string): Rgba | null {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (match === null) return null;
  const [, r = '', g = '', b = ''] = match;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16), a: FULLY_OPAQUE };
}

/** A blank image of the given size, every channel zero. */
export function createImage(width: number, height: number): ImageData {
  return new ImageData(new Uint8ClampedArray(width * height * CHANNELS_PER_PIXEL), width, height);
}

/**
 * The image with every pixel's colour resolved through `resolve`, decided once per distinct colour.
 *
 * The walk the three colour transforms share, so that "which pixels are asked about, how often, and
 * what happens to the empty ones" is answered here rather than three times. Each of them then
 * consists of its own decision and nothing else: nearest palette entry, nearest palette entry with
 * the pixel's own alpha, nearest rung per channel.
 *
 * **Fully transparent pixels are copied through untouched and never reach `resolve`**, matching the
 * histogram that excludes them: a pixel carrying no colour has no colour to resolve, and giving it
 * one would put paint where the sheet says there is none.
 *
 * `resolve` is called **once per distinct colour**, not once per pixel — the difference between a
 * few thousand decisions and a few million on a sheet with far fewer colours than pixels. It must
 * therefore be a pure function of the colour it is handed, which every caller's is.
 *
 * That is also why the loop itself never builds an {@link Rgba} while `resolve` is handed one, and
 * the memo holds packed integers on both sides: the object is affordable per *colour* and not per
 * pixel. At a grid of 1 this runs over the whole sheet, where one short-lived colour object each way
 * is 33 million allocations to be discarded a line later — see the note at the top of this file.
 */
export function remapColors(image: ImageData, resolve: (color: Rgba) => Rgba): ImageData {
  const output = createImage(image.width, image.height);
  const resolved = new Map<number, number>();
  const { data } = image;

  for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
    if (alphaAt(data, offset) === FULLY_TRANSPARENT) {
      copyPixel(data, output.data, offset);
      continue;
    }

    const key = packedColorAt(data, offset);
    let mapped = resolved.get(key);
    if (mapped === undefined) {
      mapped = packColor(resolve(unpackColor(key)));
      resolved.set(key, mapped);
    }
    writePackedColor(output.data, offset, mapped);
  }

  return output;
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
  const { data } = image;
  for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
    if (alphaAt(data, offset) === FULLY_TRANSPARENT) continue;
    const key = packedColorAt(data, offset);
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
