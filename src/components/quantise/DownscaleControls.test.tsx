import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { COLOR_MERGE_HELD_REASONS, COLOR_MERGE_RANGE } from '../../constants/quantiser.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { ColorReduction, Rgba } from '../../types/quantiser.ts';
import { DownscaleControls } from './DownscaleControls.tsx';

/**
 * Whether the Colour merge slider is live exactly where the merge runs.
 *
 * The pass itself is pinned in `utils/mergeColors.test.ts` and its exemption in
 * `utils/mergeIsExempt.test.ts`. What only this panel can get wrong is agreeing with that exemption:
 * a slider left live under a pinned or locked palette with no dither moved a dial that reached
 * nothing, and recorded an undo step for it.
 */

const white: Rgba = { r: 255, g: 255, b: 255, a: 255 };
const PINNED: ColorReduction = { kind: 'PALETTE', entries: [white] };
const LOCKED: ColorReduction = { kind: 'LOCKED', entries: [white], snap: 21 };
const BUDGET: ColorReduction = { kind: 'MAX_COLORS', maxColors: 16 };

const mergeSlider = () => screen.getByRole('slider', { name: 'Colour merge' });

describe('DownscaleControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it.each([
    ['pinned', PINNED, COLOR_MERGE_HELD_REASONS.PALETTE],
    ['locked', LOCKED, COLOR_MERGE_HELD_REASONS.LOCKED],
  ])('withdraws the merge under a %s palette with no dither, and says why', (_, reduction, reason) => {
    render(<DownscaleControls reduction={reduction} />);
    const before = useQuantiseStore.getState().colorMerge;

    expect(mergeSlider()).toHaveAttribute('aria-disabled', 'true');
    expect(mergeSlider()).toHaveAccessibleDescription(reason);

    // A change event rather than a key: user-event moves no range input on an arrow key, so a
    // keyboard step here would pass whether or not the move was refused.
    fireEvent.change(mergeSlider(), { target: { value: String(COLOR_MERGE_RANGE.max) } });

    expect(before).not.toBe(COLOR_MERGE_RANGE.max);
    expect(useQuantiseStore.getState().colorMerge).toBe(before);
  });

  it('offers the merge again once a dither applies the palette last', async () => {
    render(<DownscaleControls reduction={LOCKED} />);
    const user = userEvent.setup({ delay: null });

    await user.selectOptions(screen.getByRole('combobox', { name: /^Dither/ }), 'BAYER_4');

    expect(mergeSlider()).toHaveAttribute('aria-disabled', 'false');
    expect(screen.queryByText(COLOR_MERGE_HELD_REASONS.LOCKED)).not.toBeInTheDocument();
  });

  it.each([
    ['a colour budget', BUDGET],
    ['no reduction at all', null],
  ])('leaves the merge live under %s, which chose its colours from the sheet', (_, reduction) => {
    render(<DownscaleControls reduction={reduction} />);

    expect(mergeSlider()).toHaveAttribute('aria-disabled', 'false');
    expect(mergeSlider()).not.toHaveAttribute('aria-describedby');
  });
});
