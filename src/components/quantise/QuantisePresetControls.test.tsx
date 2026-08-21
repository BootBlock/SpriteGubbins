import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QUANTISE_PRESET_GUIDANCE } from '../../constants/quantisePresets.ts';
import { QUANTISE_DEFAULT_TUNING } from '../../constants/quantiseTuning.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import type { QuantisePreset } from '../../types/quantisePreset.ts';
import { QuantisePresetControls } from './QuantisePresetControls.tsx';

/**
 * The panel's two judgements, which are the two a reader acts on before pressing anything: whether
 * the name in the box is about to *add* a preset or *overwrite* one, and what the collection's own
 * state is.
 *
 * The store is driven directly rather than through a database — what it does with storage is
 * `useQuantisePresetStore.test.ts`'s subject, and mocking one here would be a second answer to the
 * same question.
 */

const saved: QuantisePreset = {
  id: 'quantise-1',
  name: 'Flat sheets',
  description: 'Line art.',
  tuning: QUANTISE_DEFAULT_TUNING,
};

beforeEach(() => {
  useQuantisePresetStore.setState({ presets: [] });
  useQuantiseStore.setState({ ...QUANTISE_DEFAULT_TUNING });
});

describe('QuantisePresetControls', () => {
  it('says the collection is empty, and explains what the panel is for', () => {
    render(<QuantisePresetControls />);

    expect(screen.getByText('Nothing saved yet')).toBeInTheDocument();
    expect(screen.getByText(QUANTISE_PRESET_GUIDANCE.empty)).toBeInTheDocument();
  });

  it('counts what is saved, and lists it by name', () => {
    useQuantisePresetStore.setState({ presets: [saved] });

    render(<QuantisePresetControls />);

    expect(screen.getByText('1 set saved')).toBeInTheDocument();
    expect(screen.getByText('Flat sheets')).toBeInTheDocument();
    expect(screen.getByText('Line art.')).toBeInTheDocument();
  });

  it('refuses to save until the box holds a name', async () => {
    render(<QuantisePresetControls />);

    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Save these settings as'), 'Flat sheets');
    expect(save).toBeEnabled();
  });

  it('says Update before the press when the name is one already saved', async () => {
    useQuantisePresetStore.setState({ presets: [saved] });
    render(<QuantisePresetControls />);

    // Differently cased, because that is what the store treats as the same preset — the button has
    // to answer by the same rule, or it promises one thing and the store does another.
    await userEvent.type(screen.getByLabelText('Save these settings as'), 'flat SHEETS');

    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('empties both boxes once the settings were actually stored', async () => {
    const saveQuantisePreset = vi.fn().mockResolvedValue(true);
    useQuantisePresetStore.setState({ saveQuantisePreset });
    render(<QuantisePresetControls />);

    const name = screen.getByLabelText('Save these settings as');
    await userEvent.type(name, 'Flat sheets');
    await userEvent.type(screen.getByLabelText('Describe it (optional)'), 'Line art.');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(saveQuantisePreset).toHaveBeenCalledWith('Flat sheets', 'Line art.');
    expect(name).toHaveValue('');
  });

  it('keeps the name in the box when the write was refused, so it can be retried', async () => {
    // The store reports its own failure with a toast and resolves normally, so clearing the box
    // unconditionally would make the reader retype the name to try again.
    useQuantisePresetStore.setState({ saveQuantisePreset: vi.fn().mockResolvedValue(false) });
    render(<QuantisePresetControls />);

    const name = screen.getByLabelText('Save these settings as');
    await userEvent.type(name, 'Flat sheets');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(name).toHaveValue('Flat sheets');
  });

  it('loads a saved set into the tab when its row is pressed', async () => {
    const loadQuantisePreset = vi.fn();
    useQuantisePresetStore.setState({ presets: [saved], loadQuantisePreset });
    render(<QuantisePresetControls />);

    await userEvent.click(screen.getByRole('button', { name: 'Load' }));

    expect(loadQuantisePreset).toHaveBeenCalledWith(saved);
  });

  it('deletes the row it was pressed on', async () => {
    const deleteQuantisePreset = vi.fn().mockResolvedValue(undefined);
    useQuantisePresetStore.setState({ presets: [saved], deleteQuantisePreset });
    render(<QuantisePresetControls />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(deleteQuantisePreset).toHaveBeenCalledWith('quantise-1');
  });
});
