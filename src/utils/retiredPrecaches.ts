/**
 * A superseded build's precache, kept while a window that may have booted from it is still open.
 *
 * A new build starts only when a reader asks for it in one tab (issue #369), so the other tabs go
 * on running the build they booted with, under the new worker. Their code still asks for that
 * build's chunks, which the host no longer serves — a view opened for the first time, a worker
 * started. So the service worker keeps each superseded precache, and answers from it what the
 * current one lacks, until every window that was open when it was superseded has gone.
 *
 * `clients` are the ids of those windows. It is a superset of the windows really running that build
 * — some ran an older one still — so a cache is kept a little longer than it has to be, and never
 * deleted while its own build is still running.
 */
export interface RetiredPrecache {
  readonly cache: string;
  readonly clients: readonly string[];
}

/**
 * The ledger once `current` has taken over: every other precache in `precaches` that the ledger
 * does not already hold, retired against the windows open now.
 *
 * A retired cache is dropped from the ledger, not deleted, when it is `current` again — a build
 * whose manifest matches one retired earlier has the same fingerprint, so the same cache name.
 */
export function retirePrecaches(
  ledger: readonly RetiredPrecache[],
  precaches: readonly string[],
  current: string,
  openWindows: readonly string[],
): RetiredPrecache[] {
  const kept = ledger.filter((entry) => entry.cache !== current);
  const known = new Set(kept.map((entry) => entry.cache));
  const retiring = precaches.filter((cache) => cache !== current && !known.has(cache));
  return [...kept, ...retiring.map((cache) => ({ cache, clients: [...openWindows] }))];
}

/** Split the ledger into what a window still open may need, and what no open window can. */
export function partitionRetired(
  ledger: readonly RetiredPrecache[],
  openWindows: ReadonlySet<string>,
): { readonly keep: readonly RetiredPrecache[]; readonly discard: readonly RetiredPrecache[] } {
  const inUse = (entry: RetiredPrecache) => entry.clients.some((id) => openWindows.has(id));
  return { keep: ledger.filter(inUse), discard: ledger.filter((entry) => !inUse(entry)) };
}

/**
 * Read a stored ledger back, or an empty one when what is stored is not a ledger.
 *
 * An empty ledger forgets caches rather than deleting them, and the worker looks for a missing chunk
 * in every precache of the app's, not only those the ledger names. So a corrupt ledger costs storage
 * until the next build takes over and retires the forgotten caches again, never a chunk a running
 * tab needs.
 */
export function parseRetiredPrecaches(value: unknown): RetiredPrecache[] {
  if (!Array.isArray(value)) return [];
  return value.every(isRetiredPrecache) ? value : [];
}

function isRetiredPrecache(value: unknown): value is RetiredPrecache {
  return (
    typeof value === 'object' &&
    value !== null &&
    'cache' in value &&
    typeof value.cache === 'string' &&
    'clients' in value &&
    Array.isArray(value.clients) &&
    value.clients.every((id: unknown) => typeof id === 'string')
  );
}
