import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { usePresetStore } from '../../stores/usePresetStore.ts';
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
  usePresetStore.setState({ customPresets: [], isExporting: false });
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
});
