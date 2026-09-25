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

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await precache();
      // `autoUpdate`: a new build takes over as soon as it is ready. The app holds no unsaved
      // state that a swap could lose — everything the user has typed is already in the local
      // database — and the isolation bootstrap depends on this worker activating promptly.
      await sw.skipWaiting();
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

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Every cache of this app's but this build's precache is a superseded build. Only those:
      // the origin's other caches belong to its other apps (see `CACHE_PREFIX`). This is the first
      // moment deleting them is safe: the clients they were serving are about to be claimed onto
      // this build by the `claim()` below.
      const keys = await caches.keys();
      const superseded = keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE);
      await Promise.all(superseded.map((key) => caches.delete(key)));
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener('fetch', (event) => {
  // Only GETs are cacheable, and the app issues nothing else — it has no server to POST to.
  if (event.request.method !== 'GET') return;
  event.respondWith(respond(event));
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

async function respond(event: FetchEvent): Promise<Response> {
  const { request } = event;
  const cache = await caches.open(CACHE);

  // Navigations resolve to the precached shell (offline-first). `ignoreSearch` so a deep link
  // carrying query parameters still matches the one cached shell. `install` put the shell there,
  // so a miss means the cache was deleted from outside: this navigation goes to the network, and
  // the refill heals the cache for the next one.
  if (request.mode === 'navigate') {
    const shell = await cache.match(INDEX_URL, { ignoreSearch: true });
    if (shell) return withIsolationHeaders(shell, sw.location.origin);
    event.waitUntil(refill());
  }

  const cached = await cache.match(request, { ignoreSearch: true });
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
