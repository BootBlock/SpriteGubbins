import { useRef } from 'react';
import { useTooltipReveal } from '../../hooks/useTooltipReveal.ts';
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
 * **This is the form a *setting* takes, and it is deliberately the narrower of the two.** A field
 * whose value reaches the compiled prompt is worth an affordance the reader can see before they need
 * it, and worth a tap target on a touchscreen. Everything else — the actions, the navigation, the
 * library and history controls — takes {@link ControlTooltip}, which hangs the same card off the
 * control itself rather than putting a second glyph beside every button in the app.
 *
 * When the card is showing, and where it sits, is {@link useTooltipReveal}'s: the two triggers share
 * one state machine so *dismissible*, *hoverable* and *persistent* cannot drift apart. What stays
 * here is the one rule that belongs to this trigger alone — a press on the ⓘ toggles rather than
 * dismisses, because the ⓘ has no other job and a tap is a touchscreen's only way in.
 *
 * **Hoverable**: the pointer can travel onto the card and read it, because the hover is tracked on
 * the wrapper that contains both. A *press* anywhere but the ⓘ dismisses, which is the deliberate
 * trade for the card sitting over the field it explains — hovering must keep it (1.4.13 says so),
 * but clicking the control underneath has to stay possible, and that costs the guidance rather than
 * the click. **Persistent**: nothing here is on a timer.
 */
export function Tooltip({ text, hint }: TooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  // Anchored to the ⓘ itself rather than to the wrapper around it. The two boxes are all but
  // identical, and the button is the thing the caret has to point at.
  const guidance = useTooltipReveal(triggerRef, triggerRef);

  return (
    <span
      ref={wrapperRef}
      // The hover lives here rather than on the button, and that is what makes the card hoverable:
      // the card is a DOM child of this span however far the top layer moves it on screen, so a
      // pointer travelling from the ⓘ onto the guidance never leaves this element and `mouseleave`
      // never fires. On the button it fired the moment the pointer set off, and the card the user
      // was reaching for vanished under them.
      onMouseEnter={() => {
        guidance.reveal('hover');
      }}
      onMouseLeave={() => {
        guidance.release('hover');
      }}
      className="relative inline-flex items-center"
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Guidance: ${hint}`}
        // Described-by, never `aria-expanded`: this is the tooltip pattern, and a disclosure
        // attribute on top of `role="tooltip"` would announce a widget the card is not.
        aria-describedby={guidance.isVisible ? guidance.cardId : undefined}
        onFocus={() => {
          guidance.reveal('focus');
        }}
        onBlur={() => {
          guidance.release('focus');
        }}
        onPointerDown={(event) => {
          // Touch only: a mouse is served by the hover, and toggling on its press would read as
          // "clicking the ⓘ closes it", since the synthesised hover has already opened the card.
          // A tap is the only way in on a touchscreen — no cursor appears to hint the ⓘ does
          // anything — and reading the current state is what makes the second tap close it: at
          // `pointerdown` on the first tap neither hover nor focus has arrived yet.
          if (event.pointerType !== 'touch') return;
          if (guidance.isVisible) guidance.dismiss();
          else guidance.reveal('focus');
        }}
        className={`flex size-4 cursor-help items-center justify-center rounded-full border font-mono text-2xs leading-none font-bold transition-all duration-390 hover:scale-110 ${
          guidance.isVisible
            ? 'border-accent bg-accent/25 text-accent-soft ring-2 ring-accent/20'
            : 'border-foundry-600 bg-foundry-950/60 text-ink-faint hover:border-accent hover:text-accent-soft'
        }`}
      >
        <span aria-hidden="true">i</span>
      </button>

      {guidance.isVisible && (
        <TooltipCard id={guidance.cardId} cardRef={guidance.cardRef} hint={hint} text={text} />
      )}
    </span>
  );
}
