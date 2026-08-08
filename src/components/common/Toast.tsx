import { TOAST_DURATION_MS } from '../../constants/ui.ts';
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
 *
 * It does carry a **countdown**, drawn along its lower edge, because the store dismisses it on a
 * timer and a notification that vanishes without warning reads as one that was missed. The bar is
 * decorative and hidden: the message is the announcement, and narrating a depleting progress bar to
 * a screen-reader user would talk over it.
 */
export function Toast() {
  const message = useUIStore((state) => state.toastMessage);
  const toastId = useUIStore((state) => state.toastId);
  const dismissToast = useUIStore((state) => state.dismissToast);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-end sm:inset-x-auto sm:right-6"
    >
      {message !== null && (
        // Keyed by the toast rather than by its wording, so a repeated message still restarts the
        // entrance and the countdown instead of inheriting the previous one's progress.
        <div
          key={toastId}
          className="animate-toast-in pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-2xl border border-accent-soft/40 bg-gradient-to-r from-accent-strong to-accent px-5 py-3 shadow-2xl ring-1 ring-accent-soft/20 backdrop-blur-xl"
        >
          <span className="text-xs font-semibold text-ink">{message}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="text-ink-muted transition-all duration-200 hover:rotate-90 hover:text-ink"
          >
            <span aria-hidden="true">✕</span>
          </button>

          {/*
            The time left, as a bar. Its duration comes from the constant the store's timer is set
            from — the animation token deliberately declares none — so the two cannot disagree about
            when this disappears.
          */}
          <span
            aria-hidden="true"
            style={{ animationDuration: `${TOAST_DURATION_MS}ms` }}
            className="animate-toast-timer absolute inset-x-0 bottom-0 h-0.5 origin-left bg-ink/60"
          />
        </div>
      )}
    </div>
  );
}
