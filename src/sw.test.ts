/**
 * What the service worker's `install` handler asks the network for.
 *
 * The one thing under test is the HTTP-cache mode each precache entry is fetched with, because
 * getting it backwards is silent: every entry is still precached, the worker still activates, and
 * the damage only appears on the *next* deploy as a shell that names an entry chunk nobody serves.
 * The expected modes below are therefore written out by hand rather than derived from `revision`,
 * so this file states the rule instead of restating the implementation.
 *
 * The manifest is the shape vite-plugin-pwa actually injects. `revision: null` on the
 * content-hashed assets, an MD5 string on the ones served from stable URLs — all seven the current
 * build emits, beside four hashed assets, which is enough to state the rule. Four of *any* number
 * is, which is why the total the fixture samples from is not stated: it moves with every chunk the
 * bundle split produces, and a figure stood here that the build had left behind (issue #267).
 * The two PWA icons are listed **twice**, as the real manifest lists them: the precache glob and
 * the webmanifest's `icons` injection each contribute them, and `cache.addAll` rejects on a
 * duplicate request, which would abort `install` and leave the worker redundant.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  type ManifestEntry,
  type RecordingRequest,
  resolved,
  ServiceWorkerDouble,
} from './test/serviceWorkerDoubles.ts';

const MANIFEST: readonly ManifestEntry[] = [
  { url: 'index.html', revision: '0f1e2d3c4b5a69788796a5b4c3d2e1f0' },
  { url: '404.html', revision: '1f2e3d4c5b6a798087968a7b6c5d4e3f' },
  { url: 'coi-bootstrap.js', revision: '2a3b4c5d6e7f80918273645546372819' },
  { url: 'favicon.ico', revision: '3b4c5d6e7f8091a2b3c4d5e6f7081920' },
  { url: 'icon-192.png', revision: '4c5d6e7f8091a2b3c4d5e6f708192a3b' },
  { url: 'icon-512.png', revision: '5d6e7f8091a2b3c4d5e6f708192a3b4c' },
  { url: 'assets/index-D-rZLvvQ.js', revision: null },
  { url: 'assets/index-55TDtosV.css', revision: null },
  { url: 'assets/workbox-window.prod.es5-Bd17z0YL.js', revision: null },
  { url: 'assets/sqlite3-CFuOw83T.wasm', revision: null },
  { url: 'icon-192.png', revision: '4c5d6e7f8091a2b3c4d5e6f708192a3b' },
  { url: 'icon-512.png', revision: '5d6e7f8091a2b3c4d5e6f708192a3b4c' },
  { url: 'manifest.webmanifest', revision: '6e7f8091a2b3c4d5e6f708192a3b4c5d' },
];

/**
 * The mode each of those must be requested with.
 *
 * A stable URL is fetched past the HTTP cache, because GitHub Pages serves it with
 * `max-age=600` and a stale copy taken within that window is precached as current. A
 * content-hashed URL may come from the cache, because its bytes cannot have changed.
 */
const EXPECTED_MODES: Readonly<Record<string, RequestCache>> = {
  'index.html': 'reload',
  '404.html': 'reload',
  'coi-bootstrap.js': 'reload',
  'favicon.ico': 'reload',
  'icon-192.png': 'reload',
  'icon-512.png': 'reload',
  'manifest.webmanifest': 'reload',
  'assets/index-D-rZLvvQ.js': 'default',
  'assets/index-55TDtosV.css': 'default',
  'assets/workbox-window.prod.es5-Bd17z0YL.js': 'default',
  'assets/sqlite3-CFuOw83T.wasm': 'default',
};

/** Run the worker's `install` handler against {@link MANIFEST} and return what it asked for. */
async function runInstall(): Promise<RecordingRequest[]> {
  const worker = new ServiceWorkerDouble();
  await worker.load(MANIFEST);
  await worker.dispatch('install');
  return worker.requested;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('service worker install', () => {
  it('fetches every stable URL past the HTTP cache and every hashed one through it', async () => {
    const modes = new Map((await runInstall()).map((request) => [request.url, request.init.cache]));

    expect(
      Object.fromEntries(Object.keys(EXPECTED_MODES).map((url) => [url, modes.get(resolved(url))])),
    ).toEqual(EXPECTED_MODES);
  });

  // Without this the two tests below cover disjoint lists: the first walks `EXPECTED_MODES` and
  // the second walks `MANIFEST`, so an entry added to the manifest alone would have no stated mode
  // and nothing would say so.
  it('states an expected mode for every URL the manifest lists', () => {
    expect(Object.keys(EXPECTED_MODES).sort()).toEqual(
      [...new Set(MANIFEST.map((entry) => entry.url))].sort(),
    );
  });

  it('requests each URL once, however many times the manifest lists it', async () => {
    const requested = (await runInstall()).map((request) => request.url).sort();

    expect(requested).toEqual([...new Set(MANIFEST.map((entry) => resolved(entry.url)))].sort());
  });
});
