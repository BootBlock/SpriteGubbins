import { useMemo } from 'react';
import { useCustomIconLibraryStore } from '../stores/useCustomIconLibraryStore.ts';
import { useProjectStore } from '../stores/useProjectStore.ts';
import type { CustomIconEntry } from '../types/iconRoster.ts';
import type { SavedCustomIcon } from '../types/savedCustomIcon.ts';
import { chosenProjectId } from '../utils/chosenProjectId.ts';

/** The icon library the catalogue dialog is showing: whose it is, and what it holds. */
export interface IconLibrary {
  /** The project, by id — the dialog's choice where it still names one, the first project otherwise. */
  readonly projectId: string;
  /** That project's library rows. */
  readonly saved: readonly SavedCustomIcon[];
  /** The same rows' entries, as `checkCustomIcon` measures a library. */
  readonly entries: readonly CustomIconEntry[];
}

/**
 * The library of icons of the reader's own that the catalogue dialog shows and writes to, narrowed from
 * every project's to the chosen one (`chosenProjectId`), so the dialog's shelves, its form's checks and
 * its row actions all measure one project's library and never a mixture.
 */
export function useIconLibrary(): IconLibrary {
  const projects = useProjectStore((state) => state.projects);
  const chosen = useCustomIconLibraryStore((state) => state.chosenProjectId);
  const icons = useCustomIconLibraryStore((state) => state.icons);

  return useMemo(() => {
    const projectId = chosenProjectId(projects, chosen);
    const saved = icons.filter((icon) => icon.projectId === projectId);
    return { projectId, saved, entries: saved.map((icon) => icon.entry) };
  }, [projects, chosen, icons]);
}
