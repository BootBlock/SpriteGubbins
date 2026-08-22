import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_PRESET } from '../../constants/presets/index.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import type { PresetArchetype } from '../../types/preset.ts';
import { PresetTransferControls } from './PresetTransferControls.tsx';

/**
 * The one judgement this call site makes that the quantiser's makes differently.
 *
 * Both now render the shared `JsonPackTransfer`, so `canExport` is the single prop where the two
 * collections disagree — and a shared control is exactly where that difference could quietly be
 * lost. An archetype pack carries the built-ins, so it says something even on an install where the
 * reader has saved nothing; a pack of quantiser presets with no entries is a file the parser
 * refuses.
 */
beforeEach(() => {
  usePresetStore.setState({ customPresets: [], isExporting: false, pendingImport: null });
});

describe('PresetTransferControls', () => {
  it('offers export with no custom presets saved, because the pack carries the built-ins', () => {
    render(<PresetTransferControls />);

    expect(screen.getByRole('button', { name: /Export JSON/ })).toBeEnabled();
  });

  it('disables both controls while a transfer is in flight', () => {
    usePresetStore.setState({ isExporting: true });

    render(<PresetTransferControls />);

    expect(screen.getByRole('button', { name: /Export JSON/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Import JSON/ })).toBeDisabled();
  });

  it('replaces both buttons with the question while an import waits to be answered', () => {
    // The count on screen is the reader's own collection as it stands, not a figure snapshotted
    // when the file was parsed.
    const arriving: PresetArchetype = {
      id: 'custom-arriving',
      name: 'Arrived',
      description: '',
      category: 'CHARACTER',
      subject: defaultSubjectFor('CHARACTER'),
      output: DEFAULT_PRESET.output,
      isCustom: true,
    };
    usePresetStore.setState({
      customPresets: [{ ...arriving, id: 'custom-mine', name: 'Mine' }],
      pendingImport: [arriving],
    });

    render(<PresetTransferControls />);

    expect(screen.queryByRole('button', { name: /Export JSON/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import JSON/ })).not.toBeInTheDocument();
    expect(screen.getByText(/1 custom preset\./)).toBeInTheDocument();
  });

  it('asks the store to replace only once Replace is pressed', async () => {
    const confirmPresetImport = vi.fn().mockResolvedValue(undefined);
    const arriving: PresetArchetype = {
      id: 'custom-arriving',
      name: 'Arrived',
      description: '',
      category: 'CHARACTER',
      subject: defaultSubjectFor('CHARACTER'),
      output: DEFAULT_PRESET.output,
      isCustom: true,
    };
    usePresetStore.setState({ pendingImport: [arriving], confirmPresetImport });

    render(<PresetTransferControls />);
    await userEvent.click(screen.getByRole('button', { name: 'Replace' }));

    expect(confirmPresetImport).toHaveBeenCalledTimes(1);
  });
});
