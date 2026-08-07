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
