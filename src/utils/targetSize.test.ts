import { describe, expect, it } from 'vitest';
import { PRESETS } from '../constants/presets/index.ts';
import { imageFrom } from '../test/images.ts';
import { parseTargetSize, targetSizeGrid } from './targetSize.ts';

/** Only the dimensions matter here, so every pixel can be the same colour. */
function sheet(width: number, height: number): ImageData {
  return imageFrom(width, height, () => ({ r: 1, g: 2, b: 3, a: 255 }));
}

describe('parseTargetSize', () => {
  it('reads the size out of the prose the shipped presets actually hold', () => {
    // Not a hypothetical format: this is `US_CHARACTER_RIG`'s own `spriteTargetSize`. A parser that
    // only handled a bare `48 × 96` would find nothing in the app's own default content.
    expect(parseTargetSize('48 × 96 px assembled (2 metres tall at 48 px per metre)')).toEqual({
      width: 48,
      height: 96,
    });
    expect(parseTargetSize('48 × 48 px per tile (1 metre)')).toEqual({ width: 48, height: 48 });
  });

  it('parses every shipped preset that names a size', () => {
    // Guards the field's real vocabulary against a future preset written in a form the parser drops
    // on the floor — which would look like the candidate simply not being offered.
    const sizes = PRESETS.map((preset) => preset.output.spriteTargetSize).filter((text) => text !== '');
    expect(sizes.length).toBeGreaterThan(0);
    for (const text of sizes) {
      expect(parseTargetSize(text), `no size found in "${text}"`).not.toBeNull();
    }
  });

  it('accepts the three separators people actually type', () => {
    expect(parseTargetSize('64x64')).toEqual({ width: 64, height: 64 });
    expect(parseTargetSize('64 X 32')).toEqual({ width: 64, height: 32 });
    expect(parseTargetSize('16*16 px')).toEqual({ width: 16, height: 16 });
  });

  it('takes the first pair, so a trailing rate cannot overrule the size', () => {
    expect(parseTargetSize('32 × 32 px, roughly 3 × 4 metres')).toEqual({ width: 32, height: 32 });
  });

  it('answers null rather than guessing from loose numbers', () => {
    // The reason a pair is required. Three numbers here and not a size among them; a parser taking
    // the first number would offer a candidate derived from "2 metres".
    expect(parseTargetSize('2 metres tall at 48 px per metre')).toBeNull();
    expect(parseTargetSize('')).toBeNull();
    expect(parseTargetSize('as big as it needs to be')).toBeNull();
    expect(parseTargetSize('0 × 0')).toBeNull();
  });
});

describe('targetSizeGrid', () => {
  it('answers the largest scale at which the sheet still seats every component', () => {
    // 1536 ÷ (3 × 48) = 10 columns and 1536 ÷ (3 × 96) = 5 rows — 50 cells for 43 components. At 4×
    // it is 8 × 4 = 32 cells, which is short, so 3 is the tightest scale the sheet can have used.
    expect(targetSizeGrid(sheet(1536, 1536), { width: 48, height: 96 }, 43)).toBe(3);
  });

  it('falls as the sheet gets smaller, and as the sheet asks for more', () => {
    expect(targetSizeGrid(sheet(640, 640), { width: 32, height: 32 }, 4)).toBe(10);
    expect(targetSizeGrid(sheet(640, 640), { width: 32, height: 32 }, 100)).toBe(2);
  });

  it('answers null when the sheet cannot hold the components even at 1:1', () => {
    // The target size and the returned sheet disagree, and no scale reconciles them. Offering a
    // candidate anyway would be inventing one.
    expect(targetSizeGrid(sheet(64, 64), { width: 48, height: 96 }, 4)).toBeNull();
  });

  it('answers null for a sheet with no components on it', () => {
    expect(targetSizeGrid(sheet(1536, 1536), { width: 48, height: 96 }, 0)).toBeNull();
  });
});
