import { vi } from 'vitest';

/** One entry of the injected precache manifest, as `src/sw.ts` reads it. */
export interface ManifestEntry {
  readonly url: string;
  readonly revision: string | null;
}

/**
 * A stand-in for `Request`, because happy-dom's does not expose `.cache` — the property the install
 * suite exists to read. It records rather than fetches; nothing here reaches the network.
 */
export class RecordingRequest {
  constructor(
    readonly url: string,
    readonly init: RequestInit = {},
  ) {}
}

/** As much of an `ExtendableEvent` or a `FetchEvent` as the worker's handlers touch. */
interface HandlerEvent {
  /** Present on a fetch; `install` and `activate` carry none. */
  readonly request: Partial<Request> | undefined;
  waitUntil(promise: Promise<unknown>): void;
  respondWith(response: Promise<Response>): void;
}

/**
 * The origin's Cache Storage and the network, in memory, with `src/sw.ts` loaded against them.
 *
 * `stores` maps a cache name to the absolute URLs it holds and the body each was stored with, so a
 * suite can seed another app's caches beside this one's and read back what survived. `online`
 * governs both `fetch` and `addAll`, which fetches too — and, as the real one does, rejects
 * without writing anything when a single request fails.
 */
export class ServiceWorkerDouble {
  readonly stores = new Map<string, Map<string, string>>();
  /** Every request an `addAll` asked for, in order and with repeats intact. */
  readonly requested: RecordingRequest[] = [];
  /** How many `addAll` calls ran, whether or not they wrote anything. */
  fills = 0;
  online = true;
  private readonly handlers = new Map<string, (event: HandlerEvent) => void>();

  /**
   * Execute `src/sw.ts` afresh against this double.
   *
   * The handlers are captured through a stubbed `addEventListener` rather than reached by
   * dispatching an event. `vi.resetModules()` re-executes the worker on every load, and each
   * execution registers another listener that nothing removes: a dispatch after the second load
   * would run both, and every entry would be requested twice while still looking correct.
   */
  async load(manifest: readonly ManifestEntry[]): Promise<void> {
    vi.stubGlobal('__WB_MANIFEST', manifest);
    vi.stubGlobal('Request', RecordingRequest);
    vi.stubGlobal('skipWaiting', () => Promise.resolve());
    vi.stubGlobal('clients', { claim: () => Promise.resolve() });
    vi.stubGlobal('addEventListener', (type: string, handler: (event: HandlerEvent) => void) => {
      this.handlers.set(type, handler);
    });
    vi.stubGlobal('caches', {
      open: (name: string) => Promise.resolve(this.cache(name)),
      keys: () => Promise.resolve([...this.stores.keys()]),
      delete: (name: string) => Promise.resolve(this.stores.delete(name)),
    });
    vi.stubGlobal('fetch', (request: Request) =>
      this.online
        ? Promise.resolve(new Response(`network ${request.url}`))
        : Promise.reject(new TypeError('Failed to fetch')),
    );
    vi.resetModules();
    await import('../sw.ts');
  }

  /**
   * Run the worker's `type` handler and wait for everything it hands the browser — its response,
   * then every promise it passed to `waitUntil`, including one it passes while answering.
   */
  async dispatch(type: string, request?: Partial<Request>): Promise<Response | undefined> {
    const handler = this.handlers.get(type);
    if (!handler) throw new Error(`the worker registered no ${type} handler`);
    const extensions: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    handler({
      request,
      waitUntil: (promise) => extensions.push(promise),
      respondWith: (answer) => {
        response = answer;
      },
    });
    const answered = await response;
    for (let index = 0; index < extensions.length; index++) await extensions[index];
    return answered;
  }

  private cache(name: string) {
    const store = this.stores.get(name) ?? new Map<string, string>();
    this.stores.set(name, store);
    return {
      addAll: (requests: RecordingRequest[]) => {
        this.fills++;
        this.requested.push(...requests);
        if (!this.online) return Promise.reject(new TypeError('Failed to fetch'));
        for (const { url } of requests) store.set(url, `precached ${url}`);
        return Promise.resolve();
      },
      match: (target: string | Partial<Request>) => {
        const body = store.get(resolved(typeof target === 'string' ? target : (target.url ?? '')));
        return Promise.resolve(body === undefined ? undefined : new Response(body));
      },
    };
  }
}

/** The absolute form `src/sw.ts` resolves a manifest URL to, so the stored keys line up. */
export function resolved(url: string): string {
  return new URL(url, globalThis.location.href).href;
}
