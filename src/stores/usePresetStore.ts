import { create } from 'zustand';
import { getDatabase } from '../db/database.ts';
import { storageFailure } from '../db/storageFailure.ts';
import type { CustomArchetype, PresetArchetype } from '../types/preset.ts';
import { toImageConfig } from '../utils/imageConfig.ts';
import { findByNameIn } from '../utils/findByNameIn.ts';
import { useOutputStore } from './useOutputStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * The user's saved archetypes, and the actions that move a whole configuration in or out of the
 * studio.
 *
 * This is the one store that reaches into others, and by design: loading a preset *is* writing the
 * subject, the category and the output configuration together, and saving one is reading all three.
 * Everything it touches it touches through that store's own actions, so each store keeps its own
 * invariants — nothing here writes another store's shape directly.
 *
 * Only *custom* presets live here. The built-ins are a compile-time constant and are never stored,
 * copied, or editable.
 *
 * **Every preset here belongs to a project, and this store never chooses which.** The project is an
 * argument to the two actions that write one, because the control that asked is where the reader
 * made that choice — a store that reached into `useProjectStore` for a "current" project would be
 * inventing a piece of state the app deliberately does not have. Moving the library in and out is
 * `useProjectStore`'s too, for the reason `LibraryPack` gives: a pack carries the projects as well,
 * and a store that could replace only this collection could not import one.
 */
export interface PresetState {
  readonly customPresets: readonly CustomArchetype[];

  /** Load the stored custom presets into the store. Called once on boot. */
  fetchCustomPresets(): Promise<void>;
  /**
   * Put a preset's configuration into the studio and switch to it.
   *
   * Everything the preset describes about the *image* is replaced; the two companion outputs are
   * left as the user set them. See `OutputConfig` for why those are not an archetype's to move.
   */
  loadPreset(preset: PresetArchetype): void;
  /**
   * Save the studio's current configuration into `projectId` under `name`, with `description` as
   * the sentence its card carries; a blank name is ignored, and a blank description is a preset
   * that simply has none. Returns whether it was stored, so the caller can keep the name in the box
   * to retry rather than clearing a field whose contents were never persisted.
   *
   * A name already used **in that project** updates that preset rather than adding a second one
   * under the same name. Minting an id unconditionally is what made "load a preset, adjust a field,
   * save it again" produce two cards the user could tell apart only by which sorted newer.
   *
   * **Per project, not across the library**, which is the rule projects changed: two games are
   * each free to have their own "Hero", and a save into one of them may not silently overwrite the
   * other's. The panel that offers Save says which of the two it is about to do, and it decides
   * that by the same rule.
   */
  saveCustomPreset(name: string, description: string, projectId: string): Promise<boolean>;
  /**
   * Change one custom preset's name and description, leaving the configuration and the project
   * behind them alone. Returns whether it was stored, so the caller can keep its editor open on a
   * refusal instead of closing over a change that did not happen.
   *
   * Both at once rather than one action each, because they are one edit: they are shown in one form
   * and a reader correcting a name is usually correcting the sentence under it in the same breath.
   * It is also the *only* way to reach a description without touching the configuration — saving
   * over a preset by name writes the studio as it stands, which is a different intention entirely.
   *
   * Re-filing is {@link moveCustomPreset} and not part of this, because it is a project chosen from a
   * dropdown rather than something typed: a reader moving a preset between projects is not editing
   * its name, and asking them to open a form to do it would be two steps for one decision.
   */
  updateCustomPresetDetails(id: string, name: string, description: string): Promise<boolean>;
  /**
   * File one preset under a different project, leaving everything else about it alone. The preset
   * keeps its id, so nothing that refers to it is disturbed.
   *
   * **Refused where that project already holds a preset of the same name** (issue #454), by the
   * rule a rename is refused by. Folding the two into one would destroy whichever configuration the
   * reader did not have in mind, and letting both in would leave two presets a save and a rename
   * could not tell apart: each picks its target by name, so both would act on whichever the list
   * showed first. `ProjectMoveField` says so before the press, so a refusal here is the guard for a
   * list that changed under it.
   */
  moveCustomPreset(id: string, projectId: string): Promise<void>;
  deleteCustomPreset(id: string): Promise<void>;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  customPresets: [],

  fetchCustomPresets: async () => {
    try {
      const database = await getDatabase();
      set({ customPresets: await database.listPresets() });
    } catch (error) {
      useUIStore.getState().showToast(storageFailure('Could not load your saved presets', error));
    }
  },

  loadPreset: (preset) => {
    // Both stores written inside one action, so the undo stack records the studio this leaves
    // behind rather than half of it. `applyImageConfig` rather than `setOutputConfig`: a preset
    // describes an archetype and has no business deciding whether this reader wants a component map.
    useSubjectStore.getState().setStudio(preset.category, preset.subject, () => {
      useOutputStore.getState().applyImageConfig(preset.output);
    });
    const ui = useUIStore.getState();
    ui.setActiveTab('studio');
    ui.showToast(`Loaded preset: ${preset.name}`);
  },

  saveCustomPreset: async (name, description, projectId) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const { category, subject } = useSubjectStore.getState();
    // Reusing the id is the whole mechanism: `savePreset` is an upsert by id on both backends.
    // Only custom presets are candidates — a built-in is never stored, so nothing can overwrite it —
    // and only those in the project being saved into, so one project's names cannot reach another's.
    const existing = findByNameIn(get().customPresets, projectId, trimmed);
    const preset: CustomArchetype = {
      id: existing?.id ?? `custom-${crypto.randomUUID()}`,
      projectId,
      // The typed name wins, so re-saving "my knight" as "My Knight" fixes the capitalisation.
      name: trimmed,
      // What the box holds, whatever the preset being updated held before. The panel shows that
      // preset's own description the moment the name matches, so an update is editing the sentence
      // in front of you rather than replacing one out of sight.
      description: description.trim(),
      category,
      subject,
      // Stripped rather than stored and ignored on load: a saved preset is also an exported preset,
      // and a pack carrying `emitComponentMap` would be describing a preference of whoever happened to
      // save it as though it were a property of the archetype.
      output: toImageConfig(useOutputStore.getState().output),
      isCustom: true,
    };

    try {
      const database = await getDatabase();
      await database.savePreset(preset);
      // Re-read rather than placing the preset in the list here: both backends now list this
      // collection newest-first — SQLite by `updated_at DESC`, the fallback by the prepend in
      // `savePreset` — and the backend is where that decision belongs. Reproducing it at this call
      // site would be a second copy of the ordering rule, free to drift from the one that governs
      // what is actually stored.
      set({ customPresets: await database.listPresets() });
      useUIStore
        .getState()
        .showToast(existing ? `Updated custom preset “${trimmed}”` : `Saved custom preset “${trimmed}”`);
      return true;
    } catch (error) {
      useUIStore.getState().showToast(storageFailure('Could not save that preset', error));
      return false;
    }
  },

  updateCustomPresetDetails: async (id, name, description) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const preset = get().customPresets.find((candidate) => candidate.id === id);
    if (!preset) return false;

    // Refused rather than merged: folding one preset into another would destroy whichever
    // configuration the user did not have in mind. A preset matches itself, so fixing your own
    // capitalisation is not a collision — and the comparison is inside this preset's own project,
    // by the rule saving follows.
    const clash = findByNameIn(get().customPresets, preset.projectId, trimmed);
    if (clash !== undefined && clash.id !== id) {
      useUIStore.getState().showToast(`A preset named “${clash.name}” already exists here`);
      return false;
    }

    try {
      const database = await getDatabase();
      // Saved whole, not patched: `savePreset` replaces the row, so sending only the two edited
      // fields would blank the configuration the preset exists to hold.
      await database.savePreset({ ...preset, name: trimmed, description: description.trim() });
      set({ customPresets: await database.listPresets() });
      useUIStore.getState().showToast(`Updated “${trimmed}”`);
      return true;
    } catch (error) {
      useUIStore.getState().showToast(storageFailure('Could not update that preset', error));
      return false;
    }
  },

  moveCustomPreset: async (id, projectId) => {
    const preset = get().customPresets.find((candidate) => candidate.id === id);
    // Already there is not a failure and not a write: a second press of Move that arrives after the
    // first has landed is the reader asking for what is already true.
    if (!preset || preset.projectId === projectId) return;

    if (findByNameIn(get().customPresets, projectId, preset.name) !== undefined) {
      useUIStore.getState().showToast(`A preset named “${preset.name}” is already in that project`);
      return;
    }

    try {
      const database = await getDatabase();
      await database.savePreset({ ...preset, projectId });
      set({ customPresets: await database.listPresets() });
      useUIStore.getState().showToast(`Moved “${preset.name}”`);
    } catch (error) {
      useUIStore.getState().showToast(storageFailure('Could not move that preset', error));
    }
  },

  deleteCustomPreset: async (id) => {
    try {
      const database = await getDatabase();
      await database.deletePreset(id);
      set((state) => ({ customPresets: state.customPresets.filter((preset) => preset.id !== id) }));
      useUIStore.getState().showToast('Deleted custom preset');
    } catch (error) {
      useUIStore.getState().showToast(storageFailure('Could not delete that preset', error));
    }
  },
}));
