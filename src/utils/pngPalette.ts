import type { Rgba } from '../types/quantiser.ts';
import {
  alphaAt,
  CHANNELS_PER_PIXEL,
  FULLY_OPAQUE,
  FULLY_TRANSPARENT,
  packedColorAt,
  unpackColor,
} from './imageData.ts';

/**
 * Turning a quantised sheet into what a PNG palette actually is: a list of colours, and one index
 * per pixel naming which of them it is.
 *
 * The palette is read **off the result** rather than plumbed through from the palette step, and that
 * is deliberate. Every route the pipeline offers ends with the same guarantee — a budget resolved by
 * the Wu quantiser, a machine's fixed palette, a locked palette from an earlier sheet, a channel
 * depth, or a dither, whose plan is applied last of all — and in every one of them the colours *in
 * the finished image* are the colours the reader was promised. Reading them here means the file
 * cannot disagree with the pane the reader is looking at, whatever produced it, and it is the only
 * form that also works for a sheet whose few colours were never reduced at all.
 *
 * Pure, as everything in this directory is.
 */

/** A palette PNG's two halves, plus how much of the palette needs an alpha stated for it. */
export interface IndexedImage {
  /** `PLTE` order — see {@link indexImage} for why it is sorted by alpha. */
  readonly entries: readonly Rgba[];
  /** One entry index per pixel, row-major, as the `IHDR` bit depth of 8 stores them. */
  readonly indices: Uint8Array;
  /**
   * How many leading entries `tRNS` must state, which is every entry that is not fully opaque.
   *
   * `0` means the sheet carries no transparency at all and the chunk is left out entirely — a PNG
   * with no `tRNS` is opaque by definition, and writing 256 bytes of 255 to say so is 256 bytes.
   */
  readonly transparentEntries: number;
}

/** A palette PNG's bit depth here is 8, so this is what a palette cannot exceed. */
export const MAX_PALETTE_ENTRIES = 256;

/**
 * The image as a palette and indices, or `null` where it holds more colours than a palette can name.
 *
 * **Every fully transparent pixel is collapsed onto one entry**, whatever colour its dead RGB
 * channels happen to carry. Alpha zero means the pixel shows nothing, so two of them differing in
 * red are the same pixel to every renderer that will ever open the file — and left apart they would
 * spend palette slots, and a keyed sheet has a great many of them. It is the one place this writer
 * changes a byte, and it changes no pixel anybody can see.
 *
 * **Entries are ordered by ascending alpha**, first-seen order within a tier. `tRNS` is a prefix of
 * the palette by construction — the spec allows it to be shorter than `PLTE` and takes every entry
 * it does not reach as opaque — so the transparent entries have to come first for that saving to
 * exist. It also puts a keyed sheet's transparent entry at index 0, which is what the tools that
 * assume a transparent index assume.
 *
 * `null` rather than a lossy reduction to 256: the reader's colour budget is a control on the tab,
 * and quietly re-quantising a sheet on the way out would make the file disagree with the preview.
 * `encodePng` writes such a sheet as truecolour instead.
 */
export function indexImage(image: ImageData): IndexedImage | null {
  const { data } = image;
  const seen = new Map<number, number>();

  for (let offset = 0; offset < data.length; offset += CHANNELS_PER_PIXEL) {
    const key = alphaAt(data, offset) === FULLY_TRANSPARENT ? 0 : packedColorAt(data, offset);
    if (seen.has(key)) continue;
    if (seen.size === MAX_PALETTE_ENTRIES) return null;
    seen.set(key, seen.size);
  }

  // A palette chunk with no entries in it is not a PNG. Only a zero-pixel image reaches this, which
  // nothing on the tab produces — but a writer that emits an invalid file for one is worse than one
  // that names a single transparent colour nobody draws with.
  if (seen.size === 0) seen.set(0, 0);

  const ordered = [...seen.keys()].sort((left, right) => (left % 256) - (right % 256));
  const entries = ordered.map(unpackColor);
  const indexOf = new Map(ordered.map((key, index) => [key, index]));

  const indices = new Uint8Array(data.length / CHANNELS_PER_PIXEL);
  for (let offset = 0, pixel = 0; offset < data.length; offset += CHANNELS_PER_PIXEL, pixel += 1) {
    const key = alphaAt(data, offset) === FULLY_TRANSPARENT ? 0 : packedColorAt(data, offset);
    indices[pixel] = indexOf.get(key) ?? 0;
  }

  return {
    entries,
    indices,
    transparentEntries: entries.filter((entry) => entry.a !== FULLY_OPAQUE).length,
  };
}
