import type { PromptHistoryLog } from '../types/history.ts';
import type { PresetArchetype } from '../types/preset.ts';
import type { QuantisePreset } from '../types/quantisePreset.ts';
import type { StudioSession } from '../types/session.ts';
import type { AppSettings } from '../types/settings.ts';
import type { PersistenceBackend } from './backend.ts';
import {
  parseHistoryRow,
  parsePresetRow,
  parseQuantisePresetRow,
  parseSessionRow,
  parseSettingsRow,
} from './rows.ts';
import { isWorkerHandshake, isWorkerReply } from './workerProtocol.ts';
import type { WorkerCall, WorkerRequest } from './workerProtocol.ts';

/**
 * SQLite (WebAssembly) persisted to the Origin Private File System, reached through a worker.
 *
 * The worker is not an optimisation. SQLite's SAH-pool VFS needs
 * `FileSystemFileHandle.prototype.createSyncAccessHandle`, which browsers expose **only inside a
 * worker** — on the main thread the property does not exist, so `installOpfsSAHPoolVfs` throws
 * "Missing required OPFS APIs" no matter how cross-origin-isolated the page is. (The plain OPFS VFS
 * is no help either: it blocks on `Atomics.wait`, which the main thread forbids.) So the database
 * lives in `sqliteWorker.ts` and this class is the half of the bridge the app talks to.
 *
 * Rows come back raw and are validated here by `db/rows.ts` — the same parsers the localStorage
 * fallback uses, so the two backends cannot drift in what they accept.
 *
 * Construction is via {@link openSqliteBackend}, which resolves to `null` rather than throwing when
 * the database cannot be opened, so `database.ts` can fall back.
 */
export class SqliteBackend implements PersistenceBackend {
  readonly kind = 'sqlite-opfs' as const;

  private readonly worker: Worker;

  /** Calls awaiting a reply, by correlation id. Replies can arrive in any order. */
  private readonly pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();

  private nextId = 0;

  constructor(worker: Worker) {
    this.worker = worker;
    this.worker.addEventListener('message', (event: MessageEvent<unknown>) => {
      const reply = event.data;
      if (!isWorkerReply(reply)) return;
      const waiting = this.pending.get(reply.id);
      if (!waiting) return;
      this.pending.delete(reply.id);
      if (reply.ok) waiting.resolve(reply.value);
      else waiting.reject(new Error(reply.error));
    });
  }

  private request(request: WorkerRequest): Promise<unknown> {
    const id = this.nextId++;
    const call: WorkerCall = { id, request };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(call);
    });
  }

  /** A list reply, as rows. Anything that is not an array is treated as no rows rather than trusted. */
  private async requestRows(request: WorkerRequest): Promise<unknown[]> {
    const value = await this.request(request);
    return Array.isArray(value) ? value : [];
  }

  async addHistoryLog(log: PromptHistoryLog): Promise<void> {
    await this.request({ kind: 'addHistoryLog', log });
  }

  async listHistoryLogs(): Promise<PromptHistoryLog[]> {
    const rows = await this.requestRows({ kind: 'listHistoryLogs' });
    return rows.map(parseHistoryRow).filter((log): log is PromptHistoryLog => log !== null);
  }

  async deleteHistoryLog(id: string): Promise<void> {
    await this.request({ kind: 'deleteHistoryLog', logId: id });
  }

  async clearHistoryLogs(): Promise<void> {
    await this.request({ kind: 'clearHistoryLogs' });
  }

  async savePreset(preset: PresetArchetype): Promise<void> {
    await this.request({ kind: 'savePreset', preset });
  }

  async listPresets(): Promise<PresetArchetype[]> {
    const rows = await this.requestRows({ kind: 'listPresets' });
    return rows.map(parsePresetRow).filter((preset): preset is PresetArchetype => preset !== null);
  }

  async deletePreset(id: string): Promise<void> {
    await this.request({ kind: 'deletePreset', presetId: id });
  }

  async replacePresets(presets: readonly PresetArchetype[]): Promise<void> {
    await this.request({ kind: 'replacePresets', presets });
  }

  async saveQuantisePreset(preset: QuantisePreset): Promise<void> {
    await this.request({ kind: 'saveQuantisePreset', preset });
  }

  async listQuantisePresets(): Promise<QuantisePreset[]> {
    const rows = await this.requestRows({ kind: 'listQuantisePresets' });
    return rows.map(parseQuantisePresetRow).filter((preset): preset is QuantisePreset => preset !== null);
  }

  async deleteQuantisePreset(id: string): Promise<void> {
    await this.request({ kind: 'deleteQuantisePreset', presetId: id });
  }

  async loadSettings(): Promise<AppSettings> {
    // No `requestRows` here: this reply is one row or `undefined`, and `parseSettingsRow` reads
    // both as "nothing stored", which is the defaults.
    return parseSettingsRow(await this.request({ kind: 'loadSettings' }));
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.request({ kind: 'saveSettings', settings });
  }

  async loadSession(): Promise<StudioSession | null> {
    // One row or `undefined`, as with the settings — and `parseSessionRow` reads both as "nothing
    // stored", which here is `null` rather than a set of defaults.
    return parseSessionRow(await this.request({ kind: 'loadSession' }));
  }

  async saveSession(session: StudioSession): Promise<void> {
    await this.request({ kind: 'saveSession', session });
  }
}

/**
 * Start the worker and wait for it to report whether it has a database.
 *
 * Resolves to `null` — rather than throwing — for every failure, because none of them is an error
 * the app should surface: OPFS is legitimately unavailable in a private window, in a browser without
 * it, and where the storage quota is exhausted. The answer is always the same, and it is
 * `database.ts`'s to give: use localStorage instead.
 *
 * Cross-origin isolation is **not** on that list, though it once was. The SAH-pool VFS needs a
 * worker rather than `SharedArrayBuffer`, so it succeeds on a first, un-isolated load like any
 * other — which makes the fallback a narrower path than "before the first reload", and one worth
 * exercising deliberately rather than assuming every visitor passes through it.
 */
export function openSqliteBackend(): Promise<SqliteBackend | null> {
  let worker: Worker;
  try {
    worker = new Worker(new URL('./sqliteWorker.ts', import.meta.url), { type: 'module' });
  } catch {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const settle = (backend: SqliteBackend | null) => {
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      if (backend === null) worker.terminate();
      resolve(backend);
    };

    function onMessage(event: MessageEvent<unknown>) {
      if (!isWorkerHandshake(event.data)) return;
      settle(event.data.ready ? new SqliteBackend(worker) : null);
    }

    function onError() {
      settle(null);
    }

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
  });
}
