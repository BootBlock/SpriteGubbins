import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckboxField } from './CheckboxField.tsx';

/**
 * A labelled on/off setting, and the one thing it does that a bare checkbox does not.
 *
 * When the target cannot honour the option, the control says why rather than going grey. It stays in
 * the tab order through `aria-disabled` so a keyboard reader can reach it and hear the reason — and
 * because `aria-disabled` blocks nothing, the refusal has to be the handler's, which is the case a
 * `disabled` attribute would have hidden from every test that only looked at the markup.
 */
const REASON = 'The chosen target cannot draw a component map.';

function renderCheckbox(disabledReason: string) {
  const onChange = vi.fn();
  render(
    <CheckboxField
      label="Component map"
      tooltip="Adds a labelled map of every component to the sheet."
      checked={false}
      disabledReason={disabledReason}
      onChange={onChange}
    />,
  );
  return { onChange, checkbox: screen.getByRole('checkbox', { name: 'Component map' }) };
}

describe('CheckboxField', () => {
  it('hands the new state to the caller when it is available', async () => {
    const { onChange, checkbox } = renderCheckbox('');

    await userEvent.click(checkbox);

    expect(onChange).toHaveBeenCalledWith(true);
    expect(checkbox).toHaveAttribute('aria-disabled', 'false');
    expect(checkbox).not.toHaveAccessibleDescription();
  });

  it('says why it is unavailable, and keeps its place in the tab order to say it', async () => {
    const user = userEvent.setup();
    const { checkbox } = renderCheckbox(REASON);

    expect(checkbox).toHaveAttribute('aria-disabled', 'true');
    expect(checkbox).toHaveAccessibleDescription(REASON);
    expect(screen.getByText(REASON)).toBeInTheDocument();

    // `disabled` would skip the control entirely, and the reason with it.
    expect(checkbox).not.toBeDisabled();
    await user.tab();
    expect(checkbox).toHaveFocus();
  });

  it('refuses the change itself, since aria-disabled blocks nothing', async () => {
    const { onChange, checkbox } = renderCheckbox(REASON);

    await userEvent.click(checkbox);

    expect(onChange).not.toHaveBeenCalled();
  });
});
