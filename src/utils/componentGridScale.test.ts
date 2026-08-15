import { describe, expect, it } from 'vitest';
import { componentGridScale } from './componentGridScale.ts';

describe('componentGridScale', () => {
  it('answers the largest scale at which the sheet still seats every component', () => {
    // 1536 ÷ (3 × 48) = 10 columns and 1536 ÷ (3 × 96) = 5 rows — 50 cells for 43 components. At 4×
    // it is 8 × 4 = 32 cells, which is short, so 3 is the largest scale that fits.
    expect(componentGridScale({ width: 1536, height: 1536 }, { width: 48, height: 96 }, 43)).toBe(3);
  });

  it('falls as the sheet gets smaller, and as the sheet asks for more', () => {
    expect(componentGridScale({ width: 640, height: 640 }, { width: 32, height: 32 }, 4)).toBe(10);
    expect(componentGridScale({ width: 640, height: 640 }, { width: 32, height: 32 }, 100)).toBe(2);
  });

  it('takes its ceiling from the geometry rather than from a limit of its own', () => {
    // One 16 × 16 component alone on a 1024-pixel canvas is a scale of 64, and nothing here caps it
    // below that. A caller that has a ceiling of its own — the quantiser's typeable range — clamps
    // the answer afterwards, which is safe because every scale below one that fits also fits.
    expect(componentGridScale({ width: 1024, height: 1024 }, { width: 16, height: 16 }, 1)).toBe(64);
  });

  it('accepts a cell that is not a whole number of pixels, and does not round it', () => {
    // How a caller pays for the gutter between components: a component given half its own size of
    // clearance lands on a half pixel whenever its own size is odd. A 17 × 19 component becomes a
    // 25.5 × 28.5 cell, which seats eight components at 10× — where rounding *either* edge up to a
    // whole number answers 9, a tenth of the scale thrown away for the convenience of an integer.
    expect(componentGridScale({ width: 1024, height: 576 }, { width: 25.5, height: 28.5 }, 8)).toBe(10);
    expect(componentGridScale({ width: 1024, height: 576 }, { width: 26, height: 28.5 }, 8)).toBe(9);
    expect(componentGridScale({ width: 1024, height: 576 }, { width: 25.5, height: 29 }, 8)).toBe(9);
  });

  it('answers null when the sheet cannot seat the components even at 1:1', () => {
    expect(componentGridScale({ width: 64, height: 64 }, { width: 48, height: 96 }, 4)).toBeNull();
  });

  it('answers null for a sheet with no components on it', () => {
    expect(componentGridScale({ width: 1536, height: 1536 }, { width: 48, height: 96 }, 0)).toBeNull();
  });

  it('answers null for a cell with no extent, rather than searching an unbounded ceiling', () => {
    // A zero-width cell seats an unbounded number of components, which makes the geometric ceiling
    // infinite — so this is the one input where the search would not terminate.
    expect(componentGridScale({ width: 1024, height: 1024 }, { width: 0, height: 16 }, 4)).toBeNull();
    expect(componentGridScale({ width: 1024, height: 1024 }, { width: 16, height: 0 }, 4)).toBeNull();
  });
});
