/// <reference lib="webworker" />
/**
 * Sprite Gubbins service worker — vite-plugin-pwa (injectManifest strategy).
 *
 * One worker, two responsibilities:
 *   1. Offline-first precaching of the app shell.
 *   2. Injecting the cross-origin isolation headers onto the responses **this origin** serves, so
 *      the page is isolated on a static host that cannot set response headers — GitHub Pages being
 *      the one this app deploys to. This replaces a standalone coi-serviceworker, which would
 *      otherwise fight this worker for control of the scope. The same-origin gate and the reason
 *      it is not optional are in `src/utils/isolationHeaders.ts`.
 *
 * `injectManifest` rather than `generateSW` for exactly that second point: header injection
 * needs custom fetch logic, which the generated worker cannot express.
 *
 * The very first visit is *not* isolated — no worker controls the page yet — so
 * `public/coi-bootstrap.js` reloads once after this worker takes control. **The database is not
 * waiting on that.** SQLite's SAH-pool VFS needs a dedicated worker, not `SharedArrayBuffer`, so
 * it is available from the first load; see the isolation headers' note in `vite.config.ts`.
 */

import { withIsolationHeaders } from './utils/isolationHeaders.ts';
import { parseRetiredPrecaches, partitionRetired, retirePrecaches } from './utils/retiredPrecaches.ts';
import type { RetiredPrecache } from './utils/retiredPrecaches.ts';
import { isSkipWaitingMessage } from './workers/serviceWorkerProtocol.ts';

const sw = self as unknown as ServiceWorkerGlobalScope;

/** One entry of the precache manifest vite-plugin-pwa injects at build time. */
interface PrecacheEntry {
  readonly url: string;
  readonly revision: string | null;
}

/**
 * `self.__WB_MANIFEST` is the injection point vite-plugin-pwa replaces at build time; the cast
 * erases to exactly that token in the emitted worker.
 *
 * De-duplicated by URL: the injected manifest can list the same asset twice (the PWA-manifest
 * icons are emitted both by the precache glob and the webmanifest `icons` injection), and
 * `cache.addAll` **rejects** on duplicate requests — which would abort `install`, leave the
 * worker redundant, and mean no update could ever activate.
 */
const PRECACHE_ENTRIES: readonly PrecacheEntry[] = [
  ...new Map(
    (self as unknown as { __WB_MANIFEST: PrecacheEntry[] }).__WB_MANIFEST.map((entry) => [entry.url, entry]),
  ).values(),
];

/**
 * A cache named after the exact manifest it holds, so each build gets its own.
 *
 * A build that installs while another is still active writes somewhere new, and the running app
 * keeps being served the shell and chunks it booted with until `activate` swaps over. A single
 * shared cache name would let a half-installed update overwrite the live shell's entries and
 * serve the user a mix of two builds.
 *
 * FNV-1a over the manifest — short, dependency-free, and it changes whenever any asset does.
 */
function fingerprint(entries: readonly PrecacheEntry[]): string {
  let hash = 0x811c9dc5;
  for (const { url, revision } of entries) {
    for (const char of `${url}:${revision ?? ''}`) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash.toString(16).padStart(8, '0');
}

/**
 * What every cache this app creates is named with, and so the only caches it may delete.
 *
 * Cache Storage belongs to the **origin**, not to this worker's scope, and the app deploys as a
 * GitHub Pages project site: `bootblock.github.io` is shared with every other project site on the
 * account, PWAs among them. A cache without this prefix is another app's, and deleting it would
 * erase that app's offline shell.
 */
const CACHE_PREFIX = 'sprite-gubbins-precache-';
const CACHE = `${CACHE_PREFIX}${fingerprint(PRECACHE_ENTRIES)}`;
const INDEX_URL = 'index.html';

/** Where the ledger of superseded precaches is kept: see `src/utils/retiredPrecaches.ts`. */
const LEDGER_CACHE = 'sprite-gubbins-retired-precaches';
const LEDGER_URL = new URL('retired-precaches.json', sw.location.href).href;

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await precache();
    })(),
  );
});

/** Fill this build's cache with every manifest entry, or write nothing: `addAll` is atomic. */
async function precache(): Promise<void> {
  const cache = await caches.open(CACHE);
  // Resolved against this worker's own URL so every entry tracks the `/SpriteGubbins/`
  // base path.
  //
  // `revision: null` is Workbox's marker for a URL that **already carries a content hash** —
  // such an entry needs no separate revision, because a changed file arrives under a changed
  // name. Those are immutable, so the HTTP cache may answer for them (`'default'`) — **every
  // entry but the seven** that come from *stable* URLs and carry an MD5 `revision`:
  // `index.html`, `404.html`, `coi-bootstrap.js`, `favicon.ico`, the icons and the
  // webmanifest. Stated as that relationship rather than as a pair of counts, which is what
  // stood here and which the build had left behind within four days (issue #267): the hashed
  // total is a function of how rolldown splits the bundle, so it moves on most changes, while
  // the seven are named above and do not. GitHub Pages sends `Cache-Control:
  // max-age=600` on all of them, so an entry answered from the HTTP cache within ten minutes
  // of a deploy precaches the **previous** build's shell beside this build's chunks — a shell
  // naming an entry chunk that is in neither the precache nor on the host. That is a blank page
  // no reload can clear, because `respond()` below answers every navigation from the precached
  // shell.
  //
  // `'reload'` rather than `'no-store'`: both bypass the HTTP cache on the way out, and
  // `'reload'` additionally writes the response back into it, so the page load that follows
  // this fill is served from cache rather than fetched a second time.
  await cache.addAll(
    PRECACHE_ENTRIES.map(
      ({ url, revision }) =>
        new Request(new URL(url, sw.location.href).href, {
          cache: revision === null ? 'default' : 'reload',
        }),
    ),
  );
}

// No `skipWaiting()` in `install`: a new build waits until a reader starts it, because a reload
// clears what is only on screen (issue #369, and `src/workers/registerAppUpdates.ts`). A first visit is not
// held up by this, because a worker with no active one before it activates as soon as it installs,
// and the isolation bootstrap needs nothing more.
sw.addEventListener('message', (event) => {
  if (isSkipWaitingMessage(event.data)) event.waitUntil(sw.skipWaiting());
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Every other precache of the app's is a superseded build. It is retired rather than
      // deleted, because a tab that did not ask for this build still runs the one it booted with.
      const precaches = (await caches.keys()).filter((key) => key.startsWith(CACHE_PREFIX));
      const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await updateLedger(async (ledger) =>
        prune(
          retirePrecaches(
            ledger,
            precaches,
            CACHE,
            windows.map((client) => client.id),
          ),
        ),
      );
      await sw.clients.claim();
    })(),
  );
});

/** The ledger change in flight, so two never read the same ledger and one's write is lost. */
let ledgerQueue: Promise<unknown> = Promise.resolve();

/** Read the ledger, change it, and write it back if the change made a new one. */
function updateLedger(change: (ledger: RetiredPrecache[]) => Promise<RetiredPrecache[]>): Promise<void> {
  const run = ledgerQueue.then(async () => {
    const store = await caches.open(LEDGER_CACHE);
    const stored = await store.match(LEDGER_URL);
    const ledger = parseRetiredPrecaches(stored ? await stored.json().catch(() => null) : null);
    const next = await change(ledger);
    if (next !== ledger) await store.put(LEDGER_URL, Response.json(next));
  });
  ledgerQueue = run.catch(() => undefined);
  return run;
}

/** Delete every retired precache no open window can still need, and return the ledger without it. */
async function prune(ledger: RetiredPrecache[]): Promise<RetiredPrecache[]> {
  const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
  const { keep, discard } = partitionRetired(ledger, new Set(windows.map((client) => client.id)));
  if (discard.length === 0) return ledger;
  await Promise.all(discard.map(({ cache }) => caches.delete(cache)));
  return [...keep];
}

sw.addEventListener('fetch', (event) => {
  // Only GETs are cacheable, and the app issues nothing else — it has no server to POST to.
  if (event.request.method !== 'GET') return;
  event.respondWith(respond(event));
  // A navigation is when a window closes or reloads off a superseded build, so it is when that
  // build's precache may have stopped being needed.
  if (event.request.mode === 'navigate') event.waitUntil(updateLedger(prune));
});

/** The refill in flight, so a burst of navigations that find the shell gone starts only one. */
let refilling: Promise<void> | undefined;

/**
 * Precache this build again after something outside this worker deleted its cache.
 *
 * Another app on the shared origin may sweep every cache it does not own, or the user may clear
 * site data, and `install` runs again only when a new `sw.js` ships. Without this the app would
 * have no offline shell until its next release. A failed refill — offline, or the host already
 * serving a later build whose chunks replace these — writes nothing, and the next navigation that
 * finds the shell gone tries again.
 */
function refill(): Promise<void> {
  refilling ??= precache()
    .catch(() => undefined)
    .finally(() => {
      refilling = undefined;
    });
  return refilling;
}

/**
 * How every lookup in a precache matches: by URL, and by nothing else.
 *
 * `ignoreSearch` so a deep link carrying query parameters still matches the one cached shell.
 * `ignoreVary` because a precache entry is one file per URL, whatever the host's `Vary` header
 * says. Without it a host sending `Vary: Origin` — Vite's preview server does — makes every module
 * script miss, because the browser sends an `Origin` header with a module request and `install`
 * stored its requests without one. The miss falls through to the network, which hides it until the
 * reader is offline, or until a tab asks for a superseded build's chunk the host no longer serves.
 */
const PRECACHE_MATCH = { ignoreSearch: true, ignoreVary: true } as const;

async function respond(event: FetchEvent): Promise<Response> {
  const { request } = event;
  const cache = await caches.open(CACHE);

  // Navigations resolve to the precached shell (offline-first). `install` put the shell there,
  // so a miss means the cache was deleted from outside: this navigation goes to the network, and
  // the refill heals the cache for the next one.
  if (request.mode === 'navigate') {
    const shell = await cache.match(INDEX_URL, PRECACHE_MATCH);
    if (shell) return withIsolationHeaders(shell, sw.location.origin);
    event.waitUntil(refill());
  }

  const cached = (await cache.match(request, PRECACHE_MATCH)) ?? (await matchSuperseded(request));
  if (cached) return withIsolationHeaders(cached, sw.location.origin);

  try {
    return withIsolationHeaders(await fetch(request), sw.location.origin);
  } catch {
    // Offline with nothing cached. A navigation reaches here only when the shell itself is gone,
    // so there is no shell to hand it either. Handing HTML to a script or image request would
    // answer 200 with the wrong MIME type and hide the real cause, so fail cleanly instead.
    return Response.error();
  }
}

/**
 * Answer a request this build's precache lacks from another of the app's precaches.
 *
 * A tab still running a superseded build asks for that build's chunks, which only its own precache
 * still holds. Every precache of the app's is searched, not only those the ledger names, so a lost
 * ledger cannot cost a running tab its code. A content-hashed URL names the same bytes in every
 * cache that holds it, and a stable one never gets here, because this build's precache holds them
 * all.
 */
async function matchSuperseded(request: Request): Promise<Response | undefined> {
  const others = (await caches.keys()).filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE);
  for (const cacheName of others) {
    const hit = await caches.match(request, { ...PRECACHE_MATCH, cacheName });
    if (hit) return hit;
  }
  return undefined;
}
