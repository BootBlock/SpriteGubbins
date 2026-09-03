import { useUIStore } from '../../stores/useUIStore.ts';
import { ToastCard } from './ToastCard.tsx';
import type { ToastTarget } from '../../types/ui.ts';

interface ToastProps {
  /**
   * Which document this one serves. Messages addressed anywhere else are not its to show.
   *
   * Defaults to the page, which is where two of the three mounts are: `AppOverlays` renders one
   * while no overlay is open, and `Modal` renders one inside the `<dialog>` — mutually exclusive by
   * construction, and both of them the page's. The third is `DetachedPreview`, which is the only
   * surface that can be on screen *beside* the page rather than instead of it, and the only reason
   * this prop exists.
   */
  readonly target?: ToastTarget;
}

/**
 * The app's notification region, reading straight from the store. `ToastCard` is the surface inside
 * it, and holds everything about how the notification looks and moves — the countdown, the fade, and
 * the `inert` window that keeps a transparent card from swallowing the clicks around it.
 *
 * The live region is rendered **always**, with only its contents conditional. A region added to the
 * document at the same moment as its text is not reliably announced — assistive technology has to be
 * watching an existing region to notice the change — so an empty wrapper that persists is what makes
 * a copy confirmation something a screen-reader user actually hears.
 *
 * There is no success or failure glyph. `showToast` carries a message and no severity, and a green
 * tick beside "Could not save that preset" would be a claim the message itself contradicts.
 *
 * **A message it is not addressed to is not its to show.** More than one of these can be mounted at
 * once — the comparison panel's window has its own, because the panel's download button travels
 * there — and the store holds one message and one timer, so an ungated second surface would show and
 * announce every notification a second time, in a document nobody raised it from. The live region is
 * still rendered here either way, for the reason above: a region that appears with its text is not
 * reliably announced, and a document that only ever renders one when it has something to say never
 * announces anything.
 *
 * **A message does still change region when an overlay opens or closes**, because that is what moves
 * the mount, and there is no arrangement in which it does not: `toastRaisedAt` says why the toast
 * cannot be lifted clear of the boundary, and `ToastCard` says what crossing it now costs. Whether a
 * screen reader announces the message a second time on the way out has not been measured, and the
 * app's own reasoning about live regions makes it unreliable in either direction — so nothing here
 * suppresses it, which would risk silencing a message that was never announced in the first place.
 */
export function Toast({ target = 'page' }: ToastProps) {
  const addressed = useUIStore((state) => state.toastTarget === target);
  const message = useUIStore((state) => state.toastMessage);
  const toastId = useUIStore((state) => state.toastId);
  const raisedAt = useUIStore((state) => state.toastRaisedAt);
  const isLeaving = useUIStore((state) => state.isToastLeaving);
  const dismissToast = useUIStore((state) => state.dismissToast);

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed inset-x-4 bottom-6 z-50 flex justify-end sm:inset-x-auto sm:right-6"
    >
      {addressed && message !== null && (
        // Keyed by the toast rather than by its wording, so a repeated message still restarts the
        // entrance and the countdown instead of inheriting the previous one's progress — and so the
        // offset `ToastCard` freezes as it mounts belongs to this notification and no other.
        <ToastCard
          key={toastId}
          message={message}
          isLeaving={isLeaving}
          raisedAt={raisedAt}
          onDismiss={dismissToast}
        />
      )}
    </div>
  );
}
