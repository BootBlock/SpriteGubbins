import { registerSW } from 'virtual:pwa-register';
import { useUIStore } from '../stores/useUIStore.ts';

/**
 * Register the service worker, and turn its lifecycle into the tab's `appUpdate` state.
 *
 * A new build **never** reloads a tab on its own (issue #369). Much of what a reader is doing is
 * only on screen — the sheet in the Quantise tab, its palette lock and sprite names, every undo
 * history — so the build waits until they start it with `applyAppUpdate`, and a tab that did not
 * start it is told rather than reloaded.
 *
 * `registerType: 'prompt'` (vite.config.ts) makes the plugin report a waiting build through
 * `onNeedRefresh` rather than start it. Its `onNeedReload` is where the plugin would otherwise reload
 * every tab it had told, the ones that did not ask included, so it is answered with nothing: the
 * `controllerchange` listener below decides instead, and it hears the swap in every tab, whether or
 * not the plugin's own bookkeeping saw the build install.
 *
 * `immediate` registers on load rather than waiting for the window's `load` event, so a first visit
 * is cached for offline use as early as possible.
 */
export function registerAppUpdates(): void {
  const { setAppUpdate } = useUIStore.getState();
  registerSW({
    immediate: true,
    onNeedRefresh: () => {
      setAppUpdate('waiting');
    },
    onNeedReload: () => undefined,
  });
  if (!('serviceWorker' in navigator)) return;

  const container = navigator.serviceWorker;
  let controller = container.controller;
  container.addEventListener('controllerchange', () => {
    const previous = controller;
    controller = container.controller;
    // A first visit's worker claiming the page is no update: `public/coi-bootstrap.js` reloads
    // for that one, once, to take up the isolation headers.
    if (previous === null) return;
    if (useUIStore.getState().appUpdate === 'starting') window.location.reload();
    else setAppUpdate('elsewhere');
  });
}
