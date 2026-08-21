import { ASEPRITE_FRAME_DURATION_MS } from '../constants/aseprite.ts';
import type { SpriteBox } from '../types/quantiser.ts';
import type { WrittenAseprite } from '../types/sheetFormat.ts';
import { aseCelChunk } from './aseCel.ts';
import type { CelSource } from './aseCel.ts';
import { aseFrame } from './aseChunk.ts';
import { aseColorProfileChunk, aseHeader, FILE_SIZE_OFFSET } from './aseHeader.ts';
import { aseLayerChunk } from './aseLayer.ts';
import { asePaletteChunk } from './asePalette.ts';
import { aseTagChunks } from './aseTags.ts';
import { CHANNELS_PER_PIXEL } from './imageData.ts';
import { concatBytes } from './pngChunk.ts';
import { indexImage } from './pngPalette.ts';
import { sheetLayout } from './sheetLayout.ts';

/**
 * Writing a quantised sheet as an Aseprite document — the editable form of what the PNG export
 * hands over as a picture.
 *
 * A PNG proves the palette to a pipeline; this proves the *sheet* to whoever has to work on it
 * next. The frames are cut where the app already says the sprites are, the strips it already draws
 * become tags, and the palette is the one the panel is showing — so a reader opens the file with the
 * animation laid out rather than with a single image they have to slice by hand.
 *
 * **Written from the published format specification only.** Aseprite's own source is EULA-licensed
 * and was not consulted. [miriti/ase](https://github.com/miriti/ase) (MIT) was read as an
 * independent reference implementation while writing this; none of it is vendored.
 *
 * **Indexed where the sheet's colours fit a palette, RGBA where they do not**, which is the same
 * boundary and the same code `encodePng` uses — `indexImage` decides it, once, for both files. The
 * alternative was to refuse a sheet past 256 colours, and a format control that accepts a sheet
 * under one button and rejects it under the other would be a worse answer than a larger file: the
 * reader chose a format, not a colour budget.
 *
 * Pure: an `ImageData` and the boxes the segmentation found go in, bytes come out, with no canvas
 * and no document anywhere in it.
 */

/** Indexed and RGBA, the two colour depths this writer produces — bits per pixel, as the header states them. */
const INDEXED_DEPTH = 8;
const RGBA_DEPTH = 32;

/**
 * The widest or tallest canvas the format can state, since both are `WORD`s.
 *
 * Reachable rather than theoretical: the tab bounds a sheet by *area*, so a very wide, very short
 * image is accepted, and a result 70,000 pixels across would wrap to a canvas 4,464 wide with no
 * error anywhere. A refusal the download can report is the only honest answer — the alternative is a
 * file that opens showing a fraction of the artwork.
 */
const MAX_CANVAS_SIDE = 65535;

export async function encodeAseprite(
  image: ImageData,
  boxes: readonly SpriteBox[],
): Promise<WrittenAseprite> {
  const layout = sheetLayout(image, boxes);
  if (layout.width > MAX_CANVAS_SIDE || layout.height > MAX_CANVAS_SIDE) {
    throw new Error(
      `An Aseprite canvas cannot exceed ${String(MAX_CANVAS_SIDE)} pixels on a side, and this one is ${String(layout.width)} × ${String(layout.height)}`,
    );
  }

  const indexed = indexImage(image);
  const source: CelSource =
    indexed === null
      ? { pixels: image.data, sheetWidth: image.width, bytesPerPixel: CHANNELS_PER_PIXEL }
      : { pixels: indexed.indices, sheetWidth: image.width, bytesPerPixel: 1 };

  // The first frame carries everything that describes the sprite; the rest carry a cel each.
  const [opening, ...later] = layout.frames;
  const first: Uint8Array[] = [
    aseColorProfileChunk(),
    ...(indexed === null ? [] : [asePaletteChunk(indexed.entries)]),
    // A sheet with no transparent palette entry cannot name one as transparent, so it is written as
    // a background layer instead — see `aseLayer.ts`, which is where that reasoning lives.
    aseLayerChunk(indexed !== null && indexed.transparentEntries === 0),
    await aseCelChunk(source, opening),
    // Left out entirely where the sheet held nothing to cut. A tags chunk stating zero tags is a
    // chunk every reader has to parse to learn nothing.
    ...(layout.strips.length === 0 ? [] : aseTagChunks(layout.strips)),
  ];

  const frames = [
    aseFrame(first, ASEPRITE_FRAME_DURATION_MS),
    ...(await Promise.all(later.map((frame) => aseCelChunk(source, frame)))).map((cel) =>
      aseFrame([cel], ASEPRITE_FRAME_DURATION_MS),
    ),
  ];

  const bytes = concatBytes([
    aseHeader({
      frames: frames.length,
      width: layout.width,
      height: layout.height,
      depth: indexed === null ? RGBA_DEPTH : INDEXED_DEPTH,
      colors: indexed === null ? 0 : indexed.entries.length,
      transparentIndex: 0,
      durationMs: ASEPRITE_FRAME_DURATION_MS,
    }),
    ...frames,
  ]);
  // The file states its own length in its first field, which is only knowable once every chunk has
  // been written — the same shape as each frame's own size, and the reason the writer can patch.
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).setUint32(
    FILE_SIZE_OFFSET,
    bytes.length,
    true,
  );

  return {
    format: 'ASEPRITE',
    bytes,
    paletteEntries: indexed === null ? null : indexed.entries.length,
    frames: layout.frames.length,
    tags: layout.strips.length,
  };
}
