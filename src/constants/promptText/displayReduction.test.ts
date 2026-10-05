import { describe, expect, it } from 'vitest';
import { describeDisplayReduction } from './displayReduction.ts';

const square = (edge: number) => ({ width: edge, height: edge });

/**
 * Section 2's *Smallest display size* line states geometry, not an adjective (audit finding P6): the
 * reduction, and the narrowest stroke and outline that survive it, in the drawing's own units.
 */
describe('describeDisplayReduction', () => {
  it('states the reduction and the floors in pixels where the drawn size is stated', () => {
    const line = describeDisplayReduction({ display: square(32), drawn: square(128) }, false, true);
    expect(line).toBe(
      'Every component is shown as small as 32 × 32 px, 1/4 of the 128 × 128 px it is drawn at. No stroke, gap or accent is narrower than 8 delivered pixels, so each keeps at least two displayed pixels once reduced, and the outline this section states is never thinner than 4 delivered pixels, one displayed pixel, whatever width it names.',
    );
  });

  it('rounds a floor up where the reduction is not a whole number', () => {
    // 48 of 128 is 3/8: a displayed pixel is 2⅔ drawn pixels, so two of them need 6 and one needs 3.
    const line = describeDisplayReduction({ display: square(48), drawn: square(128) }, false, true);
    expect(line).toContain('3/8 of the 128 × 128 px it is drawn at');
    expect(line).toContain('narrower than 6 delivered pixels');
    expect(line).toContain('never thinner than 3 delivered pixels');
  });

  it('counts in native pixels where the stated size is a native grid', () => {
    const line = describeDisplayReduction({ display: square(24), drawn: square(32) }, true, true);
    expect(line).toContain('3/4 of the 32 × 32 native pixels it is drawn at');
    expect(line).toContain('narrower than 3 native pixels');
    expect(line).not.toContain('delivered');
  });

  it('states the floors as fractions of the square where no drawn size is stated', () => {
    const line = describeDisplayReduction({ display: square(24), drawn: null }, false, true);
    expect(line).toBe(
      'Every component is shown as small as 24 × 24 px, so one displayed pixel is 1/24 of the width of the square it is drawn to. No stroke, gap or accent is narrower than 1/12 of that width, so each keeps at least two displayed pixels once reduced, and the outline this section states is never thinner than 1/24 of it, one displayed pixel, whatever width it names.',
    );
    expect(describeDisplayReduction({ display: square(25), drawn: null }, false, true)).toContain(
      'narrower than 2/25 of that width',
    );
  });

  it('names no outline where the sheet draws none', () => {
    for (const drawn of [square(128), null]) {
      expect(describeDisplayReduction({ display: square(32), drawn }, false, false)).not.toContain('outline');
    }
  });
});
