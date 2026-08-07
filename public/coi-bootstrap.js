/*
 * Cross-origin isolation bootstrap.
 *
 * In production on a static host, the COOP/COEP headers the SQLite OPFS backend needs are
 * supplied by the service worker (src/sw.ts). On the very first visit no worker controls the
 * page yet, so it is not isolated; once one takes control we reload exactly once and
 * `SharedArrayBuffer` becomes available.
 *
 * The dev and preview servers set the headers directly, so this is a no-op locally — the
 * `crossOriginIsolated` check below returns immediately.
 *
 * Deliberately a separate same-origin file rather than an inline <script>, so a Content-
 * Security-Policy forbidding inline script stays possible.
 */
(function () {
  if (window.crossOriginIsolated) return;
  if (!('serviceWorker' in navigator) || !window.isSecureContext) return;

  // Guarded per session: `controllerchange` also fires when a *later* build takes over, and an
  // unguarded reload there would loop on any host that still cannot isolate the page.
  var KEY = 'sprite-gubbins-coi-reloaded';
  navigator.serviceWorker.addEventListener('controllerchange', function () {
    if (!sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, '1');
      window.location.reload();
    }
  });
})();
