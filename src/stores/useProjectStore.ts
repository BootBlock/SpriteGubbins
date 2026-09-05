import { create } from 'zustand';
import { createDefaultProject, isDefaultProject } from '../constants/projects.ts';
import { getDatabase } from '../db/database.ts';
import type { Project } from '../types/project.ts';
import { findByName } from '../utils/findByName.ts';
import { usePresetStore } from './usePresetStore.ts';
import { useQuantisePresetStore } from './useQuantisePresetStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * The projects a saved archetype or a saved set of quantiser dials is filed under, and the actions
 * that make, rename and destroy one.
 *
 * **Moving the library in and out is not here**, and `useLibraryTransferStore` says why: a pack
 * carries all three collections together, so it is no more this store's than either of theirs.
 * What is here is a project's own life — made, renamed, and destroyed along with what it holds.
 *
 * It reaches into the two collection stores, and only through their own actions — the same rule
 * `usePresetStore` follows in reaching into the studio's three. Neither of them reaches back: a
 * save is told which project it is for by the control that asked for it, so nothing below needs to
 * read this store to write a preset.
 */
export interface ProjectState {
  readonly projects: readonly Project[];

  /**
   * Load the stored projects, making the Default one where an install has none.
   *
   * The making is here rather than in the database layer because it is a decision about what the
   * app *is* — every save has to have somewhere to go — rather than about how rows are stored, and
   * because a backend that invented a row on a read would do it on both backends' behalf and in a
   * place neither can report a failure from.
   */
  fetchProjects(): Promise<void>;
  /**
   * Make a project under `name`, with `description` as the sentence its row carries. A blank name
   * is ignored, and a name another project already holds is refused. Returns whether it was stored,
   * so the caller can keep what was typed to retry.
   *
   * A name is refused rather than allowed to repeat because a project is chosen from a **dropdown**
   * everywhere a save happens, and two identical entries there are a choice nobody can make. This
   * is not the archetypes' rule — saving under a name the library holds updates that preset — and
   * it is deliberately different: a project is a container the reader is choosing between, not a
   * record they are overwriting.
   */
  createProject(name: string, description: string): Promise<boolean>;
  /**
   * Change one project's name and the sentence under it, leaving its id and its contents alone.
   * Returns whether it was stored, so the caller can keep its editor open on a refusal.
   *
   * **The id is what everything refers to, so this cannot break a reference** — which is the whole
   * reason projects are addressed by GUID. Renaming the Default project is allowed for exactly that
   * reason: somebody working on one game should be able to call it by that game's name.
   */
  updateProjectDetails(id: string, name: string, description: string): Promise<boolean>;
  /**
   * Delete a project **and every preset filed under it**, then re-read both collections.
   *
   * The cascade is the backend's, in one transaction, so there is no window in which a preset names
   * a project that is gone. What is left here is the consequence for the app's own state: both
   * collection stores are holding rows this may have deleted, so both are asked to re-read rather
   * than being filtered in place — the backend is where that collection's membership is decided.
   *
   * The Default project is refused, because it is where a save goes when nothing else is chosen and
   * an install with no projects at all has nowhere to put one.
   */
  deleteProject(id: string): Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],

  fetchProjects: async () => {
    try {
      const database = await getDatabase();
      const stored = await database.listProjects();
      if (stored.length > 0) {
        set({ projects: stored });
        return;
      }

      // A first visit, or a database that has just been discarded for a schema change. The Default
      // project is written rather than only held in memory, so the preset a reader saves a moment
      // later names a project that is actually stored.
      const fallback = createDefaultProject(Date.now());
      await database.saveProject(fallback);
      set({ projects: [fallback] });
    } catch {
      useUIStore.getState().showToast('Could not load your projects');
    }
  },

  createProject: async (name, description) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const clash = findByName(get().projects, trimmed);
    if (clash !== undefined) {
      useUIStore.getState().showToast(`A project named “${clash.name}” already exists`);
      return false;
    }

    const now = Date.now();
    const project: Project = {
      id: crypto.randomUUID(),
      name: trimmed,
      description: description.trim(),
      createdAt: now,
      updatedAt: now,
    };

    try {
      const database = await getDatabase();
      await database.saveProject(project);
      // Re-read rather than prepending here: each backend decides this collection's order for
      // itself — SQLite by `updated_at DESC`, the fallback by position — so an optimistic insert
      // would put the project where only one of them agrees it belongs.
      set({ projects: await database.listProjects() });
      useUIStore.getState().showToast(`Created project “${trimmed}”`);
      return true;
    } catch {
      useUIStore.getState().showToast('Could not create that project');
      return false;
    }
  },

  updateProjectDetails: async (id, name, description) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const project = get().projects.find((candidate) => candidate.id === id);
    if (!project) return false;

    // A project matches itself, so fixing your own capitalisation is not a collision.
    const clash = findByName(get().projects, trimmed);
    if (clash !== undefined && clash.id !== id) {
      useUIStore.getState().showToast(`A project named “${clash.name}” already exists`);
      return false;
    }

    try {
      const database = await getDatabase();
      // Saved whole, not patched: `saveProject` replaces the row, so sending only the two edited
      // fields would blank the timestamps the list is ordered by. `createdAt` is carried through
      // unchanged — a rename is not a new project.
      await database.saveProject({
        ...project,
        name: trimmed,
        description: description.trim(),
        updatedAt: Date.now(),
      });
      set({ projects: await database.listProjects() });
      useUIStore.getState().showToast(`Updated “${trimmed}”`);
      return true;
    } catch {
      useUIStore.getState().showToast('Could not update that project');
      return false;
    }
  },

  deleteProject: async (id) => {
    const { showToast } = useUIStore.getState();
    if (isDefaultProject(id)) {
      showToast('The Default project cannot be deleted');
      return;
    }

    try {
      const database = await getDatabase();
      await database.deleteProject(id);
      set({ projects: await database.listProjects() });
      await usePresetStore.getState().fetchCustomPresets();
      await useQuantisePresetStore.getState().fetchQuantisePresets();
      showToast('Deleted project, and everything saved in it');
    } catch {
      showToast('Could not delete that project');
    }
  },
}));
