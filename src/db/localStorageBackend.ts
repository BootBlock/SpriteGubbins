import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import type { AppSettings } from '../types/settings.ts';
import { HISTORY_LIMIT, type PersistenceBackend } from './backend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { parseHistoryRow, parseImportedPreset } from './rows.ts';
import { parseJson } from './readers.ts';
import { parseSettings } from './settingsParser.ts';
import { resolveWebStorage, type WebStorageLike } from './webStorage.ts';

/**
 * The fallback used when SQLite/OPFS is unavailable — a private browsing session, a browser
 * without OPFS, an exhausted quota.
 *
 * This is a **specified behaviour, not a safety net**: those conditions are ordinary, and this is
 * the backend the app genuinely runs on whenever one of them holds. It must work, and it must be
 * tested.
 *
 * Storage is read and rewritten whole on every operation. That is fine at this scale — a couple
 * of hundred prompts — and it keeps the fallback simple enough to be obviously correct.
 */
export class LocalStorageBackend implements PersistenceBackend {
  readonly kind = 'localstorage' as const;

  private readonly storage: WebStorageLike;

  /**
   * Takes its storage rather than reaching for the global, so tests can drive it without a
   * browser and so the "no usable storage anywhere" case is handled in one place
   * ({@link resolveWebStorage}) instead of being scattered through the methods below.
   */
  constructor(storage: WebStorageLike = resolveWebStorage()) {
    this.storage = storage;
  }

  /**
   * Read and parse one collection. Anything unreadable — quota errors, a disabled store,
   * hand-edited nonsense — yields an empty list rather than throwing: losing history is
   * regrettable, but taking the app down with it is worse.
   */
  private read<T>(key: string, parse: (value: unknown) => T | null): T[] {
    try {
      const stored = this.storage.getItem(key);
      if (stored === null) return [];
      const parsed = parseJson(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(parse).filter((item): item is T => item !== null);
    } catch {
      return [];
    }
  }

  /**
   * Write one collection back, rejecting when storage refused it.
   *
   * A refusal is ordinary here — Safari's private mode throws on the write itself, and the roughly
   * 5 MB quota is not far away when a compiled prompt runs to a couple of thousand words. The
   * refusal has to travel: the stores above already catch a failed write and raise a toast, so
   * swallowing it here made their error paths unreachable on this backend and left the user looking
   * at an entry that was on screen and never in storage.
   *
   * Rejects rather than throwing synchronously, because the interface promises a `Promise` and a
   * caller attaching `.catch()` to one is entitled to have it run. The original error travels as
   * `cause` — nothing reads it today, since the stores show their own copy, but discarding *why*
   * storage refused is not something to do on the way past.
   */
  private write(key: string, value: unknown): Promise<void> {
    try {
      this.storage.setItem(key, JSON.stringify(value));
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(new Error(`Storage refused the write to "${key}".`, { cause: error }));
    }
  }

  /*
   * History rows are stored in the same snake_case shape the SQLite table uses, so
   * `parseHistoryRow` serves both backends and the two can never drift.
   */
  private static toRow(log: PromptHistoryLog): Record<string, unknown> {
    return {
      id: log.id,
      category: log.category,
      prompt_text: log.promptText,
      created_at: log.createdAt,
      word_count: log.wordCount,
      model_used: log.modelUsed,
      // Serialised, not nested, so the shape matches the SQLite columns exactly and one parser
      // reads both.
      subject_json: JSON.stringify(log.subject),
      output_json: JSON.stringify(log.output),
    };
  }

  addHistoryLog(log: PromptHistoryLog): Promise<void> {
    const existing = this.read(STORAGE_KEYS.promptHistory, parseHistoryRow);
    const next = [log, ...existing.filter((entry) => entry.id !== log.id)].slice(0, HISTORY_LIMIT);
    return this.write(STORAGE_KEYS.promptHistory, next.map(LocalStorageBackend.toRow));
  }

  listHistoryLogs(): Promise<PromptHistoryLog[]> {
    const logs = this.read(STORAGE_KEYS.promptHistory, parseHistoryRow);
    return Promise.resolve([...logs].sort((a, b) => b.createdAt - a.createdAt));
  }

  deleteHistoryLog(id: string): Promise<void> {
    const existing = this.read(STORAGE_KEYS.promptHistory, parseHistoryRow);
    return this.write(
      STORAGE_KEYS.promptHistory,
      existing.filter((entry) => entry.id !== id).map(LocalStorageBackend.toRow),
    );
  }

  clearHistoryLogs(): Promise<void> {
    return this.write(STORAGE_KEYS.promptHistory, []);
  }

  savePreset(preset: PresetArchetype): Promise<void> {
    const existing = this.read(STORAGE_KEYS.customPresets, parseImportedPreset);
    const next = [...existing.filter((entry) => entry.id !== preset.id), preset];
    return this.write(STORAGE_KEYS.customPresets, next);
  }

  listPresets(): Promise<PresetArchetype[]> {
    return Promise.resolve(this.read(STORAGE_KEYS.customPresets, parseImportedPreset));
  }

  deletePreset(id: string): Promise<void> {
    const existing = this.read(STORAGE_KEYS.customPresets, parseImportedPreset);
    return this.write(
      STORAGE_KEYS.customPresets,
      existing.filter((entry) => entry.id !== id),
    );
  }

  replacePresets(presets: readonly PresetArchetype[]): Promise<void> {
    return this.write(STORAGE_KEYS.customPresets, [...presets]);
  }

  /**
   * The settings, stored as the object itself rather than as a row.
   *
   * The two collections above keep the SQLite table's `snake_case` shape so one parser can read
   * both backends; there is nothing to align here, because the SQLite side stores this same object
   * serialised into a single column. `parseSettings` is that shared parser — the SQLite backend
   * unwraps its row and hands the payload to it, and this hands over what it read.
   *
   * Unreadable storage yields the defaults rather than throwing, exactly as {@link read} does for the
   * collections: an install with no settings and one whose settings cannot be parsed both mean "the
   * app as it ships".
   */
  loadSettings(): Promise<AppSettings> {
    try {
      const stored = this.storage.getItem(STORAGE_KEYS.appSettings);
      return Promise.resolve(parseSettings(stored === null ? undefined : parseJson(stored)));
    } catch {
      return Promise.resolve(parseSettings(undefined));
    }
  }

  saveSettings(settings: AppSettings): Promise<void> {
    return this.write(STORAGE_KEYS.appSettings, settings);
  }
}
