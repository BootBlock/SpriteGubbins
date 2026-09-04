import { describe, expect, it } from 'vitest';
import { imageFrom } from '../test/images.ts';
import type { Rgba } from '../types/quantiser.ts';
import { colorHistogram, toHex } from './imageData.ts';
import { fixedPaletteColors, paletteEntriesFrom } from './paletteEntries.ts';

const CLEAR: Rgba = { r: 0, g: 0, b: 0, a: 0 };
const GREEN: Rgba = { r: 40, g: 160, b: 60, a: 255 };
/** The same green along an anti-aliased edge: one colour, two coverages. */
const SOFT_GREEN: Rgba = { r: 40, g: 160, b: 60, a: 90 };
const RED: Rgba = { r: 200, g: 40, b: 40, a: 255 };

/** The reading as the pipeline takes it — the histogram first, as `quantiseImage` does. */
const entriesOf = (image: ImageData) => paletteEntriesFrom(colorHistogram(image));

describe('paletteEntriesFrom', () => {
  it('holds one entry per colour however many coverages it appears at', () => {
    // Four green pixels across two alphas, and one red — three distinct pixel values, two colours.
    const image = imageFrom(5, 1, (x) => [GREEN, SOFT_GREEN, GREEN, SOFT_GREEN, RED][x] ?? CLEAR);

    expect(entriesOf(image).map(toHex)).toEqual([toHex(GREEN), toHex(RED)]);
  });

  it('returns every entry opaque, whatever coverage it was found at', () => {
    const image = imageFrom(2, 1, (x) => (x === 0 ? SOFT_GREEN : CLEAR));

    expect(entriesOf(image)).toEqual([GREEN]);
  });

  it('orders the entries most-used first', () => {
    const image = imageFrom(4, 1, (x) => (x === 3 ? GREEN : RED));

    expect(entriesOf(image).map(toHex)).toEqual([toHex(RED), toHex(GREEN)]);
  });

  it('leaves fully transparent pixels out entirely, so a wholly keyed sheet has no palette', () => {
    // The state the lock panel holds its button shut for — see `PALETTE_LOCK_GUIDANCE.noColours`.
    expect(entriesOf(imageFrom(3, 2, () => CLEAR))).toEqual([]);
  });
});

describe('fixedPaletteColors', () => {
  it('reads a machine palette in the order it is written', () => {
    expect(fixedPaletteColors(['#28A03C', '#C82828'])).toEqual([GREEN, RED]);
  });

  it('drops an entry that will not parse rather than making it black', () => {
    expect(fixedPaletteColors(['#28A03C', 'chartreuse', '#GGGGGG'])).toEqual([GREEN]);
  });
});
