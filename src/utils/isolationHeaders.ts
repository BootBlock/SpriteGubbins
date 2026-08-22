/**
 * The cross-origin isolation headers the service worker adds, and the rule about *which*
 * responses may be given them.
 *
 * GitHub Pages sends no COOP/COEP for the app's own documents and assets, so `src/sw.ts` writes
 * them onto what it proxies. That is a same-origin problem with a same-origin answer, and the
 * gate below is what keeps it one: a response from another origin is returned exactly as that
 * origin sent it.
 *
 * **`Cross-Origin-Resource-Policy` is the header that made the gate necessary.** CORP is
 * response-side metadata about who may embed a resource, and it is the opt-in COEP `require-corp`
 * checks for. This worker used to set `cross-origin` on everything it handed back — including a
 * live network response from a host that had set no CORP at all — which is the page's own worker
 * answering a question that was asked of somebody else. No proxy is in a position to make that
 * statement on another origin's behalf.
 *
 * **Measured, it granted nothing, and the reason is worth keeping.** Driven in Chromium against a
 * host sending no COOP/COEP, three cross-origin subresource shapes behave identically before and
 * after this change: a plain `<script src>` is blocked, a `crossorigin` one loads, and a
 * same-origin URL redirecting off-origin is blocked. A no-cors request comes back to the worker
 * *opaque*, so it reports `status === 0` and the guard below already returned it untouched; a
 * CORS-mode request is exempt from the CORP check altogether, so the header it was given was never
 * read. So this is a posture being corrected rather than a load being stopped — and it is one line
 * of `respond()` away from mattering, because a fallback that re-fetched a no-cors request in CORS
 * mode would hand out the opt-in for real.
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
 * Clone `response` with the isolation headers added, if `requestUrl` names `origin`.
 *
 * Anything else is returned untouched — another origin's response, and the opaque or network-error
 * responses that report `status === 0`, whose headers are unreadable and whose body cannot be
 * re-wrapped.
 */
export function withIsolationHeaders(response: Response, requestUrl: string, origin: string): Response {
  if (response.status === 0) return response;
  if (new URL(requestUrl).origin !== origin) return response;

  const headers = new Headers(response.headers);
  for (const [name, value] of ISOLATION_HEADERS) headers.set(name, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
