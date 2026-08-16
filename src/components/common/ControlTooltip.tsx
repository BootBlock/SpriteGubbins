import { cloneElement, useRef } from 'react';
import type { ReactElement } from 'react';
import { TOOLTIP_HOVER_DELAY_MS } from '../../constants/ui.ts';
import { useTooltipReveal } from '../../hooks/useTooltipReveal.ts';
import { TooltipCard } from './TooltipCard.tsx';

interface ControlTooltipProps {
  /** A short heading naming the control being explained — normally its own visible label. */
  readonly hint: string;
  /** The guidance itself: what the control does, what it changes, and why anyone would want it. */
  readonly text: string;
  /**
   * The wrapper's **layout** classes, replacing the default `relative inline-flex` entirely. (The
   * component adds one class of its own on top, for the disabled case below; it touches neither
   * `display` nor `position`, so the two cannot collide.)
   *
   * The wrapper takes the control's place in its parent's flex or grid, so anything the control was
   * saying about *its own box in that layout* — `ml-auto`, `flex-1`, filling a grid cell, an
   * absolute placement — has to move out here with it. **A replacement rather than an addition**,
   * because two `display` or two `position` utilities on one element do not resolve by the order
   * they are written in the string: they resolve by where the utilities land in the generated
   * stylesheet, which no call site can see, so adding one beside the default would be a coin toss.
   *
   * Whatever is passed has to establish a containing block — `relative` at most call sites, and
   * `absolute` at the two that place the control themselves (the preset search field's clear
   * button, and the quantiser's wipe divider). The card is positioned inside this wrapper the ordinary way and only
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
 * **The line between this and {@link Tooltip} is what a control *is*, not how much room is left.**
 * Anything holding a **value** — a field, a select, a checkbox, a search box, a name box — takes the
 * ⓘ, because that is what the affordance has marked since the app was built, because a value is
 * worth explaining before the reader knows to ask, and because an ⓘ is the only route a finger has.
 * Anything that **does** something takes this: the chrome's actions, the view switcher, the prompt
 * toolbar, the preset library, the history drawer, the quantiser's buttons. There are around fifty
 * of those, and a second glyph beside each would be fifty more targets in rows that are already
 * full — while hovering a control is what a tooltip has always meant.
 *
 * That line is also what makes the focus rule below sound, which is why it is worth stating as a
 * rule rather than as a habit: `:focus-visible` cannot answer "did the keyboard bring me here" for a
 * text field — the selector matches whenever such a field is focused, by any means — so a value box
 * wrapped in this would open its card on a click and hold it there, and `PresetDetailsForm`'s name box,
 * which is focused the moment it appears, would open one unasked.
 *
 * The state machine is {@link useTooltipReveal}'s, shared with the ⓘ so WCAG 1.4.13's *dismissible*,
 * *hoverable* and *persistent* are settled in one place. One rule belongs to this trigger alone, and
 * it comes from the control having a job of its own: **a press dismisses.** The ⓘ toggles on a press
 * because it does nothing else; this control is the thing the press was meant for, so the guidance
 * stands aside rather than sitting under the pointer describing a button already used. The dismissal
 * is a latch, so it returns on the next fresh hover — moving away and back — and not before.
 *
 * **The hover waits, and the ⓘ's does not** — {@link TOOLTIP_HOVER_DELAY_MS} says why. It follows
 * from the same distinction as the press rule: this trigger is a control someone may simply be
 * travelling across on the way to another, and answering that journey on contact put a paragraph
 * over the control they were reaching for. Keyboard focus keeps revealing at once, because tabbing
 * to a control is an arrival rather than a traverse.
 *
 * **What this cannot do is reach a touchscreen**, and that is inherent rather than an oversight: a
 * tap on a control runs the control. It is the second reason a value keeps its ⓘ. Here the
 * compensation is `aria-describedby`, which a screen reader announces on focus however the pointer
 * situation stands.
 *
 * **A `disabled` control dispatches no pointer events and cannot be focused**, so a card hung off
 * one would be unreachable by either route — and seven of these wrap a control that can be disabled,
 * two of which explain the very condition that disables them. The wrapper therefore takes the
 * pointer events back off a disabled child, which restores the hover; nothing restores the keyboard
 * route, because `disabled` removes the element from the tab order and that is the platform's call
 * rather than this component's.
 */
export function ControlTooltip({
  hint,
  text,
  className = 'relative inline-flex',
  children,
}: ControlTooltipProps) {
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const guidance = useTooltipReveal(wrapperRef, { hoverDelayMs: TOOLTIP_HOVER_DELAY_MS });

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
        // holding it there for as long as it kept focus. It also catches the programmatic focus a
        // press hands on, as `PresetCard` does when it closes its rename editor.
        //
        // `:focus-visible` is the platform's own answer to "did this focus come from the keyboard".
        // It answers it for a control and **not** for a value box — the selector matches a text
        // field however that field was focused — which is the rule the doc above states, and the
        // reason a value box takes the ⓘ instead of arriving here.
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
      // A `disabled` child dispatches no pointer events at all — not to itself and not on to an
      // ancestor — so the wrapper never hears the hover that is the only remaining way to its
      // guidance, and two of the seven disabled-capable controls explain the very condition that
      // disables them. Taking the pointer events off the child hands them to this span, which is
      // where the handlers live; a disabled control has no click to lose by it.
      className={`[&>*:disabled]:pointer-events-none ${className}`}
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
