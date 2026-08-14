import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PRESET } from '../../constants/presets/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { PresetSavePanel } from './PresetSavePanel.tsx';

/**
 * The description box follows the preset the Save button would update, and stops following the
 * moment the user types in it.
 *
 * That is the whole reason the draft is `string | null` rather than a string, and it is invisible
 * from the outside: saving writes exactly what the box holds, so a box that stayed empty while the
 * name grew into one the library already holds would silently wipe that preset's sentence on the
 * next Update. Neither half of the rule announces itself, and both are one `??` away from being
 * lost in an edit.
 */

const EXISTING = {
  ...DEFAULT_PRESET,
  id: 'custom-1',
  name: 'My Knight',
  description: 'For the town scenes.',
  isCustom: true,
} as const;

function nameBox(): HTMLElement {
  return screen.getByLabelText('Save the current studio setup as');
}

function descriptionBox(): HTMLElement {
  return screen.getByLabelText('Describe it (optional)');
}

// The store is a module singleton, so a seeded preset would otherwise outlive the test that set it.
afterEach(() => {
  usePresetStore.setState({ customPresets: [] });
  vi.restoreAllMocks();
});

describe('PresetSavePanel', () => {
  it('shows the description of the preset it is about to update', async () => {
    const user = userEvent.setup();
    usePresetStore.setState({ customPresets: [EXISTING] });
    render(<PresetSavePanel />);

    expect(descriptionBox()).toHaveValue('');
    await user.type(nameBox(), 'my knight');

    // Matched the way the store matches, so the button saying "Update" and the box showing what
    // will be updated cannot disagree.
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    expect(descriptionBox()).toHaveValue('For the town scenes.');
  });

  it('keeps what the user typed, whatever the name does afterwards', async () => {
    const user = userEvent.setup();
    usePresetStore.setState({ customPresets: [EXISTING] });
    render(<PresetSavePanel />);

    await user.type(descriptionBox(), 'Mine');
    await user.type(nameBox(), 'My Knight');

    expect(descriptionBox()).toHaveValue('Mine');
  });

  it('saves the name and the description together, and clears both on success', async () => {
    const user = userEvent.setup();
    const saveCustomPreset = vi.fn().mockResolvedValue(true);
    usePresetStore.setState({ saveCustomPreset });
    render(<PresetSavePanel />);

    await user.type(nameBox(), 'Fresh');
    await user.type(descriptionBox(), 'A new one.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(saveCustomPreset).toHaveBeenCalledWith('Fresh', 'A new one.');
    expect(nameBox()).toHaveValue('');
    expect(descriptionBox()).toHaveValue('');
  });

  it('keeps both boxes when the write was refused', async () => {
    const user = userEvent.setup();
    // The store reports a failed write with a toast and resolves normally, so clearing the boxes
    // unconditionally would make the user retype a description that was never stored.
    usePresetStore.setState({ saveCustomPreset: vi.fn().mockResolvedValue(false) });
    render(<PresetSavePanel />);

    await user.type(nameBox(), 'Doomed');
    await user.type(descriptionBox(), 'Never stored.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(nameBox()).toHaveValue('Doomed');
    expect(descriptionBox()).toHaveValue('Never stored.');
  });
});
