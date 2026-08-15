import { describe, expect, it } from 'vitest';
import { NOMINAL_SHEET_SIZE, SHEET_CELL_PITCH } from './sheetCanvas.ts';
import { ASPECT_RATIOS } from '../types/output.ts';

/**
 * The nominal canvas is four hand-written pairs, and the two things it claims about them are exactly
 * what a hand-written pair loses: that each is the shape its identifier names, and that they are all
 * the same size. Both are read back here rather than trusted.
 */
describe('NOMINAL_SHEET_SIZE', () => {
  it('covers every sheet shape the studio offers', () => {
    expect(Object.keys(NOMINAL_SHEET_SIZE).sort()).toEqual([...ASPECT_RATIOS].sort());
  });

  it('is the shape each identifier names, at one long edge throughout', () => {
    const longEdges = new Set<number>();

    for (const aspect of ASPECT_RATIOS) {
      const named = /_(\d+)_(\d+)$/u.exec(aspect);
      const namedWidth = Number(named?.[1]);
      const namedHeight = Number(named?.[2]);
      expect(
        Number.isInteger(namedWidth) && Number.isInteger(namedHeight),
        `${aspect} does not name a ratio`,
      ).toBe(true);

      const size = NOMINAL_SHEET_SIZE[aspect];
      const long = Math.max(size.width, size.height);
      const short = Math.min(size.width, size.height);
      // Floored rather than rounded: the canvas is what the sheet can be relied on to hold, and
      // half a pixel of optimism is still optimism.
      const shorter = Math.min(namedWidth, namedHeight);
      const longer = Math.max(namedWidth, namedHeight);

      longEdges.add(long);
      expect(short, `${aspect} is not the ratio its name states`).toBe(Math.floor((long * shorter) / longer));
      // 16:9 is wider than tall and 9:16 is taller than wide, which the ratio alone cannot say.
      expect(size.width > size.height, `${aspect} is the wrong way round`).toBe(namedWidth > namedHeight);
    }

    // One nominal sheet at four shapes, not four sheets. A shape given a longer edge than the rest
    // would be given a larger scale for no reason but its name.
    expect([...longEdges], 'the shapes do not share one long edge').toHaveLength(1);
  });
});

describe('SHEET_CELL_PITCH', () => {
  it('leaves room for the spacing the layout section asks for', () => {
    // Below 1 the cells would overlap; at 1 they touch, which the layout section forbids outright
    // — "generously and uniformly spaced" is what the gutter is for, and a scale derived without one
    // is a scale the generator has to shrink the artwork to obey.
    expect(SHEET_CELL_PITCH).toBeGreaterThan(1);
  });
});
