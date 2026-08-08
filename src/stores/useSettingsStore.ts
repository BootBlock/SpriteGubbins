import { create } from 'zustand';
import { DEFAULT_SETTINGS } from '../constants/settings.ts';
import { getDatabase } from '../db/database.ts';
import type { AppSettings } from '../types/settings.ts';
import { useUIStore } from './useUIStore.ts';

/**
 * The user's preferences about the application itself.
 *
 * Held apart from `useUIStore` even though both are "interface state", because the two have opposite
 * lifetimes: the shell store is what is happening *now* — which view, which overlay, what the toast
 * says — and is meant to be forgotten when the tab closes. This is what the user decided once and
 * expects to find again, so it is persisted, and mixing the two would either make the toast durable
 * or the accent temporary.
 *
 * There is no action per preference. Every change goes through {@link SettingsState.updateSettings}
 * with a patch, so the write path is one function: apply, persist, and say so if storage refused.
 * Four near-identical actions differing only in which field they set is the duplication that lets one
 * of them quietly forget the second half.
 */
export interface SettingsState {
  readonly settings: AppSettings;

  /** Read the stored settings into the store, and apply the opening view. Called once on boot. */
  fetchSettings(): Promise<void>;
  /** Change one or more preferences, and persist the result. */
  updateSettings(patch: Partial<AppSettings>): Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,

  fetchSettings: async () => {
    let settings: AppSettings;
    try {
      settings = await (await getDatabase()).loadSettings();
    } catch {
      // Deliberately silent, and the one storage failure in the app that is. Every other read the
      // stores make is for something the user put there — their presets, their history — so failing
      // to find it is news worth a toast. Settings have a complete and correct answer when storage
      // is unavailable: the defaults, which are already in the store and are what the app looked
      // like a moment ago. Announcing it would report a problem on a screen that is working, about
      // which there is nothing to do.
      return;
    }

    set({ settings });
    // Applied here rather than from a component effect, because this is the moment the preference
    // arrives and `useUIStore` is what knows whether the user has navigated in the meantime.
    useUIStore.getState().openInitialTab(settings.openingView);
  },

  updateSettings: async (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });

    try {
      await (await getDatabase()).saveSettings(settings);
    } catch {
      // The change **stays applied**, which is the opposite of what the preset and history stores do
      // with a refused write — and the difference is what the two are for. A preset that was not
      // stored is a preset the user does not have, so showing it would be a lie. A preference that
      // was not stored is still a preference: the accent they picked is on the screen in front of
      // them and works perfectly for this session. Reverting it would undo a click they can see
      // took effect, to enforce a durability they were not promised — so the honest answer is to
      // keep it and say plainly which half failed.
      useUIStore.getState().showToast('Applied, but that setting could not be saved');
    }
  },
}));
