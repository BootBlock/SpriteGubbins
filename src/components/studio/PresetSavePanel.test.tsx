import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PRESET } from '../../constants/presets/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../../constants/projects.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
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

const HARBOUR = { id: 'harbour', name: 'Harbour', description: '', createdAt: 0, updatedAt: 0 } as const;

const EXISTING = {
  ...DEFAULT_PRESET,
  id: 'custom-1',
  projectId: DEFAULT_PROJECT_ID,
  name: 'My Knight',
  description: 'For the town scenes.',
  isCustom: true,
} as const;

function nameBox(): HTMLElement {
  return screen.getByLabelText('Save as');
}

function descriptionBox(): HTMLElement {
  return screen.getByLabelText('Describe it (optional)');
}

// A save has to have somewhere to go, and the panel disables its button while it has not. `App`
// writes this project on boot; here it is put in place directly, since what is under test is the
// panel rather than the fetch.
beforeEach(() => {
  useProjectStore.setState({ projects: [createDefaultProject(0)] });
});

// The stores are module singletons, so a seeded preset would otherwise outlive the test that set it.
afterEach(() => {
  usePresetStore.setState({ customPresets: [] });
  useProjectStore.setState({ projects: [] });
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
    expect(saveCustomPreset).toHaveBeenCalledWith('My Knight', '', DEFAULT_PROJECT_ID);
  });

  it('saves the name and the description together, and clears both on success', async () => {
    const user = userEvent.setup();
    const saveCustomPreset = vi.fn().mockResolvedValue(true);
    usePresetStore.setState({ saveCustomPreset });
    render(<PresetSavePanel />);

    await user.type(nameBox(), 'Fresh');
    await user.type(descriptionBox(), 'A new one.');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(saveCustomPreset).toHaveBeenCalledWith('Fresh', 'A new one.', DEFAULT_PROJECT_ID);
    expect(nameBox()).toHaveValue('');
    expect(descriptionBox()).toHaveValue('');
  });

  it('files the save into the project the dropdown names', async () => {
    const user = userEvent.setup();
    const saveCustomPreset = vi.fn().mockResolvedValue(true);
    useProjectStore.setState({ projects: [createDefaultProject(0), HARBOUR] });
    usePresetStore.setState({ saveCustomPreset });
    render(<PresetSavePanel />);

    await user.selectOptions(screen.getByLabelText('Save into'), 'harbour');
    await user.type(nameBox(), 'Fresh');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(saveCustomPreset).toHaveBeenCalledWith('Fresh', '', 'harbour');
  });

  it('judges Update against the chosen project, not the whole library', async () => {
    // A name is unique inside one project, so the same name in another project is a new preset
    // rather than an overwrite — and the button has to answer by the rule the store saves by.
    const user = userEvent.setup();
    useProjectStore.setState({ projects: [createDefaultProject(0), HARBOUR] });
    usePresetStore.setState({ customPresets: [EXISTING] });
    render(<PresetSavePanel />);

    await user.type(nameBox(), 'My Knight');
    expect(screen.getByRole('button', { name: 'Update' })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Save into'), 'harbour');
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull();
  });

  it('adopts the other project’s description when the project changes under the same name', async () => {
    // The adoption lived in the name box's handler alone, so switching project moved the target
    // without moving what the box held: the button read Update over the *other* project's sentence,
    // and pressing it wrote that sentence onto this project's preset.
    const user = userEvent.setup();
    useProjectStore.setState({ projects: [createDefaultProject(0), HARBOUR] });
    usePresetStore.setState({
      customPresets: [
        EXISTING,
        { ...EXISTING, id: 'custom-2', projectId: 'harbour', description: 'For the harbour.' },
      ],
    });
    render(<PresetSavePanel />);

    await user.type(nameBox(), 'My Knight');
    expect(descriptionBox()).toHaveValue('For the town scenes.');

    await user.selectOptions(screen.getByLabelText('Save into'), 'harbour');

    expect(descriptionBox()).toHaveValue('For the harbour.');
  });

  it('leaves the box alone when the new project holds nothing under that name', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({ projects: [createDefaultProject(0), HARBOUR] });
    usePresetStore.setState({ customPresets: [EXISTING] });
    render(<PresetSavePanel />);

    await user.type(nameBox(), 'My Knight');
    await user.selectOptions(screen.getByLabelText('Save into'), 'harbour');

    // A new preset in Harbour, and the box holds what Save is about to write — which is the
    // sentence the reader can see rather than a blank they did not ask for.
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(descriptionBox()).toHaveValue('For the town scenes.');
  });

  it('keeps the project chosen after a save, since two saves in a row share one', async () => {
    const user = userEvent.setup();
    useProjectStore.setState({ projects: [createDefaultProject(0), HARBOUR] });
    usePresetStore.setState({ saveCustomPreset: vi.fn().mockResolvedValue(true) });
    render(<PresetSavePanel />);

    await user.selectOptions(screen.getByLabelText('Save into'), 'harbour');
    await user.type(nameBox(), 'Fresh');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByLabelText('Save into')).toHaveValue('harbour');
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
