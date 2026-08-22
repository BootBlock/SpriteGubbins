/**
 * The cross-origin isolation headers the service worker adds, and the rule about *which*
 * responses may be given them.
 *
 * GitHub Pages sends no COOP/COEP for the app's own documents and assets, so `src/sw.ts` writes
 * them onto what it proxies. That is a same-origin problem with a same-origin answer, and the
 * gate below is what keeps it one: a response that came from another origin is returned exactly as
 * that origin sent it, whichever origin was asked.
 *
 * **`Cross-Origin-Resource-Policy` is the header the gate exists for.** CORP is response-side
 * metadata about who may embed a resource, and it is the opt-in COEP `require-corp` checks for. A
 * worker that writes `cross-origin` onto everything it hands back — a live network response from a
 * host that set no CORP included, which is what this one did — has its page answering a question
 * that was asked of somebody else. No proxy is in a position to make that statement on another
 * origin's behalf.
 *
 * **What that granted, measured, is nothing, and the reason is worth keeping.** Driven in Chromium
 * against a host sending no COOP/COEP, three cross-origin subresource shapes come out the same
 * under the blanket stamp and under this gate: a plain `<script src>` is blocked, a `crossorigin`
 * one loads, and a same-origin URL redirecting off-origin is blocked. A no-cors request comes back
 * to the worker *opaque*, so it reports `status === 0` and the guard below returns it untouched; a
 * CORS-mode request is exempt from the CORP check altogether, so the header it was given is never
 * read. So what the gate holds is the posture rather than a load — and it is one line of
 * `respond()` away from holding a load, because a fallback that re-fetched a no-cors request in
 * CORS mode would hand the opt-in out for real.
 *
 * `same-origin` is the value the app's own assets want, and it is what they already get by
 * default — a missing CORP on a same-origin response is treated as `same-origin` by the check. It
 * is set explicitly so the posture is stated rather than inherited.
 *
 * COOP and COEP go on **every** same-origin response, not on the navigation alone. COOP is a
 * document header and is ignored elsewhere, but COEP is not: a dedicated worker created by a
 * `require-corp` owner is blocked unless its own script response carries `require-corp` too, and
 * this app starts four of them (`src/db/sqliteWorker.ts` and the three in `src/workers/`).
 */

/** The headers a response this origin serves is given, keyed by name. */
const ISOLATION_HEADERS: ReadonlyMap<string, string> = new Map([
  ['Cross-Origin-Opener-Policy', 'same-origin'],
  ['Cross-Origin-Embedder-Policy', 'require-corp'],
  ['Cross-Origin-Resource-Policy', 'same-origin'],
]);

/**
 * Clone `response` with the isolation headers added, if it came from `origin`.
 *
 * **The response's own URL is what decides**, never the request's. A `fetch` follows redirects, so
 * a same-origin request can be answered by another origin, and a worker that judged the request
 * would stamp that answer — the thing this module exists to stop, one redirect further on.
 * `response.url` is where the answer actually came from: the final URL for a network response, the
 * stored URL for one the Cache API returned.
 *
 * That the Cache API keeps the URL is the load-bearing half, because two of the three call sites in
 * `src/sw.ts` are cache hits and a cached response reporting none would leave the page quietly
 * un-isolated. Measured rather than assumed: on the bootstrap reload, which the worker answers from
 * the precached shell, `crossOriginIsolated` is true.
 *
 * Two shapes report no origin to judge and are returned untouched. An **opaque** response — what a
 * no-cors cross-origin request comes back as — reports `status === 0`, unreadable headers and a body
 * that cannot be re-wrapped. A response **built in code** reports an empty `url`; nothing `src/sw.ts`
 * passes in is one, and the branch is here so the function is total rather than throwing on a
 * `new URL('')` for a caller that hands it one.
 */
export function withIsolationHeaders(response: Response, origin: string): Response {
  if (response.status === 0 || response.url === '') return response;
  if (new URL(response.url).origin !== origin) return response;

  const headers = new Headers(response.headers);
  for (const [name, value] of ISOLATION_HEADERS) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
