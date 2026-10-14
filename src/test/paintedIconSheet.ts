import type { IconLook } from '../types/iconRoster.ts';
import type { Rgba, SpriteBox } from '../types/quantiser.ts';
import { imageFrom } from './images.ts';

/**
 * A painted 4 × 4 icon sheet of the kind ChatGPT 5.6 Sol returns, scaled down to keep a test quick.
 *
 * A real one draws each tile at 230 to 380 pixels; this draws them on a 170-pixel step, which still
 * asks every resizing fit for a reduction to 128 that is not a whole number, and still holds a
 * different colour in nearly every pixel, so a resample has blends to write. Under the full-bleed look
 * each icon is an opaque square a pixel or two off square, as a generator's tiles are; under the
 * isolated look each is a disc of its own size on clear ground, so the relative sizes a set keeps
 * under `SCALE_SET` can be measured.
 *
 * The boxes are stated rather than segmented, because the pack is what is under test and the
 * segmentation has suites of its own.
 */
export interface PaintedIconSheet {
  readonly image: ImageData;
  readonly boxes: readonly SpriteBox[];
  readonly names: readonly string[];
}

/** The grid's step, in sheet pixels. */
export const PAINTED_STEP = 170;

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };

/** One icon's slot on the grid, reading order. */
function slot(index: number): { readonly column: number; readonly row: number } {
  return { column: index % 4, row: Math.floor(index / 4) };
}

/** The extent of one icon, centred on its slot: a near-square tile, or a disc of its own diameter. */
function iconBox(index: number, look: IconLook): SpriteBox {
  const { column, row } = slot(index);
  const width = look === 'FULL_BLEED_TILE' ? 150 + (index % 3) : 60 + ((index * 23) % 90);
  const height = look === 'FULL_BLEED_TILE' ? 150 + ((index + 1) % 2) : width;
  const left = column * PAINTED_STEP + Math.floor((PAINTED_STEP - width) / 2);
  const top = row * PAINTED_STEP + Math.floor((PAINTED_STEP - height) / 2);
  return { left, top, width, height, pixels: width * height };
}

/** A smooth field of colour across one icon, different for every icon. */
function paint(index: number, x: number, y: number, box: SpriteBox): Rgba {
  const across = (x - box.left) / box.width;
  const down = (y - box.top) / box.height;
  return {
    r: Math.round(40 + 200 * across),
    g: Math.round(30 + 180 * down),
    b: (index * 15 + Math.round(60 * across * down)) % 256,
    a: 255,
  };
}

export function paintedIconSheet(look: IconLook): PaintedIconSheet {
  const boxes = Array.from({ length: 16 }, (_, index) => iconBox(index, look));
  const image = imageFrom(PAINTED_STEP * 4, PAINTED_STEP * 4, (x, y) => {
    const index = Math.floor(y / PAINTED_STEP) * 4 + Math.floor(x / PAINTED_STEP);
    const box = boxes[index];
    if (box === undefined) return CLEAR;
    const inside = x >= box.left && x < box.left + box.width && y >= box.top && y < box.top + box.height;
    if (!inside) return CLEAR;
    if (look === 'ISOLATED_MARK') {
      const radius = box.width / 2;
      const dx = x + 0.5 - (box.left + radius);
      const dy = y + 0.5 - (box.top + radius);
      if (dx * dx + dy * dy > radius * radius) return CLEAR;
    }
    return paint(index, x, y, box);
  });
  return { image, boxes, names: boxes.map((_, index) => `icon-${String(index + 1)}`) };
}
