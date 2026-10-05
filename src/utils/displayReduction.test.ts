import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { displayReduction } from './displayReduction.ts';

const icon = (role: string) => ({ ...defaultSubjectFor('ICON'), role });
const DRAWN = { width: 128, height: 128 };

/**
 * Whether a sheet states a reduction between the size it is drawn at and the size it is shown at (audit
 * finding P6) — read from the field the category declares as its `DISPLAY_SIZE`, never from a key.
 */
describe('displayReduction', () => {
  it('states the display against a drawn size larger than it', () => {
    expect(displayReduction('ICON', icon('32 × 32 Pixels'), DRAWN)).toEqual({
      display: { width: 32, height: 32 },
      drawn: { size: DRAWN, fit: { shown: 32, drawn: 128 } },
    });
  });

  it('fits the drawing by the axis that runs out of display first, whatever the shapes', () => {
    // 24/128 across beats 48/64 down, so the width binds — the smaller edges, 24 and 64, would not say so.
    expect(displayReduction('ICON', icon('24 × 48 Pixels'), { width: 128, height: 64 })?.drawn?.fit).toEqual({
      shown: 24,
      drawn: 128,
    });
    expect(displayReduction('ICON', icon('48 × 24 Pixels'), { width: 64, height: 128 })?.drawn?.fit).toEqual({
      shown: 24,
      drawn: 128,
    });
  });

  it('states a reduction where the smaller edges tie but the shapes do not', () => {
    // 128 × 64 shown at 64 × 128 is halved to fit, though both smaller edges are 64.
    expect(displayReduction('ICON', icon('64 × 128 Pixels'), { width: 128, height: 64 })?.drawn?.fit).toEqual(
      {
        shown: 64,
        drawn: 128,
      },
    );
  });

  it('states the display alone where the sheet states no drawn size', () => {
    expect(displayReduction('ICON', icon('24 × 24 Pixels'), null)).toEqual({
      display: { width: 24, height: 24 },
      drawn: null,
    });
  });

  it('states none where the drawing is no larger than it is shown', () => {
    expect(displayReduction('ICON', icon('32 × 32 Pixels'), { width: 32, height: 32 })).toBeNull();
    expect(displayReduction('ICON', icon('64 × 64 Pixels'), { width: 24, height: 24 })).toBeNull();
    // 32 × 16 fits a 64 × 32 display at a scale of 2, which is an enlargement rather than a reduction.
    expect(displayReduction('ICON', icon('64 × 32 Pixels'), { width: 32, height: 16 })).toBeNull();
  });

  it('states none for a value with no size in it, or one too small to hold a stroke', () => {
    expect(displayReduction('ICON', icon('Tiny'), DRAWN)).toBeNull();
    expect(displayReduction('ICON', icon(''), null)).toBeNull();
    expect(displayReduction('ICON', icon('2 px'), DRAWN)).toBeNull();
  });

  it('reads nothing from a category whose `role` is not a display size', () => {
    // A character's role is a role: `24 × 24` typed there is not a size the game shows it at.
    expect(
      displayReduction('CHARACTER', { ...defaultSubjectFor('CHARACTER'), role: '24 × 24' }, null),
    ).toBeNull();
  });
});
