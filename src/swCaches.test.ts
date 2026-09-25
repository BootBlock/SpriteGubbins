/**
 * Which caches the service worker deletes, and how its precache heals after an outside deletion.
 *
 * Cache Storage belongs to the origin, and the app shares `bootblock.github.io` with every other
 * project site on the account. So `activate` may delete only its own superseded builds, and a
 * sibling app that sweeps every cache it does not own must not leave this one without an offline
 * shell until its next release.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ManifestEntry, resolved, ServiceWorkerDouble } from './test/serviceWorkerDoubles.ts';

const MANIFEST: readonly ManifestEntry[] = [
  { url: 'index.html', revision: '0f1e2d3c4b5a69788796a5b4c3d2e1f0' },
  { url: 'assets/index-D-rZLvvQ.js', revision: null },
];

/** A navigation to the app's root, as the browser hands it to the fetch handler. */
const NAVIGATION: Partial<Request> = {
  method: 'GET',
  mode: 'navigate',
  url: resolved('./'),
};

/** A worker that has installed, with the name of the one cache that install created. */
async function installed(): Promise<{ worker: ServiceWorkerDouble; cache: string }> {
  const worker = new ServiceWorkerDouble();
  await worker.load(MANIFEST);
  await worker.dispatch('install');
  const [cache] = worker.stores.keys();
  if (cache === undefined) throw new Error('install created no cache');
  return { worker, cache };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('service worker activate', () => {
  it('deletes its own superseded builds and leaves every other app’s caches', async () => {
    const { worker, cache } = await installed();
    worker.stores.set('sprite-gubbins-precache-00000000', new Map());
    worker.stores.set('workbox-precache-v2-https://bootblock.github.io/OtherApp/', new Map());
    worker.stores.set('other-app-shell-v3', new Map());

    await worker.dispatch('activate');

    expect([...worker.stores.keys()].sort()).toEqual(
      [cache, 'other-app-shell-v3', 'workbox-precache-v2-https://bootblock.github.io/OtherApp/'].sort(),
    );
  });
});

describe('service worker precache refill', () => {
  it('answers from the precached shell while the cache is intact, and fetches nothing', async () => {
    const { worker } = await installed();

    const response = await worker.dispatch('fetch', NAVIGATION);

    expect(await response?.text()).toBe(`precached ${resolved('index.html')}`);
    expect(worker.fills).toBe(1);
  });

  it('answers a navigation from the network once the cache is deleted, then precaches again', async () => {
    const { worker, cache } = await installed();
    worker.stores.clear();

    const response = await worker.dispatch('fetch', NAVIGATION);

    expect(await response?.text()).toBe(`network ${NAVIGATION.url}`);
    expect([...(worker.stores.get(cache)?.keys() ?? [])].sort()).toEqual(
      MANIFEST.map(({ url }) => resolved(url)).sort(),
    );

    worker.online = false;
    const offline = await worker.dispatch('fetch', NAVIGATION);
    expect(await offline?.text()).toBe(`precached ${resolved('index.html')}`);
  });

  it('writes nothing while offline and heals on the next navigation online', async () => {
    const { worker, cache } = await installed();
    worker.stores.clear();
    worker.online = false;

    const offline = await worker.dispatch('fetch', NAVIGATION);

    expect(offline?.type).toBe('error');
    expect(worker.stores.get(cache)?.size).toBe(0);

    worker.online = true;
    await worker.dispatch('fetch', NAVIGATION);
    expect(worker.stores.get(cache)?.has(resolved('index.html'))).toBe(true);
  });

  it('starts one refill for a burst of navigations that all find the shell gone', async () => {
    const { worker } = await installed();
    worker.stores.clear();

    await Promise.all([1, 2, 3].map(() => worker.dispatch('fetch', NAVIGATION)));

    // One fill from `install`, and one refill for the three navigations.
    expect(worker.fills).toBe(2);
  });
});
