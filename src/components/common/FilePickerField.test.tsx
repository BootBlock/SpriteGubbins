import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilePickerField } from './FilePickerField.tsx';

/**
 * The click-to-choose half of every image drop target in the app.
 *
 * The reset is why this is a component rather than a snippet. A file input fires no `change` when the
 * file chosen is the one it already holds, so without clearing it a sheet read against the wrong
 * background key could never be retried without picking something else first.
 */
function renderPicker() {
  const acceptFile = vi.fn();
  render(
    <FilePickerField
      label="Sprite sheet"
      tooltip="Loads a generated sheet into the quantiser."
      acceptFile={acceptFile}
    />,
  );
  const input = screen.getByLabelText('Sprite sheet');
  if (!(input instanceof HTMLInputElement)) throw new Error('the label should name the file input.');
  return { acceptFile, input };
}

describe('FilePickerField', () => {
  it('is a file input named by its label, offering images alone', () => {
    const { input } = renderPicker();

    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', 'image/*');
  });

  it('hands over the chosen file, then clears itself so the same file can be chosen again', async () => {
    const { acceptFile, input } = renderPicker();
    const sheet = new File([new Uint8Array([137, 80, 78, 71])], 'armour.png', { type: 'image/png' });

    await userEvent.upload(input, sheet);

    expect(acceptFile).toHaveBeenCalledWith(sheet);
    // A chosen file leaves `C:\fakepath\armour.png` in the value, so an empty one is the reset's doing.
    expect(input).toHaveValue('');
    expect(input.files).toHaveLength(0);
  });
});
