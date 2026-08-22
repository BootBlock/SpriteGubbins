import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QUANTISE_DEFAULT_DIALS } from '../../constants/quantiseDials.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import type { QuantisePreset } from '../../types/quantisePreset.ts';
import { QuantisePresetTransferControls } from './QuantisePresetTransferControls.tsx';

/**
 * What the two buttons offer, and when they refuse to.
 *
 * The pack format is `utils/quantisePresetPack.test.ts`'s subject and the storage is the store's,
 * so what is left here is the part only a rendered control can be wrong about: which presses are
 * available, and what the file input hands the store.
 */

const saved: QuantisePreset = {
  id: 'quantise-1',
  name: 'Flat sheets',
  description: 'Line art.',
  dials: QUANTISE_DEFAULT_DIALS,
};

beforeEach(() => {
  useQuantisePresetStore.setState({ presets: [], isTransferring: false });
  useUIStore.getState().dismissToast();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('QuantisePresetTransferControls', () => {
  it('will not export a collection that holds nothing', () => {
    // The parser refuses an empty pack, because obeying one would delete the collection it landed
    // in — so an export of nothing is a file that cannot be imported anywhere.
    render(<QuantisePresetTransferControls />);

    expect(screen.getByRole('button', { name: /Export JSON/ })).toBeDisabled();
  });

  it('offers import on an empty collection, which is the visit that most needs it', () => {
    render(<QuantisePresetTransferControls />);

    expect(screen.getByRole('button', { name: /Import JSON/ })).toBeEnabled();
  });

  it('exports under a filename naming the tab it came from', async () => {
    // Asserted through the confirmation because that is where the filename actually reaches the
    // reader: `useFileSave` removes the anchor in the same task it clicks it.
    useQuantisePresetStore.setState({ presets: [saved] });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:pack');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    render(<QuantisePresetTransferControls />);

    await userEvent.click(screen.getByRole('button', { name: /Export JSON/ }));

    expect(useUIStore.getState().toastMessage).toBe('Downloaded sprite-gubbins-quantiser-settings.json');
  });

  it('disables both buttons while a transfer is in flight', () => {
    useQuantisePresetStore.setState({ presets: [saved], isTransferring: true });

    render(<QuantisePresetTransferControls />);

    expect(screen.getByRole('button', { name: /Export JSON/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Import JSON/ })).toBeDisabled();
  });

  it('hands the chosen file to the store, and clears the input so the same file can be retried', async () => {
    const importQuantisePresetsJSON = vi.fn().mockResolvedValue(undefined);
    useQuantisePresetStore.setState({ importQuantisePresetsJSON });
    const { container } = render(<QuantisePresetTransferControls />);
    const input = container.querySelector('input[type="file"]');
    if (!(input instanceof HTMLInputElement)) throw new Error('the file input should be rendered.');

    const file = new File(['[]'], 'pack.json', { type: 'application/json' });
    await userEvent.upload(input, file);

    expect(importQuantisePresetsJSON).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });
});
