import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextAreaField } from './TextAreaField.tsx';

/**
 * A labelled free-text setting whose value has lines in it.
 *
 * Driven through a controlled harness for the reason `TextField`'s suite is: what is asserted is
 * what the reader sees in the box rather than what a spy was handed. The contract this control has
 * that its single-line sibling does not is the **line breaks**, which is the whole reason it exists
 * — a hex list typed or pasted into a single-line input loses them, differently in each browser.
 */
function Harness() {
  const [value, setValue] = useState('#102030');
  return (
    <TextAreaField
      label="Or paste the colours"
      tooltip="Colours pasted rather than loaded from a file, one a line."
      value={value}
      placeholder="#RRGGBB, one a line"
      rows={4}
      onChange={setValue}
    />
  );
}

function field(): HTMLElement {
  return screen.getByRole('textbox', { name: 'Or paste the colours' });
}

describe('TextAreaField', () => {
  it('is named by its label, with the guidance beside it as a control of its own', () => {
    render(<Harness />);

    expect(field()).toHaveValue('#102030');
    expect(field()).toHaveAttribute('placeholder', '#RRGGBB, one a line');
    expect(field()).toHaveAttribute('rows', '4');
    expect(screen.getByRole('button', { name: 'Guidance: Or paste the colours' })).toBeInTheDocument();
  });

  it('keeps the line breaks in what it is given', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);

    await user.type(field(), '\n#405060');

    expect(field()).toHaveValue('#102030\n#405060');
  });

  it('hands every edit to the caller, down to an empty value', async () => {
    const user = userEvent.setup({ delay: null });
    render(<Harness />);

    await user.clear(field());

    expect(field()).toHaveValue('');
  });
});
