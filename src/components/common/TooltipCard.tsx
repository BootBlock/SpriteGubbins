import type { RefObject } from 'react';

interface TooltipCardProps {
  readonly id: string;
  readonly cardRef: RefObject<HTMLSpanElement | null>;
  /** A short heading naming the thing being explained. */
  readonly hint: string;
  /** The guidance itself — what this control does and how it changes the prompt. */
  readonly text: string;
}

/**
 * The glass card a {@link Tooltip} reveals, and nothing about when it is revealed.
 *
 * **The card is glass** (`glass-float`): it blurs and saturates the form behind it rather than
 * hiding it, which is what keeps a paragraph of guidance from feeling like a second window opening
 * over the studio. Everything decorative inside it — the caret, the accent rule — is `aria-hidden`,
 * because the card's whole text content *is* the trigger's accessible description and a stray glyph
 * would be read out as part of the explanation.
 *
 * **It takes pointer events, and has to.** WCAG 1.4.13 requires content revealed on hover to be
 * *hoverable*: the pointer must be able to travel from the trigger onto the card and the card must
 * stay up, or guidance longer than a glance cannot be read at all. The cost is that the card opens
 * over the very field it explains, so it is now something a click can land on — which is why
 * `Tooltip` dismisses on a press anywhere but the ⓘ. Hovering keeps it, as the guideline requires;
 * pressing gives the control underneath back. Selecting the text to copy it is what that trades
 * away, and between the two, being able to click the field you are configuring wins.
 *
 * **It sets its own typography, because it inherits its trigger's otherwise.** The top layer changes
 * where a surface *paints*, not where it sits in the tree — the card is still a DOM descendant of
 * whatever row the ⓘ was put in — so every inheritable text property on any ancestor lands on the
 * guidance. Four were reaching it: the atlas calculator's metric labels are `uppercase tracking-wide`
 * inside a `font-mono` list, which rendered a paragraph of prose as WIDE-SET MONOSPACED CAPITALS, and
 * the quantiser's drop zone is `text-center`, which centred two more. None of that is a call site
 * doing anything wrong: a label is entitled to be shouty, and a card is a surface rather than a
 * continuation of the label it hangs off. So the reset belongs here, once, where the surface is
 * defined — the alternative is every ancestor in the app having to remember it carries guidance.
 */
export function TooltipCard({ id, cardRef, hint, text }: TooltipCardProps) {
  return (
    <span
      id={id}
      ref={cardRef}
      role="tooltip"
      // Positioned against the trigger, as it always was; `useAnchoredSurface` lifts it into the top
      // layer and replaces those offsets with viewport coordinates where it can, leaving
      // `-translate-x-1/2` to centre the card on them either way.
      //
      // `overflow-visible` and `text-ink` earn their place in the lifted case only, against the two
      // user-agent popover declarations Tailwind's preflight does not already neutralise:
      // `overflow: auto`, which clips the caret hanging off the edge, and `color: CanvasText`, which
      // would take any child without a `text-*` of its own out of the palette.
      //
      // `font-sans normal-case tracking-normal text-left` are the reset the docblock argues for —
      // the four inheritable text properties an ancestor can reach the guidance through. The hint
      // below re-states `uppercase tracking-wide` on itself, so it keeps the eyebrow treatment it
      // has always had rather than being caught by its own card's reset.
      className="glass-float animate-tooltip-in group/card absolute top-full left-1/2 z-50 mt-2.5 block w-72 -translate-x-1/2 origin-top overflow-visible rounded-xl p-3 text-left font-sans text-xs leading-relaxed tracking-normal normal-case text-ink"
    >
      <span className="mb-1.5 flex items-center gap-2">
        {/* The accent tick that ties the card back to the trigger it belongs to. */}
        <span aria-hidden="true" className="h-3 w-0.5 shrink-0 rounded-full bg-accent-soft" />
        <span className="text-2xs font-bold tracking-wide text-accent-soft uppercase">{hint}</span>
      </span>

      <span className="block text-ink-muted">{text}</span>

      {/*
        The caret, pointing back at the trigger. A rotated square carrying only the two edges that
        are actually outside the card, so the card's own hairline is not drawn straight through it —
        and deliberately *without* a backdrop filter of its own, since an element with `filter`
        (which the entrance animation gives the card) becomes a backdrop root for its descendants and
        a second blur here would sample the card rather than the page.

        It tracks the trigger rather than the card. `--caret-shift` is how far the hook had to pull
        the card back off an edge, so adding it here undoes that and leaves the caret over the thing
        being explained; it defaults to `0px`, which is every ordinary case and the whole of the
        un-lifted fallback. A further 180° is all `above` needs: the same two borders that were the
        outer edges at the top are the outer edges at the bottom.
      */}
      <span
        aria-hidden="true"
        className="absolute -top-1 left-[calc(50%_+_var(--caret-shift,0px))] size-2.5 -translate-x-1/2 rotate-45 rounded-xs border-t border-l border-accent/40 bg-foundry-900/80 group-data-[placement=above]/card:top-auto group-data-[placement=above]/card:-bottom-1 group-data-[placement=above]/card:rotate-[225deg]"
      />
    </span>
  );
}
