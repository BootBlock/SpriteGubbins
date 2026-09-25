/**
 * How the service worker hands over from one build to the next.
 *
 * Issue #369: the worker used to call `skipWaiting()` as soon as it installed, and the page reloaded
 * every open tab onto it, clearing whatever was only on screen. A build now waits for a page to ask
 * it to start, and a tab that did not ask goes on running the build it booted with, so the worker
 * keeps that build's precache — and answers from it — until no window that may need it is open.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

import { type ManifestEntry, resolved, ServiceWorkerDouble } from './test/serviceWorkerDoubles.ts';
import { SKIP_WAITING_MESSAGE } from './workers/serviceWorkerProtocol.ts';

const MANIFEST: readonly ManifestEntry[] = [
  { url: 'index.html', revision: '0f1e2d3c4b5a69788796a5b4c3d2e1f0' },
];
const SUPERSEDED = 'sprite-gubbins-precache-00000000';
const OLD_CHUNK = resolved('assets/view-OLD.js');

/** A navigation to the app's root, as the browser hands it to the fetch handler. */
const NAVIGATION: Partial<Request> = { method: 'GET', mode: 'navigate', url: resolved('./') };

/**
 * A module script request, which the browser sends in `cors` mode with an `Origin` header — the
 * header a host's `Vary: Origin` keys on.
 */
const OLD_CHUNK_REQUEST: Partial<Request> = {
  method: 'GET',
  mode: 'cors',
  url: OLD_CHUNK,
  headers: new Headers({ Origin: globalThis.location.origin }),
};

/** A worker installed beside a superseded build's precache, with these windows open. */
async function installedBesideOldBuild(windows: string[]): Promise<ServiceWorkerDouble> {
  const worker = new ServiceWorkerDouble();
  worker.windows = windows;
  await worker.load(MANIFEST);
  worker.stores.set(SUPERSEDED, new Map([[OLD_CHUNK, 'old build chunk']]));
  await worker.dispatch('install');
  return worker;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('service worker hand-over', () => {
  it('waits after installing, and starts only when a page asks it to', async () => {
    const worker = await installedBesideOldBuild([]);
    expect(worker.skipWaiting).not.toHaveBeenCalled();

    await worker.dispatch('message', undefined, { type: 'ANYTHING_ELSE' });
    expect(worker.skipWaiting).not.toHaveBeenCalled();

    await worker.dispatch('message', undefined, SKIP_WAITING_MESSAGE);
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });

  it('keeps a superseded build’s precache while a window open at the hand-over is still open', async () => {
    const worker = await installedBesideOldBuild(['old-window']);

    await worker.dispatch('activate');

    expect(worker.stores.has(SUPERSEDED)).toBe(true);
  });

  it('answers a superseded build’s module chunk from that build’s precache, whatever the host varies on', async () => {
    const worker = await installedBesideOldBuild(['old-window']);
    worker.varyOnOrigin = true;
    await worker.dispatch('activate');

    const answer = await worker.dispatch('fetch', OLD_CHUNK_REQUEST);

    expect(await answer?.text()).toBe('old build chunk');
  });

  it('deletes a superseded precache at the first navigation after its windows have all gone', async () => {
    const worker = await installedBesideOldBuild(['old-window']);
    await worker.dispatch('activate');

    worker.windows = ['new-window'];
    await worker.dispatch('fetch', NAVIGATION);

    expect(worker.stores.has(SUPERSEDED)).toBe(false);
  });

  it('deletes a superseded precache at once when no window is open to need it', async () => {
    const worker = await installedBesideOldBuild([]);

    await worker.dispatch('activate');

    expect(worker.stores.has(SUPERSEDED)).toBe(false);
  });
});
