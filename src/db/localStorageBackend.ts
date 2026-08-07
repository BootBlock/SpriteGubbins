import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import { HISTORY_LIMIT, type PersistenceBackend } from './backend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { parseHistoryRow, parseImportedPreset } from './rows.ts';
import { parseJson } from './readers.ts';
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

  /** Write one collection back. Returns false when storage refused it (quota, private mode). */
  private write(key: string, value: unknown): boolean {
    try {
      this.storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
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
    this.write(STORAGE_KEYS.promptHistory, next.map(LocalStorageBackend.toRow));
    return Promise.resolve();
  }

  listHistoryLogs(): Promise<PromptHistoryLog[]> {
    const logs = this.read(STORAGE_KEYS.promptHistory, parseHistoryRow);
    return Promise.resolve([...logs].sort((a, b) => b.createdAt - a.createdAt));
  }

  clearHistoryLogs(): Promise<void> {
    this.write(STORAGE_KEYS.promptHistory, []);
    return Promise.resolve();
  }

  savePreset(preset: PresetArchetype): Promise<void> {
    const existing = this.read(STORAGE_KEYS.customPresets, parseImportedPreset);
    const next = [...existing.filter((entry) => entry.id !== preset.id), preset];
    this.write(STORAGE_KEYS.customPresets, next);
    return Promise.resolve();
  }

  listPresets(): Promise<PresetArchetype[]> {
    return Promise.resolve(this.read(STORAGE_KEYS.customPresets, parseImportedPreset));
  }

  deletePreset(id: string): Promise<void> {
    const existing = this.read(STORAGE_KEYS.customPresets, parseImportedPreset);
    this.write(
      STORAGE_KEYS.customPresets,
      existing.filter((entry) => entry.id !== id),
    );
    return Promise.resolve();
  }

  replacePresets(presets: readonly PresetArchetype[]): Promise<void> {
    this.write(STORAGE_KEYS.customPresets, [...presets]);
    return Promise.resolve();
  }
}
