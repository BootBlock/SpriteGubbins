import { describe, expect, it } from 'vitest';
import { ASEPRITE_FRAME_DURATION_MS } from '../constants/aseprite.ts';
import { decodeAseprite } from '../test/decodeAseprite.ts';
import type { DecodedAseprite } from '../test/decodeAseprite.ts';
import { imageFrom } from '../test/images.ts';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
import { encodeAseprite } from './encodeAseprite.ts';
import { pixelOffset, readPixel } from './imageData.ts';
import { MAX_PALETTE_ENTRIES } from './pngPalette.ts';
import { spriteSegments } from './spriteSegments.ts';

/**
 * That the bytes are an Aseprite document, read back by a reader that shares none of the writer's
 * code — see `src/test/decodeAseprite.ts`, which also checks the framing as it walks it.
 *
 * The boxes come from `spriteSegments` rather than being written out by hand, because what these
 * fixtures have to establish is the *chain*: the sprites the tab finds are the frames the file
 * carries. Boxes typed in here would agree with the writer and prove nothing about the app.
 */

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/**
 * A keyed sheet holding three sprites in two rows, arranged so that neither placement rule is
 * satisfied by accident.
 *
 * Row one is a tall sprite starting at row 1 and a narrow one starting at row 2, so the narrow one
 * has to be pushed down within its strip and centred across a canvas wider than it is. Row two is a
 * third sprite well below both. Each clears the four-pixel floor `spriteSegments` applies.
 */
const SPRITES: readonly { readonly box: SpriteBox; readonly color: Rgba }[] = [
  { box: { left: 1, top: 2, width: 1, height: 4, pixels: 4 }, color: { r: 200, g: 40, b: 40, a: 255 } },
  { box: { left: 4, top: 1, width: 3, height: 4, pixels: 12 }, color: { r: 40, g: 200, b: 90, a: 255 } },
  { box: { left: 2, top: 8, width: 2, height: 2, pixels: 4 }, color: { r: 60, g: 70, b: 220, a: 160 } },
];

function keyedSheet(): ImageData {
  return imageFrom(8, 10, (x, y) => {
    const sprite = SPRITES.find(
      ({ box }) => x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height,
    );
    return sprite?.color ?? CLEAR;
  });
}

/** The segmentation the tab itself would arrive at, which is where the frames come from. */
function boxesOf(image: ImageData): readonly SpriteBox[] {
  const found = spriteSegments(image, 0);
  return found.kind === 'SEGMENTED' ? found.boxes : [];
}

/**
 * The three sprites in the order the frames should carry them: by row, then left to right.
 *
 * The fixture above is declared in that order, and it is deliberately **not** the order
 * `spriteSegments` returns them in — that is topmost first, and the tall sprite starts a row above
 * the narrow one beside it, so the segmentation names it first while the frames must not.
 */
const FRAME_ORDER: readonly SpriteBox[] = SPRITES.map(({ box }) => box);

/**
 * Every pixel of every cel, resolved through the file's own palette and compared with the sheet.
 *
 * The check that matters: a cel could carry the right number of bytes, at the right size, in the
 * right place, and still hold the wrong region of the sheet. Resolving through the decoded palette
 * rather than comparing indices is what makes it independent of how the writer numbered them.
 */
function celsMatch(decoded: DecodedAseprite, image: ImageData, boxes: readonly SpriteBox[]): void {
  const palette = decoded.palette;
  expect(palette).not.toBeNull();
  if (palette === null) return;

  for (const [index, frame] of decoded.frames.entries()) {
    const box = boxes[index];
    const cel = frame.cels[0];
    expect(box).toBeDefined();
    expect(cel).toBeDefined();
    if (box === undefined || cel === undefined) continue;

    expect([cel.width, cel.height]).toEqual([box.width, box.height]);
    for (let y = 0; y < cel.height; y += 1) {
      for (let x = 0; x < cel.width; x += 1) {
        const entry = palette[cel.pixels[y * cel.width + x] ?? -1];
        const source = readPixel(image.data, pixelOffset(image.width, box.left + x, box.top + y));
        // A fully transparent pixel is collapsed onto one palette entry whatever its dead channels
        // held, which is `indexImage`'s one deliberate change — so alpha alone is what it promises.
        expect(entry?.a).toBe(source.a);
        if (source.a !== 0) expect(entry).toEqual(source);
      }
    }
  }
}

describe('encodeAseprite', () => {
  it('writes an indexed document whose header states the canvas the sprites need', async () => {
    const image = keyedSheet();
    const written = await encodeAseprite(image, boxesOf(image));
    const decoded = await decodeAseprite(written.bytes);

    expect(decoded.depth).toBe(8);
    // Three sprites at widths 1, 3 and 2, and strips five and two rows deep.
    expect([decoded.width, decoded.height]).toEqual([3, 5]);
    expect(decoded.frames).toHaveLength(3);
    expect(written.frames).toBe(3);
    expect(decoded.colors).toBe(decoded.palette?.length);
  });

  it('cuts one cel per sprite, holding that sprite and nothing else', async () => {
    const image = keyedSheet();
    const boxes = boxesOf(image);
    const decoded = await decodeAseprite((await encodeAseprite(image, boxes)).bytes);

    // Topmost first, which is the segmentation's own order and not the frames'.
    expect(boxes.map((box) => [box.left, box.top])).toEqual([
      [4, 1],
      [1, 2],
      [2, 8],
    ]);
    celsMatch(decoded, image, FRAME_ORDER);
  });

  it('keeps a sprite where it sat within its row, and centres it across', async () => {
    const image = keyedSheet();
    const decoded = await decodeAseprite((await encodeAseprite(image, boxesOf(image))).bytes);
    const placements = decoded.frames.map((frame) => [frame.cels[0]?.x, frame.cels[0]?.y]);

    // The one-wide sprite is leftmost, so it leads its row: it is centred across a canvas three
    // wide, and pushed down by the one row its row's tallest sprite starts above it. The three-wide
    // sprite follows, flush left and at the top. The third opens its own row, so it is at the top
    // of the canvas again however far down the sheet it sat.
    expect(placements).toEqual([
      [1, 1],
      [0, 0],
      [0, 0],
    ]);
  });

  it('tags each row of sprites as its own run of frames', async () => {
    const image = keyedSheet();
    const decoded = await decodeAseprite((await encodeAseprite(image, boxesOf(image))).bytes);

    expect(decoded.tags).toEqual([
      { from: 0, to: 1, direction: 0, name: 'Row 1' },
      { from: 2, to: 2, direction: 0, name: 'Row 2' },
    ]);
    // One user data chunk per tag, in the tags' own order, which is where a tag's colour lives.
    expect(decoded.tagUserData).toBe(decoded.tags.length);
  });

  it('carries the palette transparent-entry first, and names entry 0 as the transparent one', async () => {
    const image = keyedSheet();
    const decoded = await decodeAseprite((await encodeAseprite(image, boxesOf(image))).bytes);

    expect(decoded.transparentIndex).toBe(0);
    expect(decoded.palette?.[0]).toEqual(CLEAR);
    // A normal layer, because there is a transparent entry for that index to mean something.
    expect(decoded.layers).toHaveLength(1);
    expect((decoded.layers[0]?.flags ?? 0) & 8).toBe(0);
    expect(decoded.layers[0]?.name).toBe('Sheet');
  });

  it('states the frame duration in every frame and in the deprecated header field', async () => {
    const image = keyedSheet();
    const decoded = await decodeAseprite((await encodeAseprite(image, boxesOf(image))).bytes);

    expect(decoded.speedMs).toBe(ASEPRITE_FRAME_DURATION_MS);
    expect(decoded.frames.map((frame) => frame.durationMs)).toEqual([
      ASEPRITE_FRAME_DURATION_MS,
      ASEPRITE_FRAME_DURATION_MS,
      ASEPRITE_FRAME_DURATION_MS,
    ]);
  });

  it('writes a sheet with nothing separable on it whole, on a background layer', async () => {
    // Fully opaque, so `spriteSegments` answers `SOLID` and finds no boxes — and so the palette has
    // no transparent entry for the header's transparent index to name. A normal layer would then
    // render entry 0 as holes, which is why this one is a background layer.
    const image = imageFrom(6, 4, (x, y) => ({ r: x * 10, g: y * 10, b: 0, a: 255 }));
    expect(spriteSegments(image, 0).kind).toBe('SOLID');
    const written = await encodeAseprite(image, boxesOf(image));
    const decoded = await decodeAseprite(written.bytes);

    expect([written.frames, written.tags]).toEqual([1, 0]);
    expect([decoded.width, decoded.height]).toEqual([6, 4]);
    expect((decoded.layers[0]?.flags ?? 0) & 8).toBe(8);
    expect(decoded.layers[0]?.name).toBe('Background');
    // No tags chunk at all rather than one stating zero tags.
    expect(decoded.frames[0]?.chunkTypes).not.toContain(0x2018);
    expect(decoded.tags).toEqual([]);
  });

  it('falls back to RGB colour mode past a palette, and still holds the pixels exactly', async () => {
    const image = imageFrom(MAX_PALETTE_ENTRIES + 1, 2, (x) => ({
      r: x % 256,
      g: Math.floor(x / 256),
      b: 7,
      a: 255,
    }));
    const written = await encodeAseprite(image, boxesOf(image));
    const decoded = await decodeAseprite(written.bytes);

    expect(written.paletteEntries).toBeNull();
    expect(decoded.depth).toBe(32);
    expect(decoded.palette).toBeNull();
    expect(decoded.colors).toBe(0);
    expect([...(decoded.frames[0]?.cels[0]?.pixels ?? [])]).toEqual([...image.data]);
  });

  it('refuses a canvas the format cannot state, rather than wrapping it silently', async () => {
    // Both canvas dimensions are `WORD`s, and the tab bounds a sheet by area rather than by edge, so
    // a very wide and very short sheet reaches this. Wrapping would open showing a fraction of it.
    const image = imageFrom(65536, 1, () => CLEAR);
    await expect(encodeAseprite(image, [])).rejects.toThrow(/cannot exceed 65535 pixels/);
  });
});
