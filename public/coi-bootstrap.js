/*
 * Cross-origin isolation bootstrap.
 *
 * In production on a static host, the COOP/COEP headers are supplied by the service worker
 * (src/sw.ts). On the very first visit no worker controls the page yet, so it is not isolated;
 * once one takes control we reload exactly once and it comes back isolated.
 *
 * **The database is not waiting on this.** SQLite's SAH-pool VFS needs a dedicated worker, not
 * `SharedArrayBuffer`, so it works from the very first load. What the reload restores is the COEP
 * `require-corp` posture that blocks cross-origin subresources — see the note in CLAUDE.md.
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
