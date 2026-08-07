/**
 * The slice of the Web Storage API the fallback backend actually uses.
 *
 * Narrower than `Storage` on purpose: the backend rewrites each collection whole, so it never
 * needs `length`, `key()`, `removeItem()` or indexed access. A small interface is also what
 * makes the backend injectable, and therefore testable without a browser.
 */
export interface WebStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** A `WebStorageLike` backed by a Map — used when the platform offers no usable storage. */
export function createMemoryStorage(): WebStorageLike {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
}

/**
 * The best storage available here.
 *
 * `localStorage` is absent or hostile more often than it looks: it does not exist at all in a
 * plain Node test environment or inside a worker, and in Safari's private mode merely *touching*
 * it can throw. So this probes with a real write rather than trusting a `typeof` check, and
 * degrades to an in-memory store — data then lasts the session rather than the app breaking on
 * a browser that has already refused twice (no OPFS, no localStorage).
 */
export function resolveWebStorage(): WebStorageLike {
  try {
    const candidate = globalThis.localStorage;
    // A property access alone can throw, and a stubbed global may lack the methods entirely.
    if (typeof candidate?.getItem === 'function' && typeof candidate.setItem === 'function') {
      const probe = '__sprite_gubbins_probe__';
      candidate.setItem(probe, probe);
      candidate.removeItem(probe);
      return candidate;
    }
  } catch {
    // Fall through — storage exists but refuses writes (private mode, exhausted quota).
  }
  return createMemoryStorage();
}
