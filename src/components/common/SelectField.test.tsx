import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectField } from './SelectField.tsx';

/**
 * The labelled dropdown thirty-one controls in the app are made of.
 *
 * Every value it holds is an identifier the prompt compiler reads, so the change handler resolves the
 * chosen option back to its own value rather than casting the DOM's string — a numeric choice handed
 * back as `'4'` would type-check at every call site and fail wherever it is compared. The rest is what
 * the control says about itself: a description of the current choice, a reason the value is not the
 * reader's to change, both at once, or nothing at all, which has to be no `aria-describedby` rather
 * than one pointing at an empty paragraph.
 */
const CHOICES = [
  { value: 16, label: '16 colours' },
  { value: 32, label: '32 colours (standard)' },
  { value: 64, label: '64 colours' },
] as const;

const DESCRIPTION = 'Thirty-two colours keep a ramp per material without banding.';
const REASON = 'The chosen palette fixes its own size.';

interface Extras {
  readonly description?: string;
  readonly disabledReason?: string;
  readonly nameQualifier?: string;
  readonly action?: ReactNode;
}

function renderSelect(extras: Extras = {}) {
  const onChange = vi.fn();
  render(
    <SelectField
      label="Palette size"
      tooltip="How many colours the sheet may use."
      value={32}
      choices={CHOICES}
      onChange={onChange}
      {...extras}
    />,
  );
  const name = extras.nameQualifier === undefined ? 'Palette size' : `Palette size ${extras.nameQualifier}`;
  return { onChange, select: screen.getByRole('combobox', { name }) };
}

describe('SelectField', () => {
  it('hands back the chosen value in its own type, not the DOM’s string', () => {
    const { onChange, select } = renderSelect();

    fireEvent.change(select, { target: { value: '64' } });

    expect(onChange).toHaveBeenCalledWith(64);
  });

  it('describes itself with what the current choice means', () => {
    const { select } = renderSelect({ description: DESCRIPTION });

    expect(select).toHaveAccessibleDescription(DESCRIPTION);
    expect(screen.getByText(DESCRIPTION)).toBeInTheDocument();
  });

  it('describes itself with nothing at all when there is nothing to say', () => {
    // An empty string is accepted from a caller that looked its sentence up and found none, and must
    // leave the control exactly as a caller that passed nothing leaves it.
    const { select } = renderSelect({ description: '', disabledReason: '' });

    expect(select).not.toHaveAttribute('aria-describedby');
    expect(select).toHaveAttribute('aria-disabled', 'false');
  });

  it('says why the value is not the reader’s to choose, and refuses the change', () => {
    const { onChange, select } = renderSelect({ disabledReason: REASON });

    // `aria-disabled`, so a keyboard reader still reaches the control and hears the reason.
    expect(select).toHaveAttribute('aria-disabled', 'true');
    expect(select).not.toBeDisabled();
    expect(select).toHaveAccessibleDescription(REASON);

    // `readOnly` means nothing on a `<select>`, so the handler is the only refusal there is.
    fireEvent.change(select, { target: { value: '64' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('carries both descriptions at once, in the order they are shown', () => {
    const { select } = renderSelect({ description: DESCRIPTION, disabledReason: REASON });

    expect(select).toHaveAccessibleDescription(`${DESCRIPTION} ${REASON}`);
  });

  it('names a select repeated per item after that item, keeping its label at the front', () => {
    // WCAG 2.5.3: someone driving the app by speech says the words they can see, so the qualifier
    // follows the label rather than replacing it. The ⓘ is repeated as often, and takes the same words.
    const { select } = renderSelect({ nameQualifier: 'for Iron Knight' });

    expect(select).toHaveAccessibleName('Palette size for Iron Knight');
    expect(
      screen.getByRole('button', { name: 'Guidance: Palette size for Iron Knight' }),
    ).toBeInTheDocument();
  });

  it('puts an action on the row the select shares', () => {
    const { select } = renderSelect({ action: <button type="button">Open the site</button> });

    expect(select.parentElement).toContainElement(screen.getByRole('button', { name: 'Open the site' }));
  });
});
