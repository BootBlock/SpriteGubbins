import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PRESET } from '../../constants/presets/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { PresetSavePanel } from './PresetSavePanel.tsx';

/**
 * The description box holds exactly what Save is about to write.
 *
 * That invariant is invisible from the outside and is the only thing standing between an Update and
 * a silently blanked description, so each of its three halves is pinned below: the box adopts the
 * named preset's own sentence, it adopts **once** per preset rather than once per keystroke, and
 * what the reader leaves in it — including an empty box they cleared on purpose — is what gets
 * stored.
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

  it('adopts it again after the box was typed in and then cleared', async () => {
    const user = userEvent.setup();
    usePresetStore.setState({ customPresets: [EXISTING] });
    render(<PresetSavePanel />);

    // The regression this replaced a cleverer arrangement to fix. A `draft ?? target.description`
    // read falls through on `null` and not on `''`, so typing into the box and then emptying it left
    // the box permanently blank — and the Update that followed wiped the stored sentence with
    // nothing on screen to say it was about to.
    await user.type(descriptionBox(), 'Town');
    await user.clear(descriptionBox());
    await user.type(nameBox(), 'My Knight');

    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    expect(descriptionBox()).toHaveValue('For the town scenes.');
  });

  it('adopts once per preset, not once per keystroke', async () => {
    const user = userEvent.setup();
    usePresetStore.setState({ customPresets: [EXISTING] });
    render(<PresetSavePanel />);

    await user.type(nameBox(), 'My Knight');
    await user.clear(descriptionBox());
    await user.type(descriptionBox(), 'My own wording');
    // Any further edit to the name that lands back on the same preset — a typo fixed, a trailing
    // space added and removed — must not throw away what has since been written beside it.
    await user.type(nameBox(), ' ');
    await user.keyboard('{Backspace}');

    expect(descriptionBox()).toHaveValue('My own wording');
  });

  it('stores an empty box when the reader cleared it deliberately', async () => {
    const user = userEvent.setup();
    const saveCustomPreset = vi.fn().mockResolvedValue(true);
    usePresetStore.setState({ customPresets: [EXISTING], saveCustomPreset });
    render(<PresetSavePanel />);

    await user.type(nameBox(), 'My Knight');
    await user.clear(descriptionBox());
    await user.click(screen.getByRole('button', { name: 'Update' }));

    // Removing a description has to remain possible, which is why the box is not simply ignored
    // when it is empty — a blank box means one thing, and this is it.
    expect(saveCustomPreset).toHaveBeenCalledWith('My Knight', '');
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
