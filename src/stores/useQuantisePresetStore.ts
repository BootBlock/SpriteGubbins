import { create } from 'zustand';
import { QUANTISE_PACK_ITEMS } from '../constants/packImport.ts';
import { getDatabase } from '../db/database.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import { describePackImported } from '../utils/packImportSummary.ts';
import { findPresetByName } from '../utils/presetNames.ts';
import { parseQuantisePresetPack, serialiseQuantisePresetPack } from '../utils/quantisePresetPack.ts';
import { useQuantiseStore } from './useQuantiseStore.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * The dial positions the user has saved, and the actions that move a whole set in or out of the
 * Quantise tab.
 *
 * The quantiser's twin of `usePresetStore`, and separate from it for the reason
 * `QuantisePreset` gives: an archetype describes a subject to generate and one of these describes
 * how to read a raster that came back. Folding them into one store would mean one collection with
 * two kinds of member in it, and every action asking which kind it had.
 *
 * It reaches into `useQuantiseStore` exactly as `usePresetStore` reaches into the studio's three,
 * and by the same rule: through that store's own action, never by writing its shape. `applyDials`
 * is that action, and it is a single `set` — see its own docblock for why twenty would not simply
 * be slower.
 *
 * **Saving reads the store rather than taking an argument**, which is what makes "save these
 * settings" mean the settings on screen and not a copy the panel was holding when it last
 * rendered. The tab's dials move under a debounce, and a preset saved from a stale prop would
 * record a position the reader had already moved past.
 */
export interface QuantisePresetState {
  readonly presets: readonly QuantisePreset[];
  /**
   * Whether a transfer is in flight, which is what both transfer controls disable on.
   *
   * Only the import direction can actually be in flight — `exportQuantisePresetsJSON` serialises
   * synchronously — and the flag covers both anyway, which is what stops an export racing a
   * half-replaced collection. The studio's library keeps the same flag under its older name
   * `isExporting`, and the two are separate flags rather than one because the two collections are
   * replaced independently.
   */
  readonly isTransferring: boolean;
  /**
   * The sets a parsed pack holds, waiting for the reader to agree to the replacement — `null`
   * whenever no import is being asked about. The studio's library stages its own the same way, and
   * for the reason given there: the answer decides what happens to stored rows, and a pack that
   * fails to parse never reaches here.
   */
  readonly pendingImport: readonly QuantisePreset[] | null;

  /** Load the stored presets. Called once on boot, beside the studio's. */
  fetchQuantisePresets(): Promise<void>;
  /**
   * Put a preset's dials into the tab.
   *
   * The sheet, the grid and any held palette are left exactly as they are — see `QuantiseDials`
   * for why none of the three is a preset's to move. So loading one over a sheet you are looking at
   * re-reads *that* sheet at the saved settings, which is the whole point of having saved them.
   */
  loadQuantisePreset(preset: QuantisePreset): void;
  /**
   * Save the tab's current dials under `name`, with `description` as the sentence its row carries.
   * A blank name is ignored, and a blank description is a preset that simply has none. Returns
   * whether it was stored, so the caller can keep the name in the box to retry rather than clearing
   * a field whose contents were never persisted.
   *
   * A name already in the library **updates** that preset rather than adding a second one under the
   * same name — the same rule the studio's library follows, reached the same way: by reusing the
   * existing id, which both backends upsert on.
   */
  saveQuantisePreset(name: string, description: string): Promise<boolean>;
  deleteQuantisePreset(id: string): Promise<void>;
  /** The whole collection as a pack file's text. */
  exportQuantisePresetsJSON(): string;
  /**
   * Read the pack in `file` and stage it for confirmation. Nothing stored changes here — the
   * replacement itself is {@link QuantisePresetState.confirmQuantisePresetImport}.
   */
  importQuantisePresetsJSON(file: File): Promise<void>;
  /** Replace the stored collection with the staged pack. */
  confirmQuantisePresetImport(): Promise<void>;
  /** Discard the staged pack, leaving the stored collection exactly as it is. */
  cancelQuantisePresetImport(): void;
}

export const useQuantisePresetStore = create<QuantisePresetState>((set, get) => ({
  presets: [],
  isTransferring: false,
  pendingImport: null,

  fetchQuantisePresets: async () => {
    try {
      const database = await getDatabase();
      set({ presets: await database.listQuantisePresets() });
    } catch {
      useUIStore.getState().showToast('Could not load your saved quantiser settings');
    }
  },

  loadQuantisePreset: (preset) => {
    useQuantiseStore.getState().applyDials(preset.dials);
    useUIStore.getState().showToast(`Loaded quantiser preset: ${preset.name}`);
  },

  saveQuantisePreset: async (name, description) => {
    const trimmed = name.trim();
    if (!trimmed) return false;

    const existing = findPresetByName(get().presets, trimmed);
    const {
      keyingEnabled,
      keyTolerance,
      vote,
      outlineExpansion,
      lineStrength,
      trimStrength,
      inkThreshold,
      fillCleanup,
      colorMerge,
      cleanupPasses,
      dither,
      paletteSnap,
      spriteGap,
      symmetry,
      symmetryTolerance,
      symmetryConfidence,
      duplicateTolerance,
      duplicateSnap,
      frameAlignment,
      frameDriftTolerance,
      antiAlias,
      antiAliasThreshold,
      antiAliasStrength,
      antiAliasRun,
      antiAliasPalette,
    } = useQuantiseStore.getState();

    const preset: QuantisePreset = {
      id: existing?.id ?? `quantise-${crypto.randomUUID()}`,
      // The typed name wins, so re-saving "flat sheets" as "Flat sheets" fixes the capitalisation.
      name: trimmed,
      description: description.trim(),
      // Named field by field rather than spread off the store, and that is the point: the store
      // also holds a sheet, a grid and possibly a locked palette, and a spread would carry all
      // three into storage. The compiler checks the set — a dial added to `QuantiseDials`, or to
      // the pipeline's `QuantiseTuning` that it extends, fails here until it is listed.
      dials: {
        keyingEnabled,
        keyTolerance,
        vote,
        outlineExpansion,
        lineStrength,
        trimStrength,
        inkThreshold,
        fillCleanup,
        colorMerge,
        cleanupPasses,
        dither,
        paletteSnap,
        spriteGap,
        symmetry,
        symmetryTolerance,
        symmetryConfidence,
        duplicateTolerance,
        duplicateSnap,
        frameAlignment,
        frameDriftTolerance,
        antiAlias,
        antiAliasThreshold,
        antiAliasStrength,
        antiAliasRun,
        antiAliasPalette,
      },
    };

    try {
      const database = await getDatabase();
      await database.saveQuantisePreset(preset);
      // Re-read rather than appending in place: each backend decides this collection's order for
      // itself — SQLite by `updated_at DESC`, the fallback by position — so an optimistic append
      // would put the new preset where only one of them agrees it belongs.
      set({ presets: await database.listQuantisePresets() });
      useUIStore
        .getState()
        .showToast(
          existing ? `Updated quantiser preset “${trimmed}”` : `Saved quantiser preset “${trimmed}”`,
        );
      return true;
    } catch {
      useUIStore.getState().showToast('Could not save those settings');
      return false;
    }
  },

  deleteQuantisePreset: async (id) => {
    try {
      const database = await getDatabase();
      await database.deleteQuantisePreset(id);
      set((state) => ({ presets: state.presets.filter((preset) => preset.id !== id) }));
      useUIStore.getState().showToast('Deleted quantiser preset');
    } catch {
      useUIStore.getState().showToast('Could not delete that preset');
    }
  },

  exportQuantisePresetsJSON: () => serialiseQuantisePresetPack(get().presets),

  importQuantisePresetsJSON: async (file) => {
    const { showToast } = useUIStore.getState();
    set({ isTransferring: true });
    try {
      const imported = parseQuantisePresetPack(await file.text());
      if (imported === null) {
        showToast('That file is not a Sprite Gubbins quantiser pack');
        return;
      }

      // Importing replaces the collection, so an empty pack is refused rather than obeyed: a file
      // exported from an install that had saved nothing would otherwise delete every set of dial
      // positions this one holds.
      if (imported.length === 0) {
        showToast('No saved settings found in that file');
        return;
      }

      // Staged, not applied — the studio's library does the same, and this is one flow written
      // twice rather than two decisions. Whichever tab the reader is on, replacing a collection
      // they built is asked on screen.
      set({ pendingImport: imported });
    } catch {
      showToast('Could not import that quantiser pack');
    } finally {
      set({ isTransferring: false });
    }
  },

  confirmQuantisePresetImport: async () => {
    const imported = get().pendingImport;
    if (imported === null) return;

    const { showToast } = useUIStore.getState();
    const replacing = get().presets.length;
    // Cleared before the first await, for the reason `confirmPresetImport` gives: the staged pack
    // is this action's guard, and leaving it open across the write let a second press replace
    // twice and let Cancel report a deletion as though it had not happened.
    set({ isTransferring: true, pendingImport: null });
    try {
      const database = await getDatabase();
      await database.replaceQuantisePresets(imported);
      set({ presets: imported });
      showToast(describePackImported(imported.length, replacing, QUANTISE_PACK_ITEMS));
    } catch {
      showToast('Could not import that quantiser pack');
    } finally {
      set({ isTransferring: false });
    }
  },

  cancelQuantisePresetImport: () => {
    if (get().pendingImport === null) return;
    set({ pendingImport: null });
    useUIStore.getState().showToast('Import cancelled, and nothing you saved was deleted');
  },
}));
