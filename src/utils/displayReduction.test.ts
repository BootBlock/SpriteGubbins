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
      drawn: DRAWN,
    });
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
