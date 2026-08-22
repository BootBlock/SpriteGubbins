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
 * it is available from the first load; see the note in CLAUDE.md.
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

const CACHE = `sprite-gubbins-precache-${fingerprint(PRECACHE_ENTRIES)}`;
const INDEX_URL = 'index.html';

sw.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      // Resolved against this worker's own URL so every entry tracks the `/SpriteGubbins/`
      // base path. Revisioned entries may be served from the HTTP cache; unrevisioned ones
      // (the shell) must come from the network or a stale copy would be precached as current.
      await cache.addAll(
        PRECACHE_ENTRIES.map(
          ({ url, revision }) =>
            new Request(new URL(url, sw.location.href).href, {
              cache: revision === null ? 'reload' : 'default',
            }),
        ),
      );
      // `autoUpdate`: a new build takes over as soon as it is ready. The app holds no unsaved
      // state that a swap could lose — everything the user has typed is already in the local
      // database — and the isolation bootstrap depends on this worker activating promptly.
      await sw.skipWaiting();
    })(),
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Every cache but this build's precache is a superseded build. This is the first moment
      // deleting them is safe: the clients they were serving are about to be claimed onto this
      // build by the `claim()` below.
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await sw.clients.claim();
    })(),
  );
});

sw.addEventListener('fetch', (event) => {
  // Only GETs are cacheable, and the app issues nothing else — it has no server to POST to.
  if (event.request.method !== 'GET') return;
  event.respondWith(respond(event.request));
});

async function respond(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);

  // Navigations resolve to the precached shell (offline-first). `ignoreSearch` so a deep link
  // carrying query parameters still matches the one cached shell.
  if (request.mode === 'navigate') {
    const shell = await cache.match(INDEX_URL, { ignoreSearch: true });
    if (shell) return isolate(shell, request);
  }

  const cached = await cache.match(request, { ignoreSearch: true });
  if (cached) return isolate(cached, request);

  try {
    return isolate(await fetch(request), request);
  } catch {
    // Offline with nothing cached. This can only be a *subresource* — a navigation was already
    // answered from the precached shell above, and had that shell been missing this lookup
    // could not have found it either. Handing HTML to a script or image request would answer
    // 200 with the wrong MIME type and hide the real cause, so fail cleanly instead.
    return Response.error();
  }
}

/**
 * {@link withIsolationHeaders} bound to this worker's own origin.
 *
 * The gate is on the **request** URL rather than the response's, because a cached response and a
 * `Response.error()` both report a URL this decision cannot be made from.
 */
function isolate(response: Response, request: Request): Response {
  return withIsolationHeaders(response, request.url, sw.location.origin);
}
