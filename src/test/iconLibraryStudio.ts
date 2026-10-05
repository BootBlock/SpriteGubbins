import { defaultSubjectFor } from '../constants/categories/index.ts';
import type { PersistenceBackend } from '../db/backend.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { useCustomIconLibraryStore } from '../stores/useCustomIconLibraryStore.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useProjectStore } from '../stores/useProjectStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import type { CustomIconEntry, IconPick } from '../types/iconRoster.ts';
import type { Project } from '../types/project.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import { iconPickId } from '../utils/iconPickId.ts';

/**
 * The studio and the icon library as the catalogue dialog's suites set them up: an ICON subject holding
 * the picks given, the Default project first and a second project beside it, and the library store
 * pointed at the Default project.
 */

/** A second project, for the suites that move the library between two. */
export const HARBOUR: Project = {
  id: 'harbour',
  name: 'Harbour',
  description: '',
  createdAt: 1,
  updatedAt: 1,
};

/** An ICON studio holding `picks`, with its undo stack started there. */
export function iconStudio(picks: readonly IconPick[]): void {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useSubjectStore.setState({
    category: 'ICON',
    subject: {
      ...defaultSubjectFor('ICON'),
      icons: { look: 'ISOLATED_MARK', colourMode: 'FULL_COLOUR', picks },
    },
  });
  useSubjectStore.getState().openStudio();
}

/** A library row of `projectId`, with a row id made from the entry's slot. */
export function savedIcon(entry: CustomIconEntry, projectId = DEFAULT_PROJECT_ID): SavedCustomIcon {
  return { id: `row-${projectId}-${entry.id}`, projectId, entry };
}

/**
 * The Default project and {@link HARBOUR} stored and loaded, `icons` stored in `backend` and read into
 * the library store, and the library pointed at Default.
 */
export async function iconLibrary(
  backend: PersistenceBackend,
  icons: readonly SavedCustomIcon[],
): Promise<void> {
  const projects = [createDefaultProject(2), HARBOUR];
  for (const project of projects) await backend.saveProject(project);
  for (const icon of icons) await backend.saveCustomIcon(icon);
  useProjectStore.setState({ projects });
  useCustomIconLibraryStore.setState({ icons: [], chosenProjectId: DEFAULT_PROJECT_ID });
  await useCustomIconLibraryStore.getState().fetchCustomIcons();
}

/** The slot names the studio's roster holds, in order. */
export function rosterIds(): readonly string[] {
  return (useSubjectStore.getState().subject.icons?.picks ?? []).map(iconPickId);
}

/** The entries the library store holds for `projectId`. */
export function libraryEntries(projectId = DEFAULT_PROJECT_ID): readonly CustomIconEntry[] {
  return useCustomIconLibraryStore
    .getState()
    .icons.filter((icon) => icon.projectId === projectId)
    .map((icon) => icon.entry);
}
