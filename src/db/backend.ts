import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import type { AppSettings } from '../types/settings.ts';

/**
 * What the rest of the app is allowed to ask of storage.
 *
 * Two implementations satisfy it — SQLite over OPFS, and a localStorage fallback for browsers
 * or hosts where OPFS is unavailable. Everything above this line is written against the
 * interface, so no store or component ever branches on which one it got.
 *
 * Every method is async even where the fallback is synchronous: the SQLite path genuinely is
 * asynchronous, and a caller that only awaits *sometimes* would be a race waiting to happen.
 */
export interface PersistenceBackend {
  /**
   * Which implementation this is.
   *
   * Read by `components/tabs/StorageStatus.tsx` and shown on the Architecture tab, so a user can
   * tell where their data actually went — and so a database that silently failed to open stops
   * looking exactly like one that opened.
   */
  readonly kind: BackendKind;

  addHistoryLog(log: PromptHistoryLog): Promise<void>;
  listHistoryLogs(): Promise<PromptHistoryLog[]>;
  /** Remove one entry. Deleting an id that is not there is a no-op, not an error. */
  deleteHistoryLog(id: string): Promise<void>;
  clearHistoryLogs(): Promise<void>;

  savePreset(preset: PresetArchetype): Promise<void>;
  listPresets(): Promise<PresetArchetype[]>;
  deletePreset(id: string): Promise<void>;
  /** Replace the whole custom-preset collection — what importing a preset pack does. */
  replacePresets(presets: readonly PresetArchetype[]): Promise<void>;

  /**
   * The stored interface settings, or the defaults where nothing has been stored.
   *
   * The one read here that cannot come back empty. A missing row is the ordinary state of an install
   * whose owner has never opened the settings dialog, so "nothing stored" and "the defaults" are the
   * same answer, and returning it from the backend keeps every caller from having to know that.
   */
  loadSettings(): Promise<AppSettings>;
  /** Write the settings whole — they are edited and saved as one object, never field by field. */
  saveSettings(settings: AppSettings): Promise<void>;
}

export const BACKEND_KINDS = ['sqlite-opfs', 'localstorage'] as const;
export type BackendKind = (typeof BACKEND_KINDS)[number];

/** How many history entries to keep. Old prompts are cheap, but not free, and nobody scrolls past this. */
export const HISTORY_LIMIT = 200;
