import { useId, useRef, useState } from 'react';
import { useAnchoredSurface } from '../../hooks/useAnchoredSurface.ts';

interface TooltipProps {
  /** The guidance itself — what this control does and how it changes the prompt. */
  readonly text: string;
  /** A short heading naming the thing being explained. */
  readonly hint: string;
}

/**
 * The ⓘ affordance beside a control, and the glass card it reveals.
 *
 * Shows on hover *and* on focus, and dismisses on Escape. The original application bound only the
 * mouse events, which meant every piece of field guidance in the app — the thing that explains what
 * `CORE_DIRECTIONAL_VARIANTS` actually does — was unreachable without a pointer.
 *
 * The trigger is a real `<button>` with an accessible name, and the card is `role="tooltip"` wired
 * to it through `aria-describedby` while it is showing, so the guidance is announced as a
 * description of the trigger rather than as loose text somewhere on the page.
 *
 * **The card is glass** (`glass-float`): it blurs and saturates the form behind it rather than
 * hiding it, which is what keeps a paragraph of guidance from feeling like a second window opening
 * over the studio. Everything decorative inside it — the caret, the accent rule — is
 * `aria-hidden`, because the card's whole text content *is* the trigger's accessible description
 * and a stray glyph would be read out as part of the explanation.
 *
 * **It opens downwards by preference, and flips above when the viewport leaves no room.** Every
 * trigger sits on a field's label row, so the space below it is the field itself and the rest of a
 * scrolling form — the natural direction, and one that costs nothing because the card takes no
 * pointer events and the control underneath stays fully operable while it is showing. What used to
 * rule out *ever* opening upwards was that the space above might be the top edge of a clipping
 * container — which is exactly where the atlas calculator puts its two selects — and that no longer
 * applies now the card is in the top layer, where nothing clips it. {@link useAnchoredSurface}
 * makes the call and says so in `data-placement`; the caret below reads it and turns round.
 *
 * **The card floats in the top layer.** Guidance that is half-covered by the next panel down — or
 * cut off at the edge of the atlas calculator's scrolling panel — is guidance nobody can read, and
 * neither of those is a `z-index` problem; {@link useAnchoredSurface} explains why.
 */
export function Tooltip({ text, hint }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cardRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  useAnchoredSurface(triggerRef, cardRef, isVisible, 'centred');

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        aria-label={`Guidance: ${hint}`}
        aria-describedby={isVisible ? tooltipId : undefined}
        onMouseEnter={() => {
          setIsVisible(true);
        }}
        onMouseLeave={() => {
          setIsVisible(false);
        }}
        onFocus={() => {
          setIsVisible(true);
        }}
        onBlur={() => {
          setIsVisible(false);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setIsVisible(false);
        }}
        className={`flex size-4 cursor-help items-center justify-center rounded-full border font-mono text-[10px] leading-none font-bold transition-all duration-200 hover:scale-110 ${
          isVisible
            ? 'border-accent bg-accent/25 text-accent-soft ring-2 ring-accent/20'
            : 'border-foundry-600 bg-foundry-950/60 text-ink-faint hover:border-accent hover:text-accent-soft'
        }`}
      >
        <span aria-hidden="true">i</span>
      </button>

      {isVisible && (
        <span
          id={tooltipId}
          ref={cardRef}
          role="tooltip"
          // Not interactive and never focusable: pointer events are off so the card cannot swallow a
          // click meant for the control it is explaining.
          //
          // Positioned against the trigger, as it always was; `useAnchoredSurface` lifts it into the
          // top layer and replaces those offsets with viewport coordinates where it can, leaving
          // `-translate-x-1/2` to centre the card on them either way.
          //
          // `overflow-visible` and `text-ink` earn their place in the lifted case only, against the
          // two user-agent popover declarations Tailwind's preflight does not already neutralise:
          // `overflow: auto`, which clips the caret hanging off the edge, and `color: CanvasText`,
          // which would take any child without a `text-*` of its own out of the palette.
          className="glass-float animate-tooltip-in group/card pointer-events-none absolute top-full left-1/2 z-50 mt-2.5 block w-72 -translate-x-1/2 origin-top overflow-visible rounded-xl p-3 text-[11px] leading-relaxed text-ink"
        >
          <span className="mb-1.5 flex items-center gap-2">
            {/* The accent tick that ties the card back to the trigger it belongs to. */}
            <span aria-hidden="true" className="h-3 w-0.5 shrink-0 rounded-full bg-accent-soft" />
            <span className="text-[10px] font-bold tracking-wide text-accent-soft uppercase">{hint}</span>
          </span>

          <span className="block font-sans text-ink-muted">{text}</span>

          {/*
            The caret, pointing back at the trigger. A rotated square carrying only the two edges
            that are actually outside the card, so the card's own hairline is not drawn straight
            through it — and deliberately *without* a backdrop filter of its own, since an element
            with `filter` (which the entrance animation gives the card) becomes a backdrop root for
            its descendants and a second blur here would sample the card rather than the page.

            It tracks the trigger rather than the card. `--caret-shift` is how far the hook had to
            pull the card back off an edge, so adding it here undoes that and leaves the caret over
            the thing being explained; it defaults to `0px`, which is every ordinary case and the
            whole of the un-lifted fallback. A further 180° is all `above` needs: the same two
            borders that were the outer edges at the top are the outer edges at the bottom.
          */}
          <span
            aria-hidden="true"
            className="absolute -top-1 left-[calc(50%_+_var(--caret-shift,0px))] size-2.5 -translate-x-1/2 rotate-45 rounded-xs border-t border-l border-accent/40 bg-foundry-900/80 group-data-[placement=above]/card:top-auto group-data-[placement=above]/card:-bottom-1 group-data-[placement=above]/card:rotate-[225deg]"
          />
        </span>
      )}
    </span>
  );
}
