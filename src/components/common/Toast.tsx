import { TOAST_DURATION_MS, TOAST_EXIT_MS } from '../../constants/ui.ts';
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
 *
 * **It leaves the way it arrived.** Once the countdown runs out the store raises `isToastLeaving`
 * and holds the message mounted for the length of the fade, so the surface has something left to
 * animate — a toast removed from the tree cannot animate anything. `inert` goes on for exactly that
 * window, and it is doing real work rather than tidying: the card is `pointer-events-auto` and sits
 * over the bottom-right corner of the page, so a fully transparent one left interactive would
 * swallow clicks meant for whatever is underneath it. Under `prefers-reduced-motion` that is not a
 * corner case but the normal path — the catch-all in `index.css` collapses the fade to nothing while
 * the store's timer still runs its full length, which is a couple of seconds of invisible toast.
 * `inert` takes it out of the hit-testing, the tab order and the accessibility tree together.
 *
 * What that costs is the ✕ for the length of the fade — measured in Edge, a click on it mid-fade
 * does nothing — and the trade is deliberate. Dismissing is for a notification that is in the way,
 * and one already two thirds of the way off the screen is not; there is no version of this where the
 * button stays live and the transparent card stops swallowing the clicks around it.
 */
export function Toast() {
  const message = useUIStore((state) => state.toastMessage);
  const toastId = useUIStore((state) => state.toastId);
  const isLeaving = useUIStore((state) => state.isToastLeaving);
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
          inert={isLeaving}
          // The exit's duration comes from the same constant the store's second timer is set from,
          // for the reason the countdown below carries its own: `animate-toast-out` declares none.
          style={isLeaving ? { animationDuration: `${TOAST_EXIT_MS}ms` } : undefined}
          className={`${isLeaving ? 'animate-toast-out' : 'animate-toast-in'} pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-2xl border border-accent-soft/40 bg-gradient-to-r from-accent-strong to-accent px-5 py-3 shadow-2xl ring-1 ring-accent-soft/20 backdrop-blur-xl`}
        >
          <span className="text-xs font-semibold text-ink">{message}</span>
          <button
            type="button"
            onClick={dismissToast}
            aria-label="Dismiss notification"
            className="text-ink-muted transition-all duration-300 hover:rotate-90 hover:text-ink"
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
