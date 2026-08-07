import { useUIStore } from '../../stores/useUIStore.ts';

/**
 * The app's one notification surface, reading straight from the store.
 *
 * The live region is rendered **always**, with only its contents conditional. A region added to the
 * document at the same moment as its text is not reliably announced — assistive technology has to be
 * watching an existing region to notice the change — so an empty wrapper that persists is what makes
 * a copy confirmation something a screen-reader user actually hears.
 *
 * There is no success or failure glyph. `showToast` carries a message and no severity, and a green
 * tick beside "Could not save that preset" would be a claim the message itself contradicts.
 */
export function Toast() {
  const message = useUIStore((state) => state.toastMessage);
  const dismissToast = useUIStore((state) => state.dismissToast);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-end sm:inset-x-auto sm:right-6"
    >
      {message !== null && (
        <div className="animate-fade-in pointer-events-auto flex items-center gap-3 rounded-2xl border border-accent-soft/40 bg-gradient-to-r from-accent-strong to-accent px-5 py-3 shadow-2xl backdrop-blur-xl">
          <span className="text-xs font-semibold text-ink">{message}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="text-ink-muted transition-colors hover:text-ink"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>
      )}
    </div>
  );
}
