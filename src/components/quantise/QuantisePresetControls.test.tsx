import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QUANTISE_PRESET_GUIDANCE } from '../../constants/quantisePresets.ts';
import { QUANTISE_DEFAULT_DIALS } from '../../constants/quantiseDials.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../../constants/projects.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
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
  projectId: DEFAULT_PROJECT_ID,
  name: 'Flat sheets',
  description: 'Line art.',
  dials: QUANTISE_DEFAULT_DIALS,
};

beforeEach(() => {
  useQuantisePresetStore.setState({ presets: [] });
  useQuantiseStore.setState({ ...QUANTISE_DEFAULT_DIALS });
  // A save has to have somewhere to go, and the panel disables its button while it has not. `App`
  // writes this project on boot; here it is put in place directly, since what is under test is the
  // panel rather than the fetch.
  useProjectStore.setState({ projects: [createDefaultProject(0)] });
});

describe('QuantisePresetControls', () => {
  it('says the collection is empty, and explains what the panel is for', () => {
    render(<QuantisePresetControls />);

    expect(screen.getByText('Nothing saved yet')).toBeInTheDocument();
    expect(screen.getByText(QUANTISE_PRESET_GUIDANCE.empty)).toBeInTheDocument();
  });

  it('offers the project the save will be filed under', () => {
    render(<QuantisePresetControls />);

    expect(screen.getByLabelText('Save into')).toHaveValue(DEFAULT_PROJECT_ID);
  });

  it('no longer carries the transfer controls, which moved to the Projects view', () => {
    // The pack carries the projects and both saved collections together now, so a control that
    // could replace only this collection would be offering an import this file cannot describe.
    render(<QuantisePresetControls />);

    expect(screen.queryByRole('button', { name: /Export JSON/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Import JSON/ })).toBeNull();
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

  it('says Update before the press when the name is one already saved in that project', async () => {
    useQuantisePresetStore.setState({ presets: [saved] });
    render(<QuantisePresetControls />);

    // Differently cased, because that is what the store treats as the same preset — the button has
    // to answer by the same rule, or it promises one thing and the store does another.
    await userEvent.type(screen.getByLabelText('Save these settings as'), 'flat SHEETS');

    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  });

  it('says Save for a name another project holds, since a name is unique inside one', async () => {
    // The rule projects changed. Two games are each free to have their own “Flat sheets”, and a
    // save into one may not silently overwrite the other's — so the button has to answer by the
    // project as well as by the name, or it promises an update the store will not perform.
    const elsewhere: QuantisePreset = { ...saved, projectId: 'another-project' };
    useQuantisePresetStore.setState({ presets: [elsewhere] });
    render(<QuantisePresetControls />);

    await userEvent.type(screen.getByLabelText('Save these settings as'), 'Flat sheets');

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull();
  });

  it('re-files a saved set from its own row, without touching what it holds', async () => {
    const moveQuantisePreset = vi.fn().mockResolvedValue(undefined);
    useProjectStore.setState({
      projects: [
        createDefaultProject(0),
        { id: 'harbour', name: 'Harbour', description: '', createdAt: 0, updatedAt: 0 },
      ],
    });
    useQuantisePresetStore.setState({ presets: [saved], moveQuantisePreset });
    render(<QuantisePresetControls />);

    await userEvent.selectOptions(screen.getByLabelText('Project'), 'harbour');

    expect(moveQuantisePreset).toHaveBeenCalledWith('quantise-1', 'harbour');
  });

  it('empties both boxes once the settings were actually stored', async () => {
    const saveQuantisePreset = vi.fn().mockResolvedValue(true);
    useQuantisePresetStore.setState({ saveQuantisePreset });
    render(<QuantisePresetControls />);

    const name = screen.getByLabelText('Save these settings as');
    await userEvent.type(name, 'Flat sheets');
    await userEvent.type(screen.getByLabelText('Describe it (optional)'), 'Line art.');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(saveQuantisePreset).toHaveBeenCalledWith('Flat sheets', 'Line art.', DEFAULT_PROJECT_ID);
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

    await userEvent.click(screen.getByRole('button', { name: /^Load the saved settings/ }));

    expect(loadQuantisePreset).toHaveBeenCalledWith(saved);
  });

  it('names the preset in every button, so a list of them is not a list of “Delete”', () => {
    const second: QuantisePreset = { ...saved, id: 'quantise-2', name: 'Painterly sheets' };
    useQuantisePresetStore.setState({ presets: [saved, second] });

    render(<QuantisePresetControls />);

    // Four buttons, four distinct accessible names — the thing a screen-reader user moves through.
    for (const name of ['Flat sheets', 'Painterly sheets']) {
      expect(screen.getByRole('button', { name: `Load the saved settings “${name}”` })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: `Delete the saved settings “${name}”` })).toBeInTheDocument();
    }
  });

  it('asks before deleting, and deletes nothing on the first press', async () => {
    const deleteQuantisePreset = vi.fn().mockResolvedValue(undefined);
    useQuantisePresetStore.setState({ presets: [saved], deleteQuantisePreset });
    render(<QuantisePresetControls />);

    await userEvent.click(screen.getByRole('button', { name: /^Delete the saved settings “Flat sheets”$/ }));

    expect(deleteQuantisePreset).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: 'Delete the saved settings “Flat sheets”, for good' }),
    ).toBeInTheDocument();
  });

  it('deletes on the confirmation, naming the row it was pressed on', async () => {
    const deleteQuantisePreset = vi.fn().mockResolvedValue(undefined);
    useQuantisePresetStore.setState({ presets: [saved], deleteQuantisePreset });
    render(<QuantisePresetControls />);

    await userEvent.click(screen.getByRole('button', { name: /^Delete the saved settings “Flat sheets”$/ }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Delete the saved settings “Flat sheets”, for good' }),
    );

    expect(deleteQuantisePreset).toHaveBeenCalledWith('quantise-1');
  });

  it('puts the row back on Cancel, having deleted nothing', async () => {
    const deleteQuantisePreset = vi.fn().mockResolvedValue(undefined);
    useQuantisePresetStore.setState({ presets: [saved], deleteQuantisePreset });
    render(<QuantisePresetControls />);

    await userEvent.click(screen.getByRole('button', { name: /^Delete the saved settings “Flat sheets”$/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Keep the saved settings “Flat sheets”' }));

    expect(deleteQuantisePreset).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Load the saved settings “Flat sheets”' })).toBeInTheDocument();
  });
});
