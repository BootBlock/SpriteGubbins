import { useId, useState } from 'react';

interface TooltipProps {
  /** The guidance itself — what this control does and how it changes the prompt. */
  readonly text: string;
  /** A short heading naming the thing being explained. */
  readonly hint: string;
}

/**
 * The ⓘ affordance beside a control, and the card it reveals.
 *
 * Shows on hover *and* on focus, and dismisses on Escape. The original application bound only the
 * mouse events, which meant every piece of field guidance in the app — the thing that explains what
 * `CORE_DIRECTIONAL_VARIANTS` actually does — was unreachable without a pointer.
 *
 * The trigger is a real `<button>` with an accessible name, and the card is `role="tooltip"` wired
 * to it through `aria-describedby` while it is showing, so the guidance is announced as a
 * description of the trigger rather than as loose text somewhere on the page.
 */
export function Tooltip({ text, hint }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex items-center">
      <button
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
        className="flex size-4 cursor-help items-center justify-center rounded-full border border-foundry-600 font-mono text-[11px] font-bold text-ink-faint transition-colors hover:border-accent hover:text-accent-soft"
      >
        <span aria-hidden="true">ⓘ</span>
      </button>

      {isVisible && (
        <span
          id={tooltipId}
          role="tooltip"
          // Not interactive and never focusable: pointer events are off so the card cannot swallow a
          // click meant for the control it is explaining.
          className="animate-fade-in pointer-events-none absolute bottom-6 left-1/2 z-50 w-64 -translate-x-1/2 rounded-xl border border-accent/60 bg-foundry-950 p-2.5 text-[11px] leading-relaxed shadow-2xl"
        >
          <span className="mb-0.5 block font-semibold text-accent-soft">{hint}</span>
          <span className="block font-sans text-ink-muted">{text}</span>
        </span>
      )}
    </span>
  );
}
