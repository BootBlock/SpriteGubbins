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

/** Said where the thread stopped answering, which is terminal for this backend and so for the app. */
const THREAD_DIED = 'The database thread stopped answering';

/** Said where a reply was sent but would not deserialise, so nobody can tell what it answered. */
const REPLY_UNREADABLE = 'A database reply could not be read back from its thread';

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
 *
 * **Every call settles, by whichever of five routes it takes**: the worker's answer, the worker's
 * refusal, a reply that would not deserialise, the thread dying, and a call made after it died. The
 * middle two are what the listeners below are for, and neither can be reported as a reply — one
 * carries no correlation id and the other arrives with the thread already gone. A call left
 * unsettled is invisible rather than loud, which is the failure {@link SqliteBackend.die} describes
 * at length. {@link openSqliteBackend} owes the same of the handshake, and says so there.
 */
export class SqliteBackend implements PersistenceBackend {
  readonly kind = 'sqlite-opfs' as const;

  private readonly worker: Worker;

  /** Calls awaiting a reply, by correlation id. Replies can arrive in any order. */
  private readonly pending = new Map<number, { resolve(value: unknown): void; reject(error: Error): void }>();

  private nextId = 0;

  /** Set once the thread has died. Every later call is refused rather than posted into the void. */
  private lost = false;

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
    // Fires where an exception escaped the worker's own listener, or the module stopped evaluating —
    // an out-of-memory in the WebAssembly heap on a large `replacePresets` is the realistic one. The
    // worker answers every call it takes, so nothing that reaches here can be reported as a reply,
    // and the database's state after it is unknowable from this side.
    this.worker.addEventListener('error', () => {
      this.die();
    });
    // And where a reply was sent but would not deserialise on arrival. No `message` follows one of
    // these and it carries no correlation id, so every call in flight is one whose answer may never
    // come — but the thread is still there and still holds an open database, so it is not given up.
    this.worker.addEventListener('messageerror', () => {
      this.settleOutstanding(new Error(REPLY_UNREADABLE));
    });
  }

  /**
   * Give up on the thread: settle everything waiting, end it, and refuse everything after.
   *
   * The refusal is the half that is easy to leave out and the half that matters most. Every caller
   * `await`s {@link request} — but a promise that never settles reaches neither the `catch` around
   * that `await` nor the `finally` beside it, so `usePresetStore` holds `isExporting` true and
   * freezes its transfer controls behind a spinner nothing stops, and `useHistoryStore.addLog`
   * records nothing and says nothing. A rejection is what turns both back into the failures they
   * were written to report. `useSessionStore` is unaffected either way, and deliberately: its write
   * catches in silence and re-arms on the next change, so it neither reports this nor stops saving.
   *
   * There is no reconnection, deliberately: `getDatabase` memoises the promise it resolved on boot,
   * so the app has one backend for the session and swapping it underneath the stores that already
   * hold data from it would be a second source of truth, not a repair.
   */
  private die(): void {
    if (this.lost) return;
    this.lost = true;
    this.worker.terminate();
    this.settleOutstanding(new Error(THREAD_DIED));
  }

  /** Reject every call in flight. Separate from {@link die} because one cause does not end the thread. */
  private settleOutstanding(error: Error): void {
    const waiting = [...this.pending.values()];
    this.pending.clear();
    for (const call of waiting) call.reject(error);
  }

  private request(request: WorkerRequest): Promise<unknown> {
    if (this.lost) return Promise.reject(new Error(THREAD_DIED));
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

  async replaceQuantisePresets(presets: readonly QuantisePreset[]): Promise<void> {
    await this.request({ kind: 'replaceQuantisePresets', presets });
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
      worker.removeEventListener('error', onFailure);
      worker.removeEventListener('messageerror', onFailure);
      if (backend === null) worker.terminate();
      resolve(backend);
    };

    function onMessage(event: MessageEvent<unknown>) {
      if (!isWorkerHandshake(event.data)) return;
      settle(event.data.ready ? new SqliteBackend(worker) : null);
    }

    // Both non-replies settle to `null`, which is the answer every other failure here gets: use
    // localStorage instead. `messageerror` matters more than its likelihood suggests — `getDatabase`
    // memoises *this* promise, so one left unsettled hangs every store's hydration for the session,
    // and never reaches the fallback this whole function exists to make possible.
    function onFailure() {
      settle(null);
    }

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onFailure);
    worker.addEventListener('messageerror', onFailure);
  });
}
