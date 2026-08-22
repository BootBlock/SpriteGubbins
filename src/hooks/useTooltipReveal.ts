import { useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useAnchoredSurface } from './useAnchoredSurface.ts';

/**
 * Which of the two inputs a reveal or a release is about.
 *
 * Not exported: it is only ever written as a literal at a call site, and {@link TooltipReveal} is
 * the type a consumer actually names.
 */
type TooltipInput = 'hover' | 'focus';

/** What differs between the app's two triggers, both of which are otherwise this one machine. */
export interface TooltipRevealOptions {
  /**
   * A press inside this element does **not** dismiss, where one is given.
   *
   * The ⓘ is the only control in the app with no job but revealing its own card, so a press on it is
   * never a press *past* the guidance — and toggling there is the one way a touchscreen has in.
   * Every other trigger is a control the press is meant for, so the press dismisses and the guidance
   * gets out of the way of the thing the user actually pressed.
   */
  readonly pressKeepsOpenRef?: RefObject<HTMLElement | null>;
  /**
   * How long the pointer must stay before a **hover** reveals the card. Defaults to no wait.
   *
   * Hover only, and that asymmetry is the point rather than an omission: the wait exists because a
   * pointer crosses controls on its way elsewhere, and a keyboard has no equivalent — a tab landing
   * on a control is an arrival, not a traverse, so focus reveals at once. The same goes for the tap
   * the ⓘ answers, which reaches this hook as a focus.
   */
  readonly hoverDelayMs?: number;
}

/** Everything a component needs to put a `TooltipCard` on screen and take it off again. */
export interface TooltipReveal {
  readonly isVisible: boolean;
  /** The card's element id, which the described control points at while the card is up. */
  readonly cardId: string;
  readonly cardRef: RefObject<HTMLSpanElement | null>;
  readonly reveal: (input: TooltipInput) => void;
  readonly release: (input: TooltipInput) => void;
  readonly dismiss: () => void;
}

/**
 * When a piece of guidance is showing, and where its card sits — for both of the app's two triggers.
 *
 * `Tooltip` hangs its card off a 16px ⓘ; `ControlTooltip` hangs it off whatever control it wraps.
 * Those differ in what the user points at and in nothing else: the same three WCAG 1.4.13
 * obligations apply to both, and a second implementation of them is the copy where *dismissible*
 * quietly turns into "Escape works while the trigger has focus".
 *
 * **Hover, focus and dismissal are three separate facts, and collapsing them breaks 1.4.13.** With
 * one boolean, any handler that closed the card closed it against the other two: unhovering while
 * the trigger still had focus hid guidance whose focus trigger had never been removed, and a press
 * on the card blurred the trigger and took the card out from under the finger that touched it. So
 * the card shows while *either* input is live, and Escape is a latch that outranks both — cleared
 * the next time a hover or a focus arrives, which is what lets it come back.
 *
 * **Dismissible** works from anywhere on the page, not only while the trigger has focus — a user who
 * reached the card by hovering is never in that state. One caveat worth knowing: inside the atlas
 * calculator the card lives in an open `<dialog>`, and Escape there is the platform's own close
 * watcher, so it takes the modal with it. Measured in Chromium: neither `preventDefault()`,
 * `stopImmediatePropagation()` nor an `auto` popover suppresses that, so it is the platform's to
 * fix, not this hook's.
 *
 * **The card floats in the top layer**, because guidance half-covered by the next panel down is
 * guidance nobody can read, and that is not a `z-index` problem; {@link useAnchoredSurface} explains
 * why, makes the above/below call, and publishes it as `data-placement` for the caret.
 *
 * **A hover may be made to wait, and every way out of the wait has to cancel it.** A pending reveal
 * that survives the pointer leaving, or a press, is worse than no delay at all: it puts the card on
 * screen once the user has gone, or over the control they have just used — which is exactly what the
 * press-dismisses rule exists to prevent. So `release`, `dismiss` and unmount all clear the timer,
 * and the state only changes when it fires.
 */
export function useTooltipReveal(
  /**
   * The element the card is positioned against, and what its caret points at.
   *
   * The two components answer that differently, and both are right: `Tooltip` anchors to the ⓘ
   * itself, which is a 16px button beside a label, while `ControlTooltip` anchors to the wrapper it
   * puts round the control — that wrapper's box *is* the control's, and it is also where the hover
   * is tracked.
   */
  anchorRef: RefObject<HTMLElement | null>,
  { pressKeepsOpenRef, hoverDelayMs = 0 }: TooltipRevealOptions = {},
): TooltipReveal {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const cardRef = useRef<HTMLSpanElement>(null);
  /** The waiting hover, so that anything ending the hover can call it off. */
  const pendingHoverRef = useRef<number | null>(null);
  const cardId = useId();

  const isVisible = (isHovered || isFocused) && !isDismissed;
  useAnchoredSurface(anchorRef, cardRef, isVisible, 'centred');

  function cancelPendingHover(): void {
    if (pendingHoverRef.current === null) return;
    clearTimeout(pendingHoverRef.current);
    pendingHoverRef.current = null;
  }

  /**
   * Either way in also clears a previous dismissal, or Escape would be permanent — but only where
   * the input is genuinely arriving rather than being re-announced.
   *
   * **A reveal for an input already held is not the user asking again.** A card can be placed over
   * the control it explains — the placement clamps into the viewport, and in a window too short to
   * fit the card either side of its anchor that is where it lands — so dismissing it changes what
   * sits under the pointer, and the browser re-notifies the wrapper with a fresh `mouseenter` it
   * never left. Clearing the dismissal there put the guidance back one hover delay after Escape,
   * with the pointer never having moved: content dismissed and then undismissed without the user
   * doing anything, which is exactly what WCAG 1.4.13 *dismissible* forbids. Measured in the
   * quantiser's detached preview window, where the short viewport makes the overlap the ordinary
   * case rather than the awkward one.
   *
   * A genuine return is still a return, and needs no special case: the pointer leaving fires
   * `release`, so the input is no longer held and the next arrival clears the dismissal as before.
   */
  function show(input: TooltipInput): void {
    const wasHeld = input === 'hover' ? isHovered : isFocused;
    if (input === 'hover') setIsHovered(true);
    else setIsFocused(true);
    if (!wasHeld) setIsDismissed(false);
  }

  function reveal(input: TooltipInput): void {
    // Focus arrives at once whatever the delay: see `hoverDelayMs`. A zero delay takes this path
    // too, rather than scheduling a timer for the next tick — the ⓘ reveals within the same commit
    // as the event, which is what its own press-to-toggle reads the state for.
    if (input === 'focus' || hoverDelayMs === 0) {
      show(input);
      return;
    }
    // Re-entering before a previous wait elapsed restarts it rather than running two.
    cancelPendingHover();
    pendingHoverRef.current = window.setTimeout(() => {
      pendingHoverRef.current = null;
      show('hover');
    }, hoverDelayMs);
  }

  function release(input: TooltipInput): void {
    if (input === 'hover') {
      cancelPendingHover();
      setIsHovered(false);
    } else setIsFocused(false);
  }

  function dismiss(): void {
    // Before the state, because a press during the wait is the case this ordering is for: the card
    // must not arrive after the control it describes has already been used.
    cancelPendingHover();
    setIsDismissed(true);
  }

  // Written against the ref alone rather than calling `cancelPendingHover`, which is a fresh closure
  // on every render: naming it here would put it in the dependency list, and the effect would then
  // cancel a legitimately pending hover every time this component re-rendered.
  useEffect(() => {
    return () => {
      if (pendingHoverRef.current !== null) clearTimeout(pendingHoverRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    // **The document the trigger is actually in**, which is not always this module's `document`: the
    // quantiser's comparison panel can be portalled into a window of its own, and a press or an
    // Escape in that window is delivered to *its* document. Listening on the global one there leaves
    // the card with no way out at all — neither dismissible nor light-dismissed — which is the WCAG
    // 1.4.13 obligation this hook exists to hold. In the page the two are the same object.
    const reached = anchorRef.current?.ownerDocument ?? document;

    /**
     * The same dismissal `dismiss` performs, spelled again here because this effect cannot name it.
     *
     * **A dismissal that does not call off a pending hover is not a dismissal**, and with a card
     * already showing there is a way to have both: focus reveals at once, so a control reached by
     * Tab shows its guidance, and a pointer arriving on that same control then schedules a hover
     * behind the visible card. Escape hid it and the timer put it straight back — content dismissed
     * without a pointer or a keypress to bring it back, which is precisely what WCAG 1.4.13
     * *dismissible* forbids. Two spellings of "dismiss" where only one cancelled is what allowed it,
     * so both now do the same two things.
     *
     * Declared inside the effect, and touching only refs and the setter, so the dependency list
     * stays `[isVisible, pressKeepsOpenRef]` — naming the outer `dismiss` would re-register these
     * document listeners on every render.
     */
    const dismissAndCancelHover = () => {
      if (pendingHoverRef.current !== null) {
        clearTimeout(pendingHoverRef.current);
        pendingHoverRef.current = null;
      }
      setIsDismissed(true);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismissAndCancelHover();
    };
    // Any press the exempt element does not claim. Outside the wrapper it is plainly a dismissal;
    // *on the card* it is the click the user meant for whatever the card is covering, and standing
    // aside is the only way that thing stays reachable by pointer at all.
    const onPointerDown = (event: PointerEvent) => {
      const exempt = pressKeepsOpenRef?.current ?? null;
      const isExempt = exempt !== null && event.target instanceof Node && exempt.contains(event.target);
      if (!isExempt) dismissAndCancelHover();
    };

    reached.addEventListener('keydown', onKeyDown);
    reached.addEventListener('pointerdown', onPointerDown);
    return () => {
      reached.removeEventListener('keydown', onKeyDown);
      reached.removeEventListener('pointerdown', onPointerDown);
    };
  }, [anchorRef, isVisible, pressKeepsOpenRef]);

  return { isVisible, cardId, cardRef, reveal, release, dismiss };
}
