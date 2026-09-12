import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextField } from './TextField.tsx';

/**
 * A labelled free-text setting.
 *
 * Driven through a controlled harness, so what is asserted is what the reader sees in the box rather
 * than what a spy was handed. The contracts are the label association, which is the field's accessible
 * name and must not be the ⓘ's; every edit reaching the caller, the empty one included, because the
 * compiler omits a line for an empty value; and the hard length limit, which only a project name has.
 */
function Harness({ maxLength }: { readonly maxLength?: number }) {
  const [value, setValue] = useState('Iron');
  return (
    <TextField
      label="Project name"
      tooltip="What the project is called in every list that offers it."
      value={value}
      placeholder="Untitled"
      {...(maxLength === undefined ? {} : { maxLength })}
      onChange={setValue}
    />
  );
}

function field(): HTMLElement {
  return screen.getByRole('textbox', { name: 'Project name' });
}

describe('TextField', () => {
  it('is named by its label, with the guidance beside it as a control of its own', () => {
    render(<Harness />);

    expect(field()).toHaveValue('Iron');
    expect(field()).toHaveAttribute('placeholder', 'Untitled');
    expect(screen.getByRole('button', { name: 'Guidance: Project name' })).toBeInTheDocument();
  });

  it('hands every edit to the caller, down to an empty value', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(field(), ' Keep');
    expect(field()).toHaveValue('Iron Keep');

    await user.clear(field());
    expect(field()).toHaveValue('');
  });

  it('refuses the keystroke past a hard limit, where one is given', async () => {
    const user = userEvent.setup();
    render(<Harness maxLength={6} />);

    await user.type(field(), ' Keep');

    expect(field()).toHaveValue('Iron K');
  });

  it('sets no limit where none is given', () => {
    render(<Harness />);

    expect(field()).not.toHaveAttribute('maxlength');
  });
});
