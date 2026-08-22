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
/** A custom preset, as one of the reader's own or as one arriving in a pack. */
function preset(id: string, name: string): PresetArchetype {
  return {
    id,
    name,
    description: '',
    category: 'CHARACTER',
    subject: defaultSubjectFor('CHARACTER'),
    output: DEFAULT_PRESET.output,
    isCustom: true,
  };
}

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
    // Two saved against one arriving, so the two figures are distinguishable: the count on screen
    // is the reader's own collection as it stands, not the size of the pack.
    usePresetStore.setState({
      customPresets: [preset('custom-mine-1', 'Mine'), preset('custom-mine-2', 'Also mine')],
      pendingImport: [preset('custom-arriving', 'Arrived')],
    });

    render(<PresetTransferControls />);

    expect(screen.queryByRole('button', { name: /Export JSON/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import JSON/ })).not.toBeInTheDocument();
    expect(screen.getByText(/holds 1 custom preset\./)).toBeInTheDocument();
    expect(screen.getByText(/deletes the 2 custom presets you already have/)).toBeInTheDocument();
  });

  it('asks the store to replace only once Replace is pressed', async () => {
    const confirmPresetImport = vi.fn().mockResolvedValue(undefined);
    usePresetStore.setState({
      pendingImport: [preset('custom-arriving', 'Arrived')],
      confirmPresetImport,
    });

    render(<PresetTransferControls />);
    await userEvent.click(screen.getByRole('button', { name: /^Replace your/ }));

    expect(confirmPresetImport).toHaveBeenCalledTimes(1);
  });

  it('hands focus back to the Import button once the question is answered', async () => {
    // The button that had focus was unmounted by the question, so answering would otherwise drop a
    // keyboard reader onto the document body.
    usePresetStore.setState({
      pendingImport: [preset('custom-arriving', 'Arrived')],
      cancelPresetImport: () => {
        usePresetStore.setState({ pendingImport: null });
      },
    });
    render(<PresetTransferControls />);

    await userEvent.click(screen.getByRole('button', { name: /^Cancel the import/ }));

    expect(screen.getByRole('button', { name: /Import JSON/ })).toHaveFocus();
  });
});
