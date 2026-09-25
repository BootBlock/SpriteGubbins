import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedChoice } from './SegmentedChoice.tsx';

/**
 * One value from a small fixed set, as a row of pills.
 *
 * It was extracted because the second copy is where `aria-pressed` goes missing, and that attribute is
 * doing two jobs: it is how a screen reader hears which pill is current, and it is what `index.css`'s
 * forced-colours block keys the selected state off, so a row that marks "current" with a fill alone
 * marks nothing in that mode. The group needs a name for the same reader, or it hears "8×, pressed" with
 * nothing to say what quantity is at 8.
 */
function renderChoice(value: number) {
  const onChange = vi.fn();
  render(
    <SegmentedChoice
      label="Preview magnification"
      values={[1, 2, 4, 8]}
      value={value}
      format={(scale) => `${String(scale)}×`}
      onChange={onChange}
    />,
  );
  return { onChange, group: screen.getByRole('group', { name: 'Preview magnification' }) };
}

describe('SegmentedChoice', () => {
  it('names the row, and labels each pill in the caller’s words', () => {
    const { group } = renderChoice(4);

    const labels = within(group)
      .getAllByRole('button')
      .map((pill) => pill.textContent);
    expect(labels).toStrictEqual(['1×', '2×', '4×', '8×']);
  });

  it('marks exactly the current value as pressed', () => {
    const { group } = renderChoice(4);

    const pressed = within(group).getAllByRole('button', { pressed: true });
    expect(pressed.map((pill) => pill.textContent)).toStrictEqual(['4×']);
    expect(within(group).getAllByRole('button', { pressed: false })).toHaveLength(3);
  });

  it('hands back the value itself, not the words on its pill', async () => {
    const { onChange, group } = renderChoice(4);

    await userEvent.click(within(group).getByRole('button', { name: '8×' }));

    expect(onChange).toHaveBeenCalledWith(8);
  });

  it('ignores a press on an unavailable value, and says why on the pill and under the row', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedChoice
        label="Preview magnification"
        values={[1, 2, 4, 8]}
        value={1}
        format={(scale) => `${String(scale)}×`}
        onChange={onChange}
        unavailable={{ values: [4, 8], reason: 'Too large for this sheet.' }}
      />,
    );
    const group = screen.getByRole('group', { name: 'Preview magnification' });
    const blocked = within(group).getByRole('button', { name: '8×' });

    await userEvent.click(blocked);

    expect(onChange).not.toHaveBeenCalled();
    expect(blocked).toHaveAttribute('aria-disabled', 'true');
    expect(blocked).toHaveAccessibleDescription('Too large for this sheet.');
    expect(within(group).getByRole('button', { name: '2×' })).not.toHaveAccessibleDescription();
    expect(within(group).getByText('Too large for this sheet.')).toBeVisible();
  });

  it('keeps an unavailable value in the tab order, so the reason can be reached', async () => {
    render(
      <SegmentedChoice
        label="Preview magnification"
        values={[1, 2]}
        value={1}
        format={(scale) => `${String(scale)}×`}
        onChange={vi.fn()}
        unavailable={{ values: [2], reason: 'Too large for this sheet.' }}
      />,
    );

    await userEvent.tab();
    await userEvent.tab();

    expect(screen.getByRole('button', { name: '2×' })).toHaveFocus();
  });

  it('shows no reason while every value is available', () => {
    render(
      <SegmentedChoice
        label="Preview magnification"
        values={[1, 2]}
        value={1}
        format={(scale) => `${String(scale)}×`}
        onChange={vi.fn()}
        unavailable={{ values: [8], reason: 'Too large for this sheet.' }}
      />,
    );

    expect(screen.queryByText('Too large for this sheet.')).toBeNull();
  });
});
