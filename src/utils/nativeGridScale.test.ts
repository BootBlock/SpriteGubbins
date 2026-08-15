import { describe, expect, it } from 'vitest';
import { nativeGridScale } from './nativeGridScale.ts';

/** The configuration the field is read under: pixel art, and the one profile that has no scale. */
function scaleFor(spriteTargetSize: string, components: number): number | null {
  return nativeGridScale('PIXEL_ART', 'CUSTOM', spriteTargetSize, 'WIDE_16_9', components);
}

describe('nativeGridScale', () => {
  it('answers the enlargement the reported sheet needed and never asked for', () => {
    // The configuration from the report: twelve components at 16 × 32. On the nominal 1024 × 576
    // sheet each takes a 24 × 48 cell with its gutter, which seats 7 × 2 = 14 cells at 6× and only
    // 6 × 1 at 7× — so 6 is the largest whole-number scale the canvas can be relied on to hold, and
    // a component lands at 96 × 192 delivered pixels instead of the 16 × 32 specks the prompt could
    // previously be read as asking for.
    expect(scaleFor('16 × 32 px', 12)).toBe(6);
  });

  it('falls as the sheet asks for more components', () => {
    // Same size, the practical ceiling of a sheet: 14 × 4 cells at 3×, and 10 × 3 at 4× is short.
    expect(scaleFor('16 × 32 px', 43)).toBe(3);
  });

  it('is a function of the sheet shape as well', () => {
    // A square canvas is 1024 × 1024 rather than 1024 × 576, so the same twelve components fit at 7×.
    expect(nativeGridScale('PIXEL_ART', 'CUSTOM', '16 × 32 px', 'SQUARE_1_1', 12)).toBe(7);
  });

  it('reads the size out of the prose a preset actually holds', () => {
    expect(scaleFor('48 × 96 px assembled (2 metres tall at 48 px per metre)', 12)).toBe(2);
  });

  it('says nothing where the style has no native grid to enlarge', () => {
    // Section 0's resampling rule stands unqualified on a painted sheet, which is correct there:
    // there is no grid of placed pixels to multiply.
    expect(nativeGridScale('PAINTED_2D', 'CUSTOM', '16 × 32 px', 'WIDE_16_9', 12)).toBeNull();
    expect(nativeGridScale('CLAY_RENDER', 'CUSTOM', '16 × 32 px', 'WIDE_16_9', 12)).toBeNull();
    expect(nativeGridScale('RETRO_PIXEL_ART', 'CUSTOM', '16 × 32 px', 'WIDE_16_9', 12)).toBe(6);
  });

  it('says nothing where the profile states a scale of its own', () => {
    // The gate `minFeatureSize` and `smallScaleDiscipline` already apply to this field: the other
    // three profiles *are* a scale, so a derived figure beside one is two answers to one question.
    for (const profile of ['HIGH_RESOLUTION', 'MID_RESOLUTION', 'RETRO_16_BIT'] as const) {
      expect(nativeGridScale('PIXEL_ART', profile, '16 × 32 px', 'WIDE_16_9', 12)).toBeNull();
    }
  });

  it('says nothing where the stated size holds no readable pair', () => {
    expect(scaleFor('', 12)).toBeNull();
    expect(scaleFor('roughly two metres tall at 48 px per metre', 12)).toBeNull();
  });

  it('says nothing where there is no enlargement to state', () => {
    // A component already large enough to fill its share of the canvas comes back at 1:1, where the
    // delivered pixels *are* the native ones — which is what section 0 says without any help.
    expect(scaleFor('96 × 128 px per bay', 12)).toBeNull();
    // And a size the sheet cannot seat at all has no scale to offer rather than a bad one.
    expect(scaleFor('512 × 512 px', 43)).toBeNull();
  });
});
