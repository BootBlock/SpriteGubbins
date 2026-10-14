import { describe, expect, it } from 'vitest';
import type { TargetSize } from '../../types/output.ts';
import { displayReduction, type DisplayReduction } from '../../utils/displayReduction.ts';
import { defaultSubjectFor } from '../categories/index.ts';
import { describeDisplayReduction } from './displayReduction.ts';

const square = (edge: number) => ({ width: edge, height: edge });

/** The reduction the app itself resolves for a display of `display` and a drawing of `drawn`. */
function reduction(display: TargetSize, drawn: TargetSize | null): DisplayReduction {
  const role = `${String(display.width)} × ${String(display.height)} Pixels`;
  const resolved = displayReduction('ICON', { ...defaultSubjectFor('ICON'), role }, drawn);
  if (resolved === null) throw new Error(`${role} states no reduction from that drawing.`);
  return resolved;
}

/**
 * Section 2's *Smallest display size* line states geometry, not an adjective (audit finding P6): the
 * reduction, and the narrowest stroke and outline that survive it, in the drawing's own units.
 */
describe('describeDisplayReduction', () => {
  it('states the reduction and the floors in pixels where the drawn size is stated', () => {
    const line = describeDisplayReduction(reduction(square(32), square(128)), false, true);
    expect(line).toBe(
      'Every component is shown as small as 32 × 32 px, 1/4 of the 128 × 128 px it is drawn at. No stroke, gap or accent is narrower than 8 delivered pixels, so each keeps at least two displayed pixels once reduced, and the outline this section states is never thinner than 4 delivered pixels, one displayed pixel, whatever width it names.',
    );
  });

  it('rounds a floor up where the reduction is not a whole number', () => {
    // 48 of 128 is 3/8: a displayed pixel is 2⅔ drawn pixels, so two of them need 6 and one needs 3.
    const line = describeDisplayReduction(reduction(square(48), square(128)), false, true);
    expect(line).toContain('3/8 of the 128 × 128 px it is drawn at');
    expect(line).toContain('narrower than 6 delivered pixels');
    expect(line).toContain('never thinner than 3 delivered pixels');
  });

  it('states the one scale the drawing fits its display at where the two differ in shape', () => {
    // 128 × 64 into 24 × 48 fits by its width, at 24/128 = 3/16: a displayed pixel is 5⅓ drawn pixels,
    // so two of them need 11 and one needs 6. The smaller edges, 24 and 64, would say 3/8, 6 and 3.
    const line = describeDisplayReduction(
      reduction({ width: 24, height: 48 }, { width: 128, height: 64 }),
      false,
      true,
    );
    expect(line).toContain(
      'Every component is shown as small as 24 × 48 px, 3/16 of the 128 × 64 px it is drawn at.',
    );
    expect(line).toContain('narrower than 11 delivered pixels');
    expect(line).toContain('never thinner than 6 delivered pixels');
    // And by its height where that is the axis that runs out first: 64 × 128 into 48 × 24 is 24/128.
    expect(
      describeDisplayReduction(reduction({ width: 48, height: 24 }, { width: 64, height: 128 }), false, true),
    ).toContain('3/16 of the 64 × 128 px it is drawn at');
  });

  it('counts in native pixels where the stated size is a native grid', () => {
    const line = describeDisplayReduction(reduction(square(24), square(32)), true, true);
    expect(line).toContain('3/4 of the 32 × 32 native pixels it is drawn at');
    expect(line).toContain('narrower than 3 native pixels');
    expect(line).not.toContain('delivered');
  });

  it('states the floors as fractions of the square where no drawn size is stated', () => {
    const line = describeDisplayReduction(reduction(square(24), null), false, true);
    expect(line).toBe(
      'Every component is shown as small as 24 × 24 px, so one displayed pixel is 1/24 of the width of the square it is drawn to. No stroke, gap or accent is narrower than 1/12 of that width, so each keeps at least two displayed pixels once reduced, and the outline this section states is never thinner than 1/24 of it, one displayed pixel, whatever width it names.',
    );
    expect(describeDisplayReduction(reduction(square(25), null), false, true)).toContain(
      'narrower than 2/25 of that width',
    );
    // A square fits a display of another shape by the display's smaller edge.
    expect(describeDisplayReduction(reduction({ width: 24, height: 48 }, null), false, true)).toContain(
      'one displayed pixel is 1/24 of the width of the square',
    );
  });

  it('names no outline where the sheet draws none', () => {
    for (const drawn of [square(128), null]) {
      expect(describeDisplayReduction(reduction(square(32), drawn), false, false)).not.toContain('outline');
    }
  });
});
