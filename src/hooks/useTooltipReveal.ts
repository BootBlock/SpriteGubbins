import { useEffect, useId, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { useAnchoredSurface } from './useAnchoredSurface.ts';

/** Which of the two inputs a reveal or a release is about. */
export type TooltipInput = 'hover' | 'focus';

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
 */
export function useTooltipReveal(
  /** The element the card is positioned against — in both components, the wrapper holding both. */
  anchorRef: RefObject<HTMLElement | null>,
  /**
   * A press inside this element does **not** dismiss, where one is given.
   *
   * The ⓘ is the only control in the app with no job but revealing its own card, so a press on it is
   * never a press *past* the guidance — and toggling there is the one way a touchscreen has in.
   * Every other trigger is a control the press is meant for, so the press dismisses and the guidance
   * gets out of the way of the thing the user actually pressed.
   */
  pressKeepsOpenRef?: RefObject<HTMLElement | null>,
): TooltipReveal {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const cardRef = useRef<HTMLSpanElement>(null);
  const cardId = useId();

  const isVisible = (isHovered || isFocused) && !isDismissed;
  useAnchoredSurface(anchorRef, cardRef, isVisible, 'centred');

  /** Either way in also clears a previous dismissal, or Escape would be permanent. */
  function reveal(input: TooltipInput): void {
    if (input === 'hover') setIsHovered(true);
    else setIsFocused(true);
    setIsDismissed(false);
  }

  function release(input: TooltipInput): void {
    if (input === 'hover') setIsHovered(false);
    else setIsFocused(false);
  }

  function dismiss(): void {
    setIsDismissed(true);
  }

  useEffect(() => {
    if (!isVisible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDismissed(true);
    };
    // Any press the exempt element does not claim. Outside the wrapper it is plainly a dismissal;
    // *on the card* it is the click the user meant for whatever the card is covering, and standing
    // aside is the only way that thing stays reachable by pointer at all.
    const onPointerDown = (event: PointerEvent) => {
      const exempt = pressKeepsOpenRef?.current ?? null;
      const isExempt = exempt !== null && event.target instanceof Node && exempt.contains(event.target);
      if (!isExempt) setIsDismissed(true);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isVisible, pressKeepsOpenRef]);

  return { isVisible, cardId, cardRef, reveal, release, dismiss };
}
