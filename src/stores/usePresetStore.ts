import { create } from 'zustand';
import { PRESETS } from '../constants/presets/index.ts';
import { getDatabase } from '../db/database.ts';
import { parseJson } from '../db/readers.ts';
import { parseImportedPreset } from '../db/rows.ts';
import type { PresetArchetype } from '../types/preset.ts';
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
  /** Put a preset's configuration into the studio and switch to it. */
  loadPreset(preset: PresetArchetype): void;
  /**
   * Save the studio's current configuration under `name`; a blank name is ignored. Returns whether
   * it was stored, so the caller can keep the name in the box to retry rather than clearing a field
   * whose contents were never persisted.
   */
  saveCustomPreset(name: string): Promise<boolean>;
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

/**
 * The built-in ids, so an import can skip them.
 *
 * An exported pack contains the built-ins, which is what makes it readable on its own; without this
 * filter, importing your own export would store six copies of them as *custom* presets and the
 * Presets tab would show every archetype twice.
 */
const BUILT_IN_IDS: ReadonlySet<string> = new Set(PRESETS.map((preset) => preset.id));

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
    useOutputStore.getState().setOutputConfig(preset.output);
    const ui = useUIStore.getState();
    ui.setActiveTab('studio');
    ui.showToast(`Loaded preset: ${preset.name}`);
  },

  saveCustomPreset: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const { category, subject } = useSubjectStore.getState();
    const preset: PresetArchetype = {
      id: `custom-${crypto.randomUUID()}`,
      name: trimmed,
      category,
      subject,
      output: useOutputStore.getState().output,
      isCustom: true,
    };

    try {
      const database = await getDatabase();
      await database.savePreset(preset);
      // Re-read rather than appending in place: the two backends order this collection differently
      // — SQLite by `updated_at DESC`, the fallback by insertion — so an optimistic append would put
      // the new preset where only one of them agrees it belongs.
      set({ customPresets: await database.listPresets() });
      useUIStore.getState().showToast(`Saved custom preset "${trimmed}"`);
      return true;
    } catch {
      useUIStore.getState().showToast('Could not save that preset');
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

  exportPresetsJSON: () => JSON.stringify([...PRESETS, ...get().customPresets], null, 2),

  importPresetsJSON: async (file) => {
    const { showToast } = useUIStore.getState();
    set({ isExporting: true });
    try {
      const parsed = parseJson(await file.text());
      if (!Array.isArray(parsed)) {
        showToast('That file is not a Sprite Gubbins preset pack');
        return;
      }

      const imported = parsed
        .map(parseImportedPreset)
        .filter((preset): preset is PresetArchetype => preset !== null)
        .filter((preset) => !BUILT_IN_IDS.has(preset.id));

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
