import type { PersistenceBackend } from '../db/backend.ts';

/**
 * A backend on which every operation fails.
 *
 * Store tests otherwise run against a real `LocalStorageBackend` over an in-memory store, which is
 * the right default — it exercises the actual persistence semantics rather than a guess at them.
 * But an in-memory store always succeeds, so it can never produce the rejection the stores' error
 * handling exists for. This can, and it can do so for *reads* as well: `createRefusingStorage`
 * reaches the write failures through a real backend, and deliberately leaves reads working.
 *
 * Written out method by method rather than assembled from a proxy or a cast, so adding a method to
 * `PersistenceBackend` without giving it a failure case here is a compile error.
 */
export function createFailingBackend(): PersistenceBackend {
  const fail = (): Promise<never> => Promise.reject(new Error('storage unavailable'));

  return {
    kind: 'localstorage',
    addHistoryLog: fail,
    listHistoryLogs: fail,
    deleteHistoryLog: fail,
    clearHistoryLogs: fail,
    listProjects: fail,
    saveProject: fail,
    deleteProject: fail,
    savePreset: fail,
    listPresets: fail,
    deletePreset: fail,
    saveQuantisePreset: fail,
    listQuantisePresets: fail,
    deleteQuantisePreset: fail,
    replaceLibrary: fail,
    loadSettings: fail,
    saveSettings: fail,
    loadSession: fail,
    saveSession: fail,
  };
}

/**
 * A backend that delegates to `inner`, except that `deleteHistoryLog` waits to be released.
 *
 * This exists to reach an ordering that is otherwise unreachable. Two store actions started
 * together take the same number of microtask turns, so the one started first always finishes
 * first — which means a `deleteLog` holding a *stale* copy of the list still produces the right
 * answer, and a test written without this passes whether the store is correct or not. Holding the
 * delete open lets a concurrent write land in between, which is the moment a stale copy actually
 * destroys something.
 *
 * Delegated method by method for the reason {@link createFailingBackend} is written out: spreading
 * a class instance would silently drop every prototype method, and a new interface method has to
 * be a compile error here rather than an omission.
 */
export function createHeldDeleteBackend(inner: PersistenceBackend): {
  readonly backend: PersistenceBackend;
  releaseDelete(): void;
} {
  let release = (): void => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });

  return {
    backend: {
      kind: inner.kind,
      addHistoryLog: (log) => inner.addHistoryLog(log),
      listHistoryLogs: () => inner.listHistoryLogs(),
      deleteHistoryLog: async (id) => {
        await held;
        await inner.deleteHistoryLog(id);
      },
      clearHistoryLogs: () => inner.clearHistoryLogs(),
      listProjects: () => inner.listProjects(),
      saveProject: (project) => inner.saveProject(project),
      deleteProject: (id) => inner.deleteProject(id),
      savePreset: (preset) => inner.savePreset(preset),
      listPresets: () => inner.listPresets(),
      deletePreset: (id) => inner.deletePreset(id),
      saveQuantisePreset: (preset) => inner.saveQuantisePreset(preset),
      listQuantisePresets: () => inner.listQuantisePresets(),
      deleteQuantisePreset: (id) => inner.deleteQuantisePreset(id),
      replaceLibrary: (pack) => inner.replaceLibrary(pack),
      loadSettings: () => inner.loadSettings(),
      saveSettings: (settings) => inner.saveSettings(settings),
      loadSession: () => inner.loadSession(),
      saveSession: (session) => inner.saveSession(session),
    },
    releaseDelete: () => {
      release();
    },
  };
}
