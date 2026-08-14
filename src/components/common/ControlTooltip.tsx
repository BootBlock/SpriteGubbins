import { cloneElement, useRef } from 'react';
import type { ReactElement } from 'react';
import { useTooltipReveal } from '../../hooks/useTooltipReveal.ts';
import { TooltipCard } from './TooltipCard.tsx';

interface ControlTooltipProps {
  /** A short heading naming the control being explained — normally its own visible label. */
  readonly hint: string;
  /** The guidance itself: what the control does, what it changes, and why anyone would want it. */
  readonly text: string;
  /**
   * The wrapper's own classes, replacing the default `relative inline-flex` entirely.
   *
   * The wrapper takes the control's place in its parent's flex or grid, so anything the control was
   * saying about *its own box in that layout* — `ml-auto`, `flex-1`, filling a grid cell, an
   * absolute placement — has to move out here with it. **A replacement rather than an addition**,
   * because two `display` or two `position` utilities on one element do not resolve by the order
   * they are written in the string: they resolve by where the utilities land in the generated
   * stylesheet, which no call site can see, so adding one beside the default would be a coin toss.
   *
   * Whatever is passed has to establish a containing block — `relative` in all but one call site,
   * `absolute` in the other. The card is positioned inside this wrapper the ordinary way and only
   * *then* lifted into the top layer, so a browser without the popover API falls back to those
   * offsets, and a static wrapper would resolve them against some arbitrary ancestor.
   */
  readonly className?: string;
  /**
   * The control itself, as a single element.
   *
   * Cloned rather than merely wrapped, for one prop: `aria-describedby`, so the guidance is
   * announced *as a description of the control* rather than as loose text somewhere on the page —
   * which is the whole of what a screen-reader user gets from a card they can never hover. Anything
   * this control already says with `aria-describedby` is replaced while the card is up, so a control
   * with its own description takes {@link Tooltip} and its ⓘ instead.
   */
  readonly children: ReactElement<{ 'aria-describedby'?: string | undefined }>;
}

/**
 * The glass guidance card, hung off a control rather than off an ⓘ beside it.
 *
 * **Every control in the app carries guidance; this is the form it takes where a ⓘ cannot go.** A
 * setting takes {@link Tooltip}, whose ⓘ sits beside the label and is worth the room because a value
 * that reaches the compiled prompt is worth explaining before the reader goes looking. Everything
 * else — the chrome's actions, the view switcher, the prompt toolbar, the preset library, the
 * history drawer, the quantiser's buttons — is a *control with a label of its own*, and a second
 * glyph beside each of them would be forty more things to look at in rows that are already full.
 * Hovering the control is what a tooltip has always meant, so that is the trigger, and the card is
 * the same card.
 *
 * The state machine is {@link useTooltipReveal}'s, shared with the ⓘ so WCAG 1.4.13's *dismissible*,
 * *hoverable* and *persistent* are settled in one place. Two rules belong to this trigger alone, and
 * both come from the control having a job of its own:
 *
 * - **A press dismisses.** The ⓘ toggles on a press because it does nothing else; this control is
 *   the thing the press was meant for, so the guidance stands aside the moment it is acted on rather
 *   than sitting under the pointer describing a button that has already been used. The dismissal is
 *   a latch, so it comes back on the next fresh hover — moving away and back — and not before.
 * - **Typing dismisses.** `input` bubbles, so a text field wrapped in this loses its card as soon as
 *   the user starts filling it in. Guidance is for before the act; a card hanging under a search box
 *   for as long as someone is typing into it is in the way of the results it covers.
 *
 * **What this cannot do is reach a touchscreen**, and that is inherent rather than an oversight: a
 * tap on a control runs the control. Where guidance is the point rather than an aid — a setting —
 * the ⓘ exists precisely because it can be tapped. Here the compensation is `aria-describedby`,
 * which is what a screen reader announces on focus whatever the pointer situation is.
 */
export function ControlTooltip({
  hint,
  text,
  className = 'relative inline-flex',
  children,
}: ControlTooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const guidance = useTooltipReveal(wrapperRef);

  return (
    <span
      ref={wrapperRef}
      // Both the anchor and the hover region, and it has to be both. The card is a DOM child of this
      // span however far the top layer moves it on screen, so a pointer travelling from the control
      // onto the guidance never leaves this element — which is 1.4.13 *hoverable*. Bound to the
      // control instead, the card would vanish the moment the user set off towards it.
      //
      // `focus`/`blur` here rather than on the control for the same reason they are events that
      // bubble in React: the control inside is what actually takes focus, and this hears it.
      onMouseEnter={() => {
        guidance.reveal('hover');
      }}
      onMouseLeave={() => {
        guidance.release('hover');
      }}
      onFocus={(event) => {
        // **Keyboard focus only, and this is load-bearing rather than a nicety.** A mouse press on a
        // control focuses it, and the focus lands *after* the `pointerdown` above — so an
        // unconditional reveal here would clear the dismissal that press just latched, and every
        // button in the app would answer a click by putting a paragraph of guidance under itself and
        // holding it there for as long as it kept focus. `:focus-visible` is the platform's own
        // answer to "did this focus come from the keyboard", which is exactly the question, and it
        // leaves the Tab route untouched.
        if (!event.target.matches(':focus-visible')) return;
        guidance.reveal('focus');
      }}
      onBlur={() => {
        guidance.release('focus');
      }}
      // The press is answered here rather than left to the hook's document listener, which only
      // exists while the card is up. A press that arrives in the same tick as the hover that
      // revealed it — an automated click, a very fast one — lands before React has committed that
      // reveal and registered the listener, so the card is missed and stays open over a control the
      // user has already used. Measured in Edge, driving the app; the handler here is in the flow
      // whatever order the two commits fall in. The document listener stays, for the press that
      // lands somewhere else entirely.
      onPointerDown={guidance.dismiss}
      onInput={guidance.dismiss}
      className={className}
    >
      {cloneElement(children, {
        'aria-describedby': guidance.isVisible ? guidance.cardId : undefined,
      })}

      {guidance.isVisible && (
        <TooltipCard id={guidance.cardId} cardRef={guidance.cardRef} hint={hint} text={text} />
      )}
    </span>
  );
}
