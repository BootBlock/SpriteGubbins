import type { PromptHistoryLog } from '../types/history.ts';
import type { LibraryPack } from '../types/libraryPack.ts';
import type { CustomArchetype } from '../types/preset.ts';
import type { Project } from '../types/project.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import type { StudioSession } from '../types/session.ts';
import type { AppSettings } from '../types/settings.ts';
import { HISTORY_LIMIT, type PersistenceBackend } from './backend.ts';
import { STORAGE_KEYS } from './schema.ts';
import { parseHistoryRow, parsePresetRow, parseProjectRow, parseQuantisePresetRow } from './rows.ts';
import { toHistoryRow, toPresetRow, toProjectRow, toQuantisePresetRow } from './localStorageRows.ts';
import { deleteProjectFrom, replaceLibraryIn, type CollectionPort } from './localStorageLibrary.ts';
import { parseJson } from './readers.ts';
import { writeHistoryRows } from './historyEviction.ts';
import { parseSession } from './sessionParser.ts';
import { parseSettings } from './settingsParser.ts';
import { resolveWebStorage, storageRefusal, type WebStorageLike } from './webStorage.ts';

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
 * `writeHistoryRows`, which trims it to a budget and evicts oldest-first when storage refuses it
 * anyway. See `historyEviction.ts`, which holds that write beside the two functions deciding its
 * shape, and says why the count alone wedged the store.
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
      return Promise.reject(storageRefusal(key, error));
    }
  }

  /**
   * This instance's reader and writer, as the port the multi-collection operations take.
   *
   * Bound methods rather than the store itself, so those two go on reading through the same
   * parsers, the same quota handling and the same refusal as every method here — which is what
   * keeps "the fallback rewrites the whole collection" one behaviour rather than two.
   */
  private port(): CollectionPort {
    return {
      read: (key, parse) => this.read(key, parse),
      write: (key, value) => this.write(key, value),
    };
  }

  addHistoryLog(log: PromptHistoryLog): Promise<void> {
    const existing = this.read(STORAGE_KEYS.promptHistory, parseHistoryRow);
    const next = [log, ...existing.filter((entry) => entry.id !== log.id)].slice(0, HISTORY_LIMIT);
    return writeHistoryRows(this.storage, next.map(toHistoryRow));
  }

  listHistoryLogs(): Promise<PromptHistoryLog[]> {
    const logs = this.read(STORAGE_KEYS.promptHistory, parseHistoryRow);
    return Promise.resolve([...logs].sort((a, b) => b.createdAt - a.createdAt));
  }

  deleteHistoryLog(id: string): Promise<void> {
    return this.removeById(STORAGE_KEYS.promptHistory, parseHistoryRow, toHistoryRow, id);
  }

  clearHistoryLogs(): Promise<void> {
    return this.write(STORAGE_KEYS.promptHistory, []);
  }

  /**
   * Write one entry to the front of a collection, replacing whatever stood under its id.
   *
   * The fallback's whole answer to `INSERT OR REPLACE … ORDER BY updated_at DESC`, and it is one
   * method rather than three because the three collections keyed by id want exactly the same
   * behaviour: the prepend is what keeps them newest-first, since a stored order is all this
   * backend has — see `localStorageRows.ts`, which says why no timestamp is written here.
   */
  private upsert<T extends { readonly id: string }>(
    key: string,
    parse: (value: unknown) => T | null,
    toRow: (entry: T) => Record<string, unknown>,
    entry: T,
  ): Promise<void> {
    const existing = this.read(key, parse);
    return this.write(key, [entry, ...existing.filter((held) => held.id !== entry.id)].map(toRow));
  }

  /** Remove one entry by id. An id nothing holds rewrites the collection unchanged, as SQL does. */
  private removeById<T extends { readonly id: string }>(
    key: string,
    parse: (value: unknown) => T | null,
    toRow: (entry: T) => Record<string, unknown>,
    id: string,
  ): Promise<void> {
    return this.write(
      key,
      this.read(key, parse)
        .filter((entry) => entry.id !== id)
        .map(toRow),
    );
  }

  /** In stored order, which {@link upsert}'s prepend keeps most-recently-edited first. */
  listProjects(): Promise<Project[]> {
    return Promise.resolve(this.read(STORAGE_KEYS.projects, parseProjectRow));
  }

  saveProject(project: Project): Promise<void> {
    return this.upsert(STORAGE_KEYS.projects, parseProjectRow, toProjectRow, project);
  }

  /**
   * Remove the project and everything filed under it.
   *
   * The work is `localStorageLibrary.ts`'s, along with the ordering that is the whole of what this
   * backend can promise without a transaction. What stays here is the port: the private reader and
   * writer above, bound to this instance's store.
   */
  deleteProject(id: string): Promise<void> {
    return deleteProjectFrom(this.port(), id);
  }

  savePreset(preset: CustomArchetype): Promise<void> {
    return this.upsert(STORAGE_KEYS.customPresets, parsePresetRow, toPresetRow, preset);
  }

  /** In stored order, which {@link upsert}'s prepend keeps newest-first. */
  listPresets(): Promise<CustomArchetype[]> {
    return Promise.resolve(this.read(STORAGE_KEYS.customPresets, parsePresetRow));
  }

  deletePreset(id: string): Promise<void> {
    return this.removeById(STORAGE_KEYS.customPresets, parsePresetRow, toPresetRow, id);
  }

  saveQuantisePreset(preset: QuantisePreset): Promise<void> {
    return this.upsert(STORAGE_KEYS.quantisePresets, parseQuantisePresetRow, toQuantisePresetRow, preset);
  }

  /** In stored order, which {@link upsert}'s prepend keeps newest-first. */
  listQuantisePresets(): Promise<QuantisePreset[]> {
    return Promise.resolve(this.read(STORAGE_KEYS.quantisePresets, parseQuantisePresetRow));
  }

  deleteQuantisePreset(id: string): Promise<void> {
    return this.removeById(STORAGE_KEYS.quantisePresets, parseQuantisePresetRow, toQuantisePresetRow, id);
  }

  /**
   * Replace all three collections with an imported pack's.
   *
   * `localStorageLibrary.ts` again, for the reason the delete above gives, and it is the operation
   * whose promise is the more carefully hedged of the two — read it there rather than assuming a
   * transaction.
   */
  replaceLibrary(pack: LibraryPack): Promise<void> {
    return replaceLibraryIn(this.port(), pack);
  }

  /**
   * The settings, stored as the object itself rather than as a row.
   *
   * All three collections above keep the SQLite table's `snake_case` shape so one parser can read
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
