import type { PersistenceBackend } from '../db/backend.ts';

/**
 * A backend on which every operation fails.
 *
 * Store tests otherwise run against a real `LocalStorageBackend` over an in-memory store, which is
 * the right default — it exercises the actual persistence semantics rather than a guess at them.
 * But that backend is deliberately forgiving: it swallows its own write failures, so it can never
 * produce the rejection the stores' error handling exists for. This can.
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
    clearHistoryLogs: fail,
    savePreset: fail,
    listPresets: fail,
    deletePreset: fail,
    replacePresets: fail,
  };
}
