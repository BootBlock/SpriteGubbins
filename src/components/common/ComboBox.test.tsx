import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComboBox } from './ComboBox.tsx';

/**
 * The combo box carries the app's whole keyboard story for the sixteen subject fields, and two
 * contracts that are easy to break without noticing: the list is never filtered by what has been
 * typed, and free text is accepted whether or not it is in the pool.
 *
 * Driven through a controlled harness rather than a spy, so what is asserted is what the user would
 * see in the field — a spy would pass even if the component never rendered the value back.
 */
const OPTIONS = ['Human', 'Cybernetic Cyborg', 'High Elf'];

function Harness({
  initialValue = '',
  options = OPTIONS,
}: {
  readonly initialValue?: string;
  readonly options?: readonly string[];
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <ComboBox
      label="Species"
      tooltip="Defines the base organism or entity type."
      value={value}
      options={options}
      onChange={setValue}
    />
  );
}

function comboBox() {
  return screen.getByRole('combobox', { name: 'Species' });
}

describe('ComboBox', () => {
  it('opens on focus and offers the whole pool', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    await user.click(comboBox());

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
    expect(comboBox()).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not filter the list as the user types', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(comboBox());
    await user.type(comboBox(), 'Hum');

    // The pool suggests; it does not narrow. All three options stay reachable even though only one
    // of them starts with what was typed.
    expect(screen.getAllByRole('option')).toHaveLength(OPTIONS.length);
    expect(comboBox()).toHaveValue('Hum');
  });

  it('accepts a value that is not in the pool', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(comboBox(), 'Sentient Filing Cabinet');
    expect(comboBox()).toHaveValue('Sentient Filing Cabinet');
  });

  it('moves the highlight with the arrow keys and takes it with Enter', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(comboBox());
    // Nothing is highlighted until a key moves it, so the first press must land on the first option
    // rather than skipping it.
    expect(comboBox()).not.toHaveAttribute('aria-activedescendant');

    await user.keyboard('{ArrowDown}{ArrowDown}');
    const highlighted = comboBox().getAttribute('aria-activedescendant');
    expect(highlighted).toBe(screen.getAllByRole('option')[1]?.id);

    await user.keyboard('{Enter}');
    expect(comboBox()).toHaveValue('Cybernetic Cyborg');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('starts an upward move at the last option', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(comboBox());
    await user.keyboard('{ArrowUp}{Enter}');

    // Not the middle of the pool, which is where treating "nothing highlighted" as index -1 and
    // stepping from it would land.
    expect(comboBox()).toHaveValue('High Elf');
  });

  it('wraps at both ends rather than stranding the highlight', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(comboBox());
    // Down past the last option comes back to the first.
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(comboBox()).toHaveValue('Human');

    await user.click(comboBox());
    // And up past the first goes round to the last.
    await user.keyboard('{ArrowDown}{ArrowUp}{Enter}');
    expect(comboBox()).toHaveValue('High Elf');
  });

  it('closes on Escape without changing the value', async () => {
    const user = userEvent.setup();
    render(<Harness initialValue="Human" />);

    await user.click(comboBox());
    await user.keyboard('{ArrowDown}{Escape}');

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(comboBox()).toHaveValue('Human');
  });

  it('takes an option that is clicked', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(comboBox());
    await user.click(screen.getByRole('option', { name: /High Elf/ }));

    expect(comboBox()).toHaveValue('High Elf');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('drops a highlight that the new option pool cannot hold', async () => {
    const user = userEvent.setup();
    // Switching category swaps a field's pool wholesale without remounting the control — every
    // category defines the same sixteen field keys, so React reuses the element. A highlight left
    // over from the longer pool would point `aria-activedescendant` at an id that no longer exists,
    // and Enter would silently commit nothing.
    const { rerender } = render(<Harness options={OPTIONS} />);

    await user.click(comboBox());
    await user.keyboard('{ArrowUp}');
    expect(comboBox()).toHaveAttribute('aria-activedescendant');

    rerender(<Harness options={['Only One']} />);

    expect(comboBox()).not.toHaveAttribute('aria-activedescendant');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(comboBox()).toHaveValue('Only One');
  });

  it('floats the list in the top layer rather than inside the panel it drops from', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(comboBox());

    // Every panel in this app is a `glass-panel`, and `backdrop-filter` makes an element a stacking
    // context — so a `z-index` on this list is only ever compared with its own panel's contents, and
    // the next panel down the page paints straight over it. `popover` is what takes it out of that
    // comparison. Losing the attribute doesn't error or change the DOM; it just puts the list back
    // underneath the Output Configuration panel, looking for all the world like a z-index bug.
    expect(screen.getByRole('listbox')).toHaveAttribute('popover', 'manual');
  });

  it('marks the current value as the selected option', async () => {
    const user = userEvent.setup();
    render(<Harness initialValue="Human" />);

    await user.click(comboBox());
    expect(screen.getByRole('option', { name: /Human/, selected: true })).toBeInTheDocument();
  });
});
