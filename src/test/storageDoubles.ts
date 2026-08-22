import type { WebStorageLike } from '../db/webStorage.ts';

/**
 * Storage that refuses every write, the way a real one does under an exhausted quota or in
 * Safari's private mode — where `setItem` throws rather than returning anything to check.
 *
 * `createMemoryStorage` cannot stand in for this: it always succeeds, so it can never produce the
 * refusal the backend's rejection path and the stores' toasts exist for. Reads still work, because
 * the failure being modelled is a refused *write* — a store that could not read either would pass
 * these tests for the wrong reason.
 */
export function createRefusingStorage(): WebStorageLike {
  return {
    getItem: () => null,
    setItem: () => {
      // A `DOMException`, not an `Error`: that is what a browser actually throws here, and the
      // backend has to survive a rejection reason that is neither.
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    },
  };
}

/**
 * Storage that accepts writes until the total it holds would pass `ceiling` characters, and throws
 * a `QuotaExceededError` past that — which is what a real store does, and what
 * {@link createRefusingStorage} cannot model because it refuses the first write too.
 *
 * The ceiling counts every key, as a browser's quota does: a history that fills the store is
 * exactly the condition that leaves the settings with nowhere to go.
 */
export function createBoundedStorage(ceiling: number): WebStorageLike {
  const entries = new Map<string, string>();

  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      let used = 0;
      for (const [storedKey, storedValue] of entries) {
        if (storedKey === key) continue;
        used += storedKey.length + storedValue.length;
      }
      if (used + key.length + value.length > ceiling) {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      }
      entries.set(key, value);
    },
  };
}
