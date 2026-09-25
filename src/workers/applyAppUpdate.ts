import { useUIStore } from '../stores/useUIStore.ts';
import { SKIP_WAITING_MESSAGE } from './serviceWorkerProtocol.ts';

/**
 * Start the waiting build, and let `registerAppUpdates` reload this tab once it has taken over.
 *
 * The `starting` state is what tells that listener the swap is this tab's own, to reload for, rather
 * than another tab's, to report. With no build waiting, which happens when a later one replaced it,
 * the tab reloads straight away: the page load then finds whatever build is newest, so the press is
 * never answered with nothing.
 */
export async function applyAppUpdate(): Promise<void> {
  useUIStore.getState().setAppUpdate('starting');
  const waiting = (await navigator.serviceWorker.getRegistration())?.waiting;
  if (waiting) waiting.postMessage(SKIP_WAITING_MESSAGE);
  else window.location.reload();
}
