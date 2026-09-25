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

/**
 * The stores {@link createMemoryStorage} has made, so a backend can tell one from the platform's.
 *
 * A registry rather than a property on the store, because the platform's `localStorage` answers
 * `'kind' in storage` for any key a page has written, and a flag read off it could be forged by the
 * reader's own data. Weak, so a discarded store is not kept alive by being remembered.
 */
const memoryStores = new WeakSet<WebStorageLike>();

/**
 * A `WebStorageLike` backed by a Map — used when the platform offers no storage it can read.
 *
 * Nothing written here survives a reload, which is why {@link isMemoryStorage} exists: a backend on
 * this store must say so rather than report the browser's local storage.
 */
export function createMemoryStorage(): WebStorageLike {
  const entries = new Map<string, string>();
  const storage: WebStorageLike = {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => {
      entries.set(key, value);
    },
  };
  memoryStores.add(storage);
  return storage;
}

/** Whether `storage` is one {@link createMemoryStorage} made, and so lasts only as long as the page. */
export function isMemoryStorage(storage: WebStorageLike): boolean {
  return memoryStores.has(storage);
}

/**
 * The best storage available here.
 *
 * `localStorage` is absent or hostile more often than it looks: it does not exist at all in a
 * plain Node test environment or inside a worker, and in Safari's private mode merely *touching*
 * it can throw. So this probes with a real read rather than trusting a `typeof` check, and
 * degrades to an in-memory store only when it cannot read — data then lasts the session rather than
 * the app breaking on a browser that has already refused twice (no OPFS, no localStorage).
 *
 * **A read, not a write**, which is the whole of the probe's job. A store at its quota refuses every
 * write and still reads, and a write probe answered that store with an empty one in memory: the
 * reader's library stayed in `localStorage`, unread, while the session saved into a Map that went at
 * the next reload. A refused write is already a per-operation rejection — the backend's `write` and
 * `writeHistoryRows` turn it into one, and the stores report it — so it is no reason to stop reading.
 */
export function resolveWebStorage(): WebStorageLike {
  try {
    const candidate = globalThis.localStorage;
    // A property access alone can throw, and a stubbed global may lack the methods entirely.
    if (typeof candidate?.getItem === 'function' && typeof candidate.setItem === 'function') {
      candidate.getItem('__sprite_gubbins_probe__');
      return candidate;
    }
  } catch {
    // Fall through — storage exists but refuses to be read (a disabled store, a hostile host).
  }
  return createMemoryStorage();
}

/**
 * The error a refused write travels as.
 *
 * One spelling, because two callers raise it — the backend's own `write`, and the history writer
 * that bypasses it to retry at shorter lengths — and a message that differed between them would
 * make the same failure look like two. A refusal is ordinary rather than exceptional here: Safari's
 * private mode throws on the write itself, and the roughly 5 MB quota is not far away when a
 * compiled prompt runs to a couple of thousand words.
 *
 * The original error travels as `cause`. Nothing reads it today, since the stores show their own
 * copy, but discarding *why* storage refused is not something to do on the way past.
 */
export function storageRefusal(key: string, cause: unknown): Error {
  return new Error(`Storage refused the write to “${key}”.`, { cause });
}
