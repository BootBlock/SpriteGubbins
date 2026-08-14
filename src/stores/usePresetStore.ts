import { create } from 'zustand';
import { getDatabase } from '../db/database.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { toImageConfig } from '../utils/imageConfig.ts';
import { findPresetByName } from '../utils/presetNames.ts';
import { parsePresetPack, serialisePresetPack } from '../utils/presetPack.ts';
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
 */
export interface PresetState {
  readonly customPresets: readonly PresetArchetype[];
  /**
   * Whether a preset-pack transfer is running — the flag the Presets tab disables both transfer
   * controls on. Only the import direction can actually be in flight (`exportPresetsJSON` serialises
   * synchronously), which is what stops an export racing a half-replaced collection.
   */
  readonly isExporting: boolean;

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
   * Save the studio's current configuration under `name`, with `description` as the sentence its
   * card carries; a blank name is ignored, and a blank description is a preset that simply has none.
   * Returns whether it was stored, so the caller can keep the name in the box to retry rather than
   * clearing a field whose contents were never persisted.
   *
   * A name already in the library **updates** that preset rather than adding a second one under the
   * same name. Minting an id unconditionally is what made "load a preset, adjust a field, save it
   * again" produce two cards the user could tell apart only by which sorted newer.
   */
  saveCustomPreset(name: string, description: string): Promise<boolean>;
  /**
   * Change one custom preset's name and description, leaving the configuration behind them alone.
   * Returns whether it was stored, so the caller can keep its editor open on a refusal instead of
   * closing over a change that did not happen.
   *
   * Both at once rather than one action each, because they are one edit: they are shown in one form
   * and a reader correcting a name is usually correcting the sentence under it in the same breath.
   * It is also the *only* way to reach a description without touching the configuration — saving
   * over a preset by name writes the studio as it stands, which is a different intention entirely.
   */
  updateCustomPresetDetails(id: string, name: string, description: string): Promise<boolean>;
  deleteCustomPreset(id: string): Promise<void>;
  /**
   * The preset pack as JSON, built-ins included, for the caller to offer as a download. Returns the
   * text rather than performing the download: building and clicking an anchor element would be the
   * DOM's job, and a string is something a test can assert on.
   */
  exportPresetsJSON(): string;
  /** Replace the stored custom presets with the pack in `file`. */
  importPresetsJSON(file: File): Promise<void>;
}

export const usePresetStore = create<PresetState>((set, get) => ({
  customPresets: [],
  isExporting: false,

  fetchCustomPresets: async () => {
    try {
      const database = await getDatabase();
      set({ customPresets: await database.listPresets() });
    } catch {
      useUIStore.getState().showToast('Could not load your saved presets');
    }
  },

  loadPreset: (preset) => {
    useSubjectStore.getState().setSubject(preset.category, preset.subject);
    useOutputStore.getState().applyImageConfig(preset.output);
    const ui = useUIStore.getState();
    ui.setActiveTab('studio');
    ui.showToast(`Loaded preset: ${preset.name}`);
  },

  saveCustomPreset: async (name, description) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const { category, subject } = useSubjectStore.getState();
    // Reusing the id is the whole mechanism: `savePreset` is an upsert by id on both backends.
    // Only custom presets are candidates — a built-in is never stored, so nothing can overwrite it.
    const existing = findPresetByName(get().customPresets, trimmed);
    const preset: PresetArchetype = {
      id: existing?.id ?? `custom-${crypto.randomUUID()}`,
      // The typed name wins, so re-saving "my knight" as "My Knight" fixes the capitalisation.
      name: trimmed,
      // What the box holds, whatever the preset being updated held before. The panel shows that
      // preset's own description the moment the name matches, so an update is editing the sentence
      // in front of you rather than replacing one out of sight.
      description: description.trim(),
      category,
      subject,
      // Stripped rather than stored and ignored on load: a saved preset is also an exported preset,
      // and a pack carrying `emitManifest` would be describing a preference of whoever happened to
      // save it as though it were a property of the archetype.
      output: toImageConfig(useOutputStore.getState().output),
      isCustom: true,
    };

    try {
      const database = await getDatabase();
      await database.savePreset(preset);
      // Re-read rather than appending in place: the two backends order this collection differently
      // — SQLite by `updated_at DESC`, the fallback by insertion — so an optimistic append would put
      // the new preset where only one of them agrees it belongs.
      set({ customPresets: await database.listPresets() });
      useUIStore
        .getState()
        .showToast(existing ? `Updated custom preset "${trimmed}"` : `Saved custom preset "${trimmed}"`);
      return true;
    } catch {
      useUIStore.getState().showToast('Could not save that preset');
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
    // capitalisation is not a collision.
    const clash = findPresetByName(get().customPresets, trimmed);
    if (clash !== undefined && clash.id !== id) {
      useUIStore.getState().showToast(`A preset named "${clash.name}" already exists`);
      return false;
    }

    try {
      const database = await getDatabase();
      // Saved whole, not patched: `savePreset` replaces the row, so sending only the two edited
      // fields would blank the configuration the preset exists to hold.
      await database.savePreset({ ...preset, name: trimmed, description: description.trim() });
      set({ customPresets: await database.listPresets() });
      useUIStore.getState().showToast(`Updated "${trimmed}"`);
      return true;
    } catch {
      useUIStore.getState().showToast('Could not update that preset');
      return false;
    }
  },

  deleteCustomPreset: async (id) => {
    try {
      const database = await getDatabase();
      await database.deletePreset(id);
      set((state) => ({ customPresets: state.customPresets.filter((preset) => preset.id !== id) }));
      useUIStore.getState().showToast('Deleted custom preset');
    } catch {
      useUIStore.getState().showToast('Could not delete that preset');
    }
  },

  exportPresetsJSON: () => serialisePresetPack(get().customPresets),

  importPresetsJSON: async (file) => {
    const { showToast } = useUIStore.getState();
    set({ isExporting: true });
    try {
      const imported = parsePresetPack(await file.text());
      if (imported === null) {
        showToast('That file is not a Sprite Gubbins preset pack');
        return;
      }

      // Importing replaces the collection, so an empty result is refused rather than obeyed: a
      // pack of nothing but built-ins would otherwise silently delete every preset the user has.
      if (imported.length === 0) {
        showToast('No custom presets found in that file');
        return;
      }

      const database = await getDatabase();
      await database.replacePresets(imported);
      set({ customPresets: imported });
      showToast(`Imported ${imported.length} custom preset${imported.length === 1 ? '' : 's'}`);
    } catch {
      showToast('Could not import that preset pack');
    } finally {
      set({ isExporting: false });
    }
  },
}));
