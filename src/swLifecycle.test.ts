/**
 * How the service worker hands over from one build to the next.
 *
 * Issue #369: the worker used to call `skipWaiting()` as soon as it installed, and the page reloaded
 * every open tab onto it, clearing whatever was only on screen. A build now waits for a page to ask
 * it to start, and a tab that did not ask goes on running the build it booted with, so the worker
 * keeps that build's precache — and answers from it — until no window that may need it is open.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SKIP_WAITING_MESSAGE } from './workers/serviceWorkerProtocol.ts';

const MANIFEST = [{ url: 'index.html', revision: 'a' }];
const LEDGER_CACHE = 'sprite-gubbins-retired-precaches';

/** What a lookup passes, as far as the doubles below read it. */
interface MatchOptions {
  readonly cacheName?: string;
  readonly ignoreVary?: boolean;
}

/** A request as the doubles read it: a string URL, or a URL with the headers the page sent. */
type AnyRequest = string | { readonly url: string; readonly headers?: Headers };

/**
 * Whether the Cache API's `Vary` rule would refuse this stored response for this request.
 *
 * Every entry here was stored, as `install` stores them, from a request carrying no headers. So a
 * response naming a header in `Vary` matches only a request that sends none of it either, unless
 * the lookup passes `ignoreVary`.
 */
function varyRefuses(response: Response, request: AnyRequest, options: MatchOptions): boolean {
  if (options.ignoreVary === true || typeof request === 'string') return false;
  const varied = (response.headers.get('vary') ?? '').split(',').map((name) => name.trim());
  return varied.some((name) => name !== '' && request.headers?.has(name) === true);
}

function hit(store: Map<string, Response> | undefined, request: AnyRequest, options: MatchOptions) {
  const response = store?.get(key(request));
  return Promise.resolve(response && !varyRefuses(response, request, options) ? response.clone() : undefined);
}

/** An in-memory Cache Storage, keyed by URL with the query ignored, as the worker matches. */
class FakeCaches {
  readonly stores = new Map<string, Map<string, Response>>();

  keys() {
    return Promise.resolve([...this.stores.keys()]);
  }

  delete(name: string) {
    return Promise.resolve(this.stores.delete(name));
  }

  open(name: string) {
    const store = this.stores.get(name) ?? new Map<string, Response>();
    this.stores.set(name, store);
    return Promise.resolve({
      addAll: () => Promise.resolve(),
      match: (request: AnyRequest, options: MatchOptions = {}) => hit(store, request, options),
      put: (request: string, response: Response) => {
        store.set(key(request), response);
        return Promise.resolve();
      },
    });
  }

  match(request: AnyRequest, options: MatchOptions = {}) {
    return hit(
      options.cacheName === undefined ? undefined : this.stores.get(options.cacheName),
      request,
      options,
    );
  }

  /** Put a file in a named cache, creating the cache, as a host sending `Vary: Origin` serves it. */
  seed(name: string, url: string) {
    const store = this.stores.get(name) ?? new Map<string, Response>();
    store.set(key(url), new Response(url, { headers: { Vary: 'Origin' } }));
    this.stores.set(name, store);
  }
}

function key(request: AnyRequest): string {
  const url = new URL(typeof request === 'string' ? request : request.url, globalThis.location.href);
  url.search = '';
  return url.href;
}

type Handler = (event: object) => void;

/** Load the worker against fresh doubles, and hand back its handlers and the doubles. */
async function loadWorker(openWindows: string[]) {
  const handlers = new Map<string, Handler>();
  const cacheStorage = new FakeCaches();
  const skipWaiting = vi.fn(() => Promise.resolve());
  const windows = { ids: openWindows };

  vi.stubGlobal('__WB_MANIFEST', MANIFEST);
  vi.stubGlobal('skipWaiting', skipWaiting);
  vi.stubGlobal('caches', cacheStorage);
  vi.stubGlobal('clients', {
    matchAll: () => Promise.resolve(windows.ids.map((id) => ({ id }))),
    claim: () => Promise.resolve(),
  });
  vi.stubGlobal('fetch', () => Promise.resolve(new Response('from the network', { status: 404 })));
  vi.stubGlobal('addEventListener', (type: string, handler: Handler) => {
    handlers.set(type, handler);
  });

  vi.resetModules();
  await import('./sw.ts');

  /** Dispatch an event to the worker and wait for everything it handed to `waitUntil`. */
  async function dispatch(type: string, event: object = {}): Promise<Response | undefined> {
    const pending: Promise<unknown>[] = [];
    let answer: Promise<Response> | undefined;
    const handler = handlers.get(type);
    if (!handler) throw new Error(`the worker registered no ${type} handler`);
    handler({
      ...event,
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      respondWith: (promise: Promise<Response>) => {
        answer = promise;
      },
    });
    await Promise.all(pending);
    return answer;
  }

  /** The name the worker gives this build's precache. */
  async function currentCache(): Promise<string> {
    const before = new Set(cacheStorage.stores.keys());
    await dispatch('install');
    const name = [...cacheStorage.stores.keys()].find((cache) => !before.has(cache));
    if (!name) throw new Error('install opened no precache');
    return name;
  }

  return { dispatch, cacheStorage, skipWaiting, windows, currentCache };
}

/**
 * A GET the page makes. A module script is fetched in `cors` mode with an `Origin` header, which is
 * what a host's `Vary: Origin` keys on.
 */
function get(url: string, mode: RequestMode = 'cors') {
  const headers = new Headers(mode === 'cors' ? { Origin: globalThis.location.origin } : {});
  return { request: { method: 'GET', mode, url: new URL(url, globalThis.location.href).href, headers } };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('service worker hand-over', () => {
  it('waits after installing, and starts only when a page asks it to', async () => {
    const worker = await loadWorker([]);

    await worker.dispatch('install');
    expect(worker.skipWaiting).not.toHaveBeenCalled();

    await worker.dispatch('message', { data: { type: 'ANYTHING_ELSE' } });
    expect(worker.skipWaiting).not.toHaveBeenCalled();

    await worker.dispatch('message', { data: SKIP_WAITING_MESSAGE });
    expect(worker.skipWaiting).toHaveBeenCalledOnce();
  });

  it('keeps a superseded build’s precache while a window open at the hand-over is still open', async () => {
    const worker = await loadWorker(['old-tab']);
    worker.cacheStorage.seed('sprite-gubbins-precache-old', 'assets/view-OLD.js');
    worker.cacheStorage.seed('another-app-precache', 'elsewhere.js');
    const current = await worker.currentCache();

    await worker.dispatch('activate');

    expect([...worker.cacheStorage.stores.keys()].sort()).toEqual(
      ['another-app-precache', current, LEDGER_CACHE, 'sprite-gubbins-precache-old'].sort(),
    );
  });

  it('answers a superseded build’s module chunk from that build’s precache, whatever the host varies on', async () => {
    const worker = await loadWorker(['old-tab']);
    worker.cacheStorage.seed('sprite-gubbins-precache-old', 'assets/view-OLD.js');
    await worker.currentCache();
    await worker.dispatch('activate');

    const answer = await worker.dispatch('fetch', get('assets/view-OLD.js'));

    expect(await answer?.text()).toContain('assets/view-OLD.js');
  });

  it('deletes a superseded precache at the first navigation after its windows have all gone', async () => {
    const worker = await loadWorker(['old-tab']);
    worker.cacheStorage.seed('sprite-gubbins-precache-old', 'assets/view-OLD.js');
    await worker.currentCache();
    await worker.dispatch('activate');

    worker.windows.ids = ['new-tab'];
    await worker.dispatch('fetch', get('index.html', 'navigate'));

    expect(worker.cacheStorage.stores.has('sprite-gubbins-precache-old')).toBe(false);
  });

  it('deletes a superseded precache at once when no window is open to need it', async () => {
    const worker = await loadWorker([]);
    worker.cacheStorage.seed('sprite-gubbins-precache-old', 'assets/view-OLD.js');
    await worker.currentCache();

    await worker.dispatch('activate');

    expect(worker.cacheStorage.stores.has('sprite-gubbins-precache-old')).toBe(false);
  });
});
