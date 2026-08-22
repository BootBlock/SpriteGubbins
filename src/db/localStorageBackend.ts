import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import type { StudioSession } from '../types/session.ts';
import type { AppSettings } from '../types/settings.ts';
import { HISTORY_LIMIT, type PersistenceBackend } from './backend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { parseHistoryRow, parseImportedPreset, parseQuantisePresetRow } from './rows.ts';
import { parseJson } from './readers.ts';
import { HISTORY_STORAGE_BUDGET, evictionLengths, trimHistoryToBudget } from './historyEviction.ts';
import { parseSession } from './sessionParser.ts';
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
 * Storage is read and rewritten whole on every operation, which keeps the fallback simple enough
 * to be obviously correct.
 *
 * The prompt history is the one collection that does not fit at the size the rest of the app
 * assumes. `HISTORY_LIMIT` is a count and the quota is a size, and a couple of hundred compiled
 * prompts is several times what a browser will store — so history is written through
 * {@link writeHistory}, which trims it to a budget and evicts oldest-first when storage refuses it
 * anyway. See `historyEviction.ts` for why the count alone wedged the store.
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
      return Promise.reject(LocalStorageBackend.refusal(key, error));
    }
  }

  /** One spelling of the refusal, so {@link write} and {@link writeHistory} cannot drift. */
  private static refusal(key: string, cause: unknown): Error {
    return new Error(`Storage refused the write to “${key}”.`, { cause });
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

  /**
   * Store the history, keeping as much of it as the browser will actually take.
   *
   * `rows` is newest-first, so every prefix of it is the newest *n* prompts and evicting is a
   * matter of shortening it. The budget decides the first attempt; a refusal past that is storage
   * telling us the budget was optimistic here, and the answer is to try again with fewer entries
   * rather than to lose the prompt the reader just asked for.
   *
   * Nothing is written until an attempt succeeds, so a history too large to store at any length
   * leaves what was already there untouched and rejects — the reader keeps the prompts they had.
   */
  private writeHistory(rows: readonly Record<string, unknown>[]): Promise<void> {
    const affordable = trimHistoryToBudget(rows);
    if (affordable.length === 0) {
      return Promise.reject(
        new Error(
          `A single prompt exceeds the ${HISTORY_STORAGE_BUDGET}-character budget the history may occupy.`,
        ),
      );
    }

    let refusal: unknown;
    for (const length of evictionLengths(affordable.length)) {
      try {
        this.storage.setItem(STORAGE_KEYS.promptHistory, JSON.stringify(affordable.slice(0, length)));
        return Promise.resolve();
      } catch (error) {
        refusal = error;
      }
    }

    return Promise.reject(LocalStorageBackend.refusal(STORAGE_KEYS.promptHistory, refusal));
  }

  addHistoryLog(log: PromptHistoryLog): Promise<void> {
    const existing = this.read(STORAGE_KEYS.promptHistory, parseHistoryRow);
    const next = [log, ...existing.filter((entry) => entry.id !== log.id)].slice(0, HISTORY_LIMIT);
    return this.writeHistory(next.map(LocalStorageBackend.toRow));
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

  /*
   * The quantiser's presets are stored in the same `snake_case` row shape the SQLite table uses, as
   * the history rows are, so `parseQuantisePresetRow` serves both backends and the two can never
   * drift in what they accept.
   *
   * **No `updated_at`, and that is a real difference between the backends rather than an omission.**
   * The column exists on the other side because SQLite orders the collection with it; here the
   * order *is* the array's, kept newest-first by the prepend below, so a timestamp would be a
   * number nothing reads. Writing one anyway would be worse than useless: this backend rewrites the
   * whole collection on every operation, so each write — a delete included — would stamp every row
   * with the same instant, destroying exactly the per-entry time the field appears to promise.
   */
  private static toQuantiseRow(preset: QuantisePreset): Record<string, unknown> {
    return {
      id: preset.id,
      name: preset.name,
      description: preset.description,
      dials_json: JSON.stringify(preset.dials),
    };
  }

  saveQuantisePreset(preset: QuantisePreset): Promise<void> {
    const existing = this.read(STORAGE_KEYS.quantisePresets, parseQuantisePresetRow);
    const next = [preset, ...existing.filter((entry) => entry.id !== preset.id)];
    return this.write(STORAGE_KEYS.quantisePresets, next.map(LocalStorageBackend.toQuantiseRow));
  }

  /** In stored order, which the prepend above keeps newest-first — see {@link toQuantiseRow}. */
  listQuantisePresets(): Promise<QuantisePreset[]> {
    return Promise.resolve(this.read(STORAGE_KEYS.quantisePresets, parseQuantisePresetRow));
  }

  deleteQuantisePreset(id: string): Promise<void> {
    const existing = this.read(STORAGE_KEYS.quantisePresets, parseQuantisePresetRow);
    return this.write(
      STORAGE_KEYS.quantisePresets,
      existing.filter((entry) => entry.id !== id).map(LocalStorageBackend.toQuantiseRow),
    );
  }

  /**
   * In the file's own order, which is the whole of what a pack says about order — see the
   * `replaceQuantisePresets` case in `sqliteWorker.ts`, which reaches the same answer by stamping
   * every imported row with one instant.
   */
  replaceQuantisePresets(presets: readonly QuantisePreset[]): Promise<void> {
    return this.write(STORAGE_KEYS.quantisePresets, presets.map(LocalStorageBackend.toQuantiseRow));
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

  /**
   * The session, stored as the object itself.
   *
   * Nested rather than flattened into the SQLite row's three columns, exactly as the settings are:
   * `parseSession` is the shared parser and takes the nested form, and the SQLite side unwraps its
   * two JSON columns into that shape before handing it over. So the two backends are held to one
   * definition of what a stored session may look like.
   *
   * Unreadable storage yields `null`, which is the same answer as never having stored one. Both mean
   * the studio keeps the state it booted with, and neither is worth a toast.
   */
  loadSession(): Promise<StudioSession | null> {
    try {
      const stored = this.storage.getItem(STORAGE_KEYS.studioSession);
      return Promise.resolve(stored === null ? null : parseSession(parseJson(stored)));
    } catch {
      return Promise.resolve(null);
    }
  }

  saveSession(session: StudioSession): Promise<void> {
    return this.write(STORAGE_KEYS.studioSession, session);
  }
}
