import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';

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
  /** Which implementation this is. Surfaced in the UI so a user can tell where their data went. */
  readonly kind: BackendKind;

  addHistoryLog(log: PromptHistoryLog): Promise<void>;
  listHistoryLogs(): Promise<PromptHistoryLog[]>;
  clearHistoryLogs(): Promise<void>;

  savePreset(preset: PresetArchetype): Promise<void>;
  listPresets(): Promise<PresetArchetype[]>;
  deletePreset(id: string): Promise<void>;
  /** Replace the whole custom-preset collection — what importing a preset pack does. */
  replacePresets(presets: readonly PresetArchetype[]): Promise<void>;
}

export const BACKEND_KINDS = ['sqlite-opfs', 'localstorage'] as const;
export type BackendKind = (typeof BACKEND_KINDS)[number];

/** How many history entries to keep. Old prompts are cheap, but not free, and nobody scrolls past this. */
export const HISTORY_LIMIT = 200;
