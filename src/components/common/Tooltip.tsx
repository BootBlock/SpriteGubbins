import { useEffect, useId, useRef, useState } from 'react';
import { useAnchoredSurface } from '../../hooks/useAnchoredSurface.ts';
import { TooltipCard } from './TooltipCard.tsx';

interface TooltipProps {
  /** The guidance itself — what this control does and how it changes the prompt. */
  readonly text: string;
  /** A short heading naming the thing being explained. */
  readonly hint: string;
}

/**
 * The ⓘ affordance beside a control, and the glass card it reveals.
 *
 * Shows on hover, on focus, and on a tap. The original application bound only the mouse events,
 * which meant every piece of field guidance in the app — the thing that explains what
 * `CORE_DIRECTIONAL_VARIANTS` actually does — was unreachable without a pointer. The trigger is a
 * real `<button>` with an accessible name, and the card is `role="tooltip"` wired to it through
 * `aria-describedby` while showing, so the guidance is announced as a description of the trigger
 * rather than as loose text somewhere on the page.
 *
 * **Hover, focus and dismissal are three separate facts, and collapsing them breaks 1.4.13.** With
 * one boolean, any handler that closed the card closed it against the other two: unhovering while
 * the ⓘ still had focus hid guidance whose focus trigger had never been removed, and a press on the
 * card blurred the trigger and took the card out from under the finger that touched it. So the card
 * shows while *either* input is live, and Escape is a latch that outranks both — cleared the next
 * time a hover or a focus arrives, which is what lets it come back.
 *
 * **Dismissible** works from anywhere on the page, not only while the ⓘ has focus — a user who
 * reached the card by hovering is never in that state. One caveat worth knowing: inside the atlas
 * calculator the card lives in an open `<dialog>`, and Escape there is the platform's own close
 * watcher, so it takes the modal with it. Measured in Chromium: neither `preventDefault()`,
 * `stopImmediatePropagation()` nor an `auto` popover suppresses that, so it is the platform's to
 * fix, not this component's.
 *
 * **Hoverable**: the pointer can travel onto the card and read it, because the hover is tracked on
 * the wrapper that contains both. A *press* anywhere but the ⓘ dismisses, which is the deliberate
 * trade for the card sitting over the field it explains — hovering must keep it (1.4.13 says so),
 * but clicking the control underneath has to stay possible, and that costs the guidance rather than
 * the click. **Persistent**: nothing here is on a timer.
 *
 * **The card floats in the top layer**, because guidance half-covered by the next panel down is
 * guidance nobody can read, and that is not a `z-index` problem; {@link useAnchoredSurface} explains
 * why, makes the above/below call, and publishes it as `data-placement` for the caret.
 */
export function Tooltip({ text, hint }: TooltipProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  const isVisible = (isHovered || isFocused) && !isDismissed;
  useAnchoredSurface(triggerRef, cardRef, isVisible, 'centred');

  /** Either way in also clears a previous dismissal, or Escape would be permanent. */
  function reveal(input: 'hover' | 'focus'): void {
    if (input === 'hover') setIsHovered(true);
    else setIsFocused(true);
    setIsDismissed(false);
  }

  useEffect(() => {
    if (!isVisible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsDismissed(true);
    };
    // Any press that is not on the ⓘ itself. Outside the wrapper it is plainly a dismissal; *on the
    // card* it is the click the user meant for the control the card is covering, and standing aside
    // is the only way that control stays reachable by pointer at all.
    const onPointerDown = (event: PointerEvent) => {
      const trigger = triggerRef.current;
      const onTrigger = trigger !== null && event.target instanceof Node && trigger.contains(event.target);
      if (!onTrigger) setIsDismissed(true);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [isVisible]);

  return (
    <span
      ref={wrapperRef}
      // The hover lives here rather than on the button, and that is what makes the card hoverable:
      // the card is a DOM child of this span however far the top layer moves it on screen, so a
      // pointer travelling from the ⓘ onto the guidance never leaves this element and `mouseleave`
      // never fires. On the button it fired the moment the pointer set off, and the card the user
      // was reaching for vanished under them.
      onMouseEnter={() => {
        reveal('hover');
      }}
      onMouseLeave={() => {
        setIsHovered(false);
      }}
      className="relative inline-flex items-center"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Guidance: ${hint}`}
        // Described-by, never `aria-expanded`: this is the tooltip pattern, and a disclosure
        // attribute on top of `role="tooltip"` would announce a widget the card is not.
        aria-describedby={isVisible ? tooltipId : undefined}
        onFocus={() => {
          reveal('focus');
        }}
        onBlur={() => {
          setIsFocused(false);
        }}
        onPointerDown={(event) => {
          // Touch only: a mouse is served by the hover, and toggling on its press would read as
          // "clicking the ⓘ closes it", since the synthesised hover has already opened the card.
          // A tap is the only way in on a touchscreen — no cursor appears to hint the ⓘ does
          // anything — and reading the current state is what makes the second tap close it: at
          // `pointerdown` on the first tap neither hover nor focus has arrived yet.
          if (event.pointerType !== 'touch') return;
          if (isVisible) setIsDismissed(true);
          else reveal('focus');
        }}
        className={`flex size-4 cursor-help items-center justify-center rounded-full border font-mono text-2xs leading-none font-bold transition-all duration-300 hover:scale-110 ${
          isVisible
            ? 'border-accent bg-accent/25 text-accent-soft ring-2 ring-accent/20'
            : 'border-foundry-600 bg-foundry-950/60 text-ink-faint hover:border-accent hover:text-accent-soft'
        }`}
      >
        <span aria-hidden="true">i</span>
      </button>

      {isVisible && <TooltipCard id={tooltipId} cardRef={cardRef} hint={hint} text={text} />}
    </span>
  );
}
