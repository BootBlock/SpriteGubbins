import { useState } from 'react';
import { TOAST_DURATION_MS, TOAST_EXIT_MS } from '../../constants/ui.ts';

interface ToastCardProps {
  readonly message: string;
  /** Whether the store has begun removing this message, which swaps the entrance for the exit. */
  readonly isLeaving: boolean;
  /** When the store raised this message, as `Date.now()`. Both animations are anchored to it. */
  readonly raisedAt: number;
  readonly onDismiss: () => void;
}

/**
 * The notification itself: the message, the ✕, and the countdown drawn along the lower edge.
 *
 * **Separate from `Toast` because a hook is what freezes the anchor, and only a remount resets one.**
 * The card is keyed by the toast’s id there, so each message gets its own instance of this and its
 * own `elapsedAtMount` — which is the whole mechanism. A `useState` initialiser inside `Toast`,
 * whose position in the tree never changes, would freeze the first notification of the session and
 * hand its offset to every one after it.
 *
 * **What the anchor is for.** The store’s timers run from the raise; these animations run from the
 * mount; and the mount does not survive an overlay opening or closing, because the app’s one toast
 * lives inside the `<dialog>` while an overlay is open and in `AppOverlays` while none is. Crossing
 * that boundary used to replay the entrance and restart the countdown while the store went on
 * removing the message on its original schedule, so a notification disappeared with its bar about a
 * third drained. Reading the elapsed time as this mounts and handing it to both animations as a
 * negative `animation-delay` puts each of them where it would have been had nothing moved:
 * `toast-in` is 624ms, so anything mounted later than that arrives already arrived, and the bar
 * picks up its drain part-way through. Measured in Edge, a 3000ms bar carrying a `-2000ms` delay
 * renders at 69% of its travel and continues from there.
 *
 * **The offset is frozen rather than recomputed, and that is not an optimisation.** An animation’s
 * start time is fixed when it is created, and the delay is subtracted from the time since — so a
 * delay rewritten on a later render moves the animation forward *again* while the clock is already
 * carrying it. Measured the same way: a bar 587ms into a `-2000ms` resume, handed the `-2600ms` its
 * elapsed time had reached by then, jumped straight to the end. So the offset belongs to the mount,
 * and the mount is what `key` controls.
 *
 * **The exit gets its own offset for the same reason and usually needs none.** A card that mounted
 * during the dwell and was still there when the fade began starts that fade at zero, which is
 * already right. One that mounted *during* the fade — an overlay closed over a notification two
 * seconds gone — would otherwise snap back to full opacity and fade again over a message the store
 * removes part-way through, which is the original defect wearing its other face.
 *
 * **Everything on the card is near-black, and this is where that is said.** The ground is a role
 * colour rather than a panel — `accent-strong` fading to `accent` — and both stops are *light*, so
 * the ink ramp cannot sit on either: `ink` measures 3.07:1 and 2.04:1 across the two, `ink-muted`
 * 1.71:1 and 1.14:1. The ✕ was `ink-muted`, which at the accent end is not dim but invisible. So the
 * surface takes `text-foundry-950`, which measures 5.34:1 and 8.04:1 — the same near-black every
 * other coloured fill in this app carries its label in, and for the same reason. It is declared once
 * on the card and inherited, so nothing inside has to remember; the countdown bar is the same tone
 * for the same reason, having been `ink/60` at 1.56:1 against the stop it was drawn on.
 *
 * That leaves the ✕ the same tone as the message beside it, and the hover is the `rotate-90` alone.
 * A resting tone that differs from the hover is what the muted ramp was buying, and there is no
 * darker tone to spend on it that keeps the glyph above 4.5:1 at both ends of the gradient.
 */
export function ToastCard({ message, isLeaving, raisedAt, onDismiss }: ToastCardProps) {
  // Read once, as this mounts. `Math.max` guards the one case that is not a clock: a message put
  // into the store directly, without `showToast`, carries no raise time at all.
  const [elapsedAtMount] = useState(() => Math.max(0, Date.now() - raisedAt));
  const exitElapsed = Math.max(0, elapsedAtMount - TOAST_DURATION_MS);

  return (
    <div
      inert={isLeaving}
      // The exit's duration comes from the same constant the store's second timer is set from, for
      // the reason the countdown below carries its own: `animate-toast-out` declares none. Both
      // animations take a negative delay instead of starting where the mount happens to fall.
      style={{
        animationDelay: `${-(isLeaving ? exitElapsed : elapsedAtMount)}ms`,
        ...(isLeaving ? { animationDuration: `${TOAST_EXIT_MS}ms` } : {}),
      }}
      className={`${isLeaving ? 'animate-toast-out' : 'animate-toast-in'} pointer-events-auto relative flex items-center gap-3 overflow-hidden rounded-2xl border border-accent-soft/40 bg-gradient-to-r from-accent-strong to-accent px-5 py-3 text-foundry-950 shadow-2xl ring-1 ring-accent-soft/20 backdrop-blur-xl`}
    >
      <span className="text-xs font-semibold">{message}</span>
      {/*
        No guidance card, deliberately. This surface is on a three-second timer and goes `inert`
        for the fade, so a card hung off it would be anchored to something that is leaving before
        anyone finished reading — and it would have to open *upwards* over the page from the
        bottom-right corner. There is also nothing to explain: the ✕ on a notification dismisses
        the notification, and the `aria-label` says so.
      */}
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="transition-all duration-390 hover:rotate-90"
      >
        <span aria-hidden="true">✕</span>
      </button>

      {/*
        The time left, as a bar. Its duration comes from the constant the store's timer is set
        from — the animation token deliberately declares none — so the two cannot disagree about
        when this disappears. Its delay is the same offset the card's entrance takes, so the two
        cannot disagree about when it started either.
      */}
      <span
        aria-hidden="true"
        style={{
          animationDuration: `${TOAST_DURATION_MS}ms`,
          animationDelay: `${-elapsedAtMount}ms`,
        }}
        className="animate-toast-timer absolute inset-x-0 bottom-0 h-0.5 origin-left bg-foundry-950/60"
      />
    </div>
  );
}
