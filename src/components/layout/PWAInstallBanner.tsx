import { CHROME_TOOLTIPS } from '../../constants/tooltips/index.ts';
import { useShowToast } from '../../hooks/useShowToast.ts';
import { useUIStore } from '../../stores/useUIStore.ts';
import { ControlTooltip } from '../common/ControlTooltip.tsx';

/**
 * The offer to install the app, shown only when the browser has actually made one.
 *
 * The banner exists because the studio is genuinely more useful installed: it works with no network,
 * and its database is in the browser rather than on a server. It appears only after a
 * `beforeinstallprompt` event has been captured (see `App.tsx`), so a browser that cannot install —
 * or one where the app already is — never shows it.
 *
 * The stored event is dropped the moment it is used, before the browser's dialogue is even awaited.
 * It is spendable once — calling `prompt()` on a spent event rejects — and clearing it first is what
 * takes the banner down immediately, so a second press on it is impossible rather than merely
 * unhelpful.
 */
export function PWAInstallBanner() {
  const installPrompt = useUIStore((state) => state.deferredPWAInstallPrompt);
  const setInstallPrompt = useUIStore((state) => state.setInstallPrompt);
  const showToast = useShowToast();

  if (installPrompt === null) return null;

  return (
    <div className="animate-fade-in flex flex-wrap items-center justify-between gap-3 border-b border-accent/30 bg-accent/10 px-6 py-3 backdrop-blur-md">
      <p className="text-xs text-ink-muted">
        <span aria-hidden="true">📲</span> Install Sprite Gubbins to use it offline, with your prompt history
        kept on this device.
      </p>

      <div className="flex items-center gap-2">
        <ControlTooltip hint="Install" text={CHROME_TOOLTIPS.installApp}>
          <button
            type="button"
            onClick={async () => {
              setInstallPrompt(null);
              try {
                await installPrompt.prompt();
                await installPrompt.userChoice;
              } catch {
                // The browser refused to show its dialogue — most often because the event has already
                // been spent. Reported rather than left as an unhandled rejection with no explanation
                // for a button that appeared to do nothing.
                showToast('The browser would not open its install dialogue');
              }
            }}
            className="rounded-xl bg-accent-strong px-4 py-1.5 text-xs font-bold text-foundry-950 shadow-md transition-colors hover:bg-accent"
          >
            Install
          </button>
        </ControlTooltip>
        <ControlTooltip hint="Not now" text={CHROME_TOOLTIPS.dismissInstall}>
          <button
            type="button"
            onClick={() => {
              setInstallPrompt(null);
            }}
            className="rounded-xl border border-foundry-600 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:bg-foundry-700"
          >
            Not now
          </button>
        </ControlTooltip>
      </div>
    </div>
  );
}
