import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import { identityPalette } from './identityPalette.ts';
import { imagePalette, reduceImagePalette } from './imagePalette.ts';
import { readPalette } from './readPalette.ts';

/**
 * That each job is answered by the reading it names, and with that reading's own answer.
 *
 * The readings are tested beside themselves. What only this file can get wrong is the routing — a
 * `reduce` answered by the swatch reading would pin a sheet's first 256 colours as the reader's
 * palette, which is the outcome the refusal exists to prevent.
 */

const MAGENTA = { r: 255, g: 0, b: 255, a: 255 };
/** Eight reds and a magenta field, so every reading gives a different answer. */
const SHEET = imageFrom(9, 2, (x, y) =>
  y === 0 && x < 8 ? { r: 64 + x * 16, g: 0, b: 0, a: 255 } : MAGENTA,
);

describe('readPalette', () => {
  it('reads a swatch in the author’s order, and refuses one past its cap', () => {
    expect(readPalette({ kind: 'swatch', image: SHEET, max: 256 })).toEqual(imagePalette(SHEET, 256));
    expect(readPalette({ kind: 'swatch', image: SHEET, max: 4 })).toBeNull();
  });

  it('reduces to the cap rather than refusing', () => {
    const reduced = readPalette({ kind: 'reduce', image: SHEET, max: 4 });

    expect(reduced).toEqual(reduceImagePalette(SHEET, 4));
    expect(reduced).toHaveLength(4);
  });

  it('reads the identity palette against the key it is handed', () => {
    const read = readPalette({ kind: 'identity', image: SHEET, backgroundKey: MAGENTA });

    expect(read).toEqual(identityPalette(SHEET, MAGENTA));
    expect(read).not.toContain('#FF00FF');
  });
});
