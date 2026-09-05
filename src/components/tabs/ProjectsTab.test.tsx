import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_PRESET } from '../../constants/presets/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../../constants/projects.ts';
import { QUANTISE_DEFAULT_DIALS } from '../../constants/quantiseDials.ts';
import { usePresetStore } from '../../stores/usePresetStore.ts';
import { useProjectStore } from '../../stores/useProjectStore.ts';
import { useQuantisePresetStore } from '../../stores/useQuantisePresetStore.ts';
import type { CustomArchetype } from '../../types/preset.ts';
import type { Project } from '../../types/project.ts';
import type { QuantisePreset } from '../../types/quantisePreset.ts';
import { ProjectsTab } from './ProjectsTab.tsx';

/**
 * The view where a reader organises what they have saved.
 *
 * The stores are driven directly rather than through a database — what each of them does with
 * storage is its own suite's subject, and mocking one here would be a second answer to the same
 * question. What is under test is the view: which project is shown, what it says is in it, and that
 * every control reaches the store action it claims to.
 */

const HARBOUR: Project = {
  id: 'harbour',
  name: 'Harbour',
  description: 'The town scenes.',
  createdAt: 1,
  updatedAt: 2,
};

function preset(projectId: string, overrides: Partial<CustomArchetype> = {}): CustomArchetype {
  return {
    ...DEFAULT_PRESET,
    id: 'custom-1',
    projectId,
    name: 'My Knight',
    description: 'For the town scenes.',
    isCustom: true,
    ...overrides,
  };
}

function dials(projectId: string, overrides: Partial<QuantisePreset> = {}): QuantisePreset {
  return {
    id: 'quantise-1',
    projectId,
    name: 'Flat sheets',
    description: 'Line art.',
    dials: QUANTISE_DEFAULT_DIALS,
    ...overrides,
  };
}

/** The project button for `name`, which is what opens a project. */
function projectButton(name: string): HTMLElement {
  return screen.getByRole('button', { name: new RegExp(`^${name}`) });
}

beforeEach(() => {
  useProjectStore.setState({ projects: [createDefaultProject(1_000), HARBOUR] });
  usePresetStore.setState({ customPresets: [] });
  useQuantisePresetStore.setState({ presets: [] });
});

afterEach(() => {
  useProjectStore.setState({ projects: [] });
  vi.restoreAllMocks();
});

describe('ProjectsTab', () => {
  it('opens on the first project and lists every one of them with its count', () => {
    usePresetStore.setState({ customPresets: [preset(HARBOUR.id)] });
    useQuantisePresetStore.setState({ presets: [dials(HARBOUR.id)] });

    render(<ProjectsTab />);

    // Both kinds of save counted together, because a project holds both and a reader looking at the
    // list wants to know which of them has anything in it.
    expect(projectButton('Harbour')).toHaveAccessibleName(/2/);
    expect(projectButton('Default')).toHaveAccessibleName(/0/);
    expect(projectButton('Default')).toHaveAttribute('aria-current', 'true');
  });

  it('shows the chosen project’s saves, and only those', async () => {
    const user = userEvent.setup();
    usePresetStore.setState({
      customPresets: [preset(HARBOUR.id), preset(DEFAULT_PROJECT_ID, { id: 'custom-2', name: 'Elsewhere' })],
    });

    render(<ProjectsTab />);
    await user.click(projectButton('Harbour'));

    expect(screen.getByRole('heading', { name: 'My Knight' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Elsewhere' })).toBeNull();
  });

  it('says what an empty project is waiting for, in both halves', () => {
    render(<ProjectsTab />);

    expect(screen.getByText(/Nothing saved here yet/)).toBeInTheDocument();
    expect(screen.getByText(/No dial positions saved here yet/)).toBeInTheDocument();
  });

  it('names the subject on a preset saved with the description box left empty', () => {
    // The box is optional, so an empty one is ordinary — and a gap where the sentence would go says
    // less about the preset than its species and setting do.
    usePresetStore.setState({ customPresets: [preset(DEFAULT_PROJECT_ID, { description: '' })] });

    render(<ProjectsTab />);

    const { species, setting } = DEFAULT_PRESET.subject;
    expect(screen.getByText(`${species} — ${setting}`)).toBeInTheDocument();
  });

  it('creates a project from the two boxes beside the button', async () => {
    const user = userEvent.setup();
    const createProject = vi.fn().mockResolvedValue(true);
    useProjectStore.setState({ createProject });

    render(<ProjectsTab />);
    await user.type(screen.getByLabelText('Project name'), 'Foundry');
    await user.type(screen.getByLabelText('Describe it (optional)'), 'The machine sprites.');
    await user.click(screen.getByRole('button', { name: 'Add project' }));

    expect(createProject).toHaveBeenCalledWith('Foundry', 'The machine sprites.');
  });

  it('refuses to create until the name box holds something', () => {
    render(<ProjectsTab />);

    expect(screen.getByRole('button', { name: 'Add project' })).toBeDisabled();
  });

  it('opens the project’s name and description for editing, in place of its heading', async () => {
    const user = userEvent.setup();
    render(<ProjectsTab />);

    await user.click(projectButton('Harbour'));
    await user.click(screen.getByRole('button', { name: /^Edit the name and description/ }));

    expect(screen.getByRole('textbox', { name: 'New name for the project Harbour' })).toHaveValue('Harbour');
    expect(screen.getByRole('textbox', { name: 'Description for the project Harbour' })).toHaveValue(
      'The town scenes.',
    );
  });

  it('asks before deleting a project, and says how much goes with it', async () => {
    const user = userEvent.setup();
    const deleteProject = vi.fn().mockResolvedValue(undefined);
    useProjectStore.setState({ deleteProject });
    usePresetStore.setState({ customPresets: [preset(HARBOUR.id)] });
    useQuantisePresetStore.setState({ presets: [dials(HARBOUR.id)] });

    render(<ProjectsTab />);
    await user.click(projectButton('Harbour'));
    await user.click(screen.getByRole('button', { name: /^Delete the project/ }));

    expect(deleteProject).not.toHaveBeenCalled();
    expect(screen.getByText(/also deletes the 2 saves filed in it/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Delete “Harbour”' }));
    expect(deleteProject).toHaveBeenCalledWith(HARBOUR.id);
  });

  it('puts the header back on Cancel, having deleted nothing', async () => {
    const user = userEvent.setup();
    const deleteProject = vi.fn().mockResolvedValue(undefined);
    useProjectStore.setState({ deleteProject });

    render(<ProjectsTab />);
    await user.click(projectButton('Harbour'));
    await user.click(screen.getByRole('button', { name: /^Delete the project/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(deleteProject).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /^Delete the project/ })).toBeInTheDocument();
  });

  it('offers no delete for the Default project, and says why in its place', () => {
    render(<ProjectsTab />);

    expect(screen.queryByRole('button', { name: /^Delete the project/ })).toBeNull();
    expect(screen.getByText(/The Default project cannot be deleted/)).toBeInTheDocument();
  });

  it('re-files a saved preset from its own row', async () => {
    const user = userEvent.setup();
    const moveCustomPreset = vi.fn().mockResolvedValue(undefined);
    usePresetStore.setState({ customPresets: [preset(DEFAULT_PROJECT_ID)], moveCustomPreset });

    render(<ProjectsTab />);
    const row = screen.getByRole('heading', { name: 'My Knight' }).closest('li');
    if (row === null) throw new Error('the preset should be a list item.');
    await user.selectOptions(within(row).getByLabelText('Project'), HARBOUR.id);

    expect(moveCustomPreset).toHaveBeenCalledWith('custom-1', HARBOUR.id);
  });

  it('loads a saved preset into the studio from its row', async () => {
    const user = userEvent.setup();
    const loadPreset = vi.fn();
    usePresetStore.setState({ customPresets: [preset(DEFAULT_PROJECT_ID)], loadPreset });

    render(<ProjectsTab />);
    await user.click(screen.getByRole('button', { name: /^Load the preset My Knight/ }));

    expect(loadPreset).toHaveBeenCalledWith(preset(DEFAULT_PROJECT_ID));
  });

  it('asks before deleting a saved preset, and deletes nothing on the first press', async () => {
    const user = userEvent.setup();
    const deleteCustomPreset = vi.fn().mockResolvedValue(undefined);
    usePresetStore.setState({ customPresets: [preset(DEFAULT_PROJECT_ID)], deleteCustomPreset });

    render(<ProjectsTab />);
    await user.click(screen.getByRole('button', { name: 'Delete preset My Knight' }));

    expect(deleteCustomPreset).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Delete “My Knight”' }));
    expect(deleteCustomPreset).toHaveBeenCalledWith('custom-1');
  });

  it('offers the transfer controls, so the whole library can leave this browser', () => {
    render(<ProjectsTab />);

    expect(screen.getByRole('button', { name: /Export JSON/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import JSON/ })).toBeInTheDocument();
  });

  it('opens another project on a fresh panel, carrying no editor or confirmation across', async () => {
    // React keeps a component's state across a prop change, so without a `key` the header's open
    // editor and armed confirmation survived a project switch — and both then acted on the project
    // the reader had just moved to. The editor is the sharper half: its drafts are `useState`
    // initialisers, so it held the previous project's name against the new project's id.
    const user = userEvent.setup();
    const updateProjectDetails = vi.fn().mockResolvedValue(true);
    useProjectStore.setState({ updateProjectDetails });

    render(<ProjectsTab />);
    await user.click(projectButton('Harbour'));
    await user.click(screen.getByRole('button', { name: /^Edit the name and description/ }));
    await user.clear(screen.getByRole('textbox', { name: 'New name for the project Harbour' }));
    await user.type(screen.getByRole('textbox', { name: 'New name for the project Harbour' }), 'Renamed');

    await user.click(projectButton('Default'));

    // The editor is gone rather than pointed at Default, so there is nothing left to submit at the
    // wrong project.
    expect(screen.queryByRole('textbox', { name: /^New name for the project/ })).toBeNull();
    expect(updateProjectDetails).not.toHaveBeenCalled();
  });

  it('carries an armed delete confirmation to no other project', async () => {
    const user = userEvent.setup();
    const deleteProject = vi.fn().mockResolvedValue(undefined);
    useProjectStore.setState({ deleteProject });

    render(<ProjectsTab />);
    await user.click(projectButton('Harbour'));
    await user.click(screen.getByRole('button', { name: /^Delete the project/ }));
    await user.click(projectButton('Default'));

    expect(screen.queryByRole('button', { name: /^Delete “/ })).toBeNull();
    expect(deleteProject).not.toHaveBeenCalled();
  });

  it('offers no delete on the only project, whichever one it is', () => {
    // Not the Default: an imported pack can leave an install holding one named project and no
    // Default at all, and deleting it would leave every save panel with nowhere to file into.
    useProjectStore.setState({ projects: [HARBOUR] });

    render(<ProjectsTab />);

    expect(screen.queryByRole('button', { name: /^Delete the project/ })).toBeNull();
    expect(screen.getByText(/This is your only project/)).toBeInTheDocument();
  });

  it('falls back to the first project when the one being shown is deleted', async () => {
    const user = userEvent.setup();
    render(<ProjectsTab />);
    await user.click(projectButton('Harbour'));
    expect(projectButton('Harbour')).toHaveAttribute('aria-current', 'true');

    // Derived during render rather than corrected in an effect, which would paint one frame against
    // a project that is not there and then correct itself. Inside `act`, because the store is
    // written from outside React here and the assertion is about what the next render paints.
    act(() => {
      useProjectStore.setState({ projects: [createDefaultProject(1_000)] });
    });

    expect(projectButton('Default')).toHaveAttribute('aria-current', 'true');
  });
});
