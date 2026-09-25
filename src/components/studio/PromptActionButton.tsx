import type { ReactNode } from 'react';

/**
 * Geometry and motion for the preview's secondary actions, so the set stays matched.
 *
 * One string rather than one per button: they sit side by side, so a difference between any two of
 * them reads as a mistake rather than as emphasis.
 *
 * The hover border is the view's colour, matching the chrome's own secondary pair and the primary
 * beside them: every button inside a panel answers to `--color-tab`, and one of them still lighting
 * up indigo would read as belonging to something else. The unavailable state is the app's disabled
 * treatment, as `SheetStepButtons` spells it — `text-ink-faint` with the hover colours put back
 * where they started — plus the hover lift this set has and that pair does not, all keyed to
 * `aria-disabled` rather than to `disabled`, for the reason {@link PromptActionButtonProps.unavailable}
 * gives.
 */
const PROMPT_ACTION =
  'group flex items-center gap-1.5 rounded-xl border border-foundry-600 bg-foundry-950 px-3 py-1.5 text-xs font-semibold text-ink-muted transition-all duration-390 hover:-translate-y-px hover:border-tab/50 hover:bg-foundry-700 hover:text-ink active:translate-y-0 aria-disabled:cursor-not-allowed aria-disabled:text-ink-faint aria-disabled:hover:translate-y-0 aria-disabled:hover:border-foundry-600 aria-disabled:hover:bg-foundry-950 aria-disabled:hover:text-ink-faint';

/** The glyph inside one of those, lifting with it — which is why each button is a `group`. */
const PROMPT_ACTION_ICON = 'inline-block transition-transform duration-585 group-hover:scale-125';

interface PromptActionButtonProps {
  /** The decorative glyph before the label, hidden from assistive technology. */
  readonly icon: string;
  /** Extra classes on the glyph — the JSON button's braces are set in the monospace face. */
  readonly iconClassName?: string;
  /** Extra classes on the button itself, such as an entrance animation. */
  readonly className?: string;
  /**
   * Marks the button unavailable through `aria-disabled`, which blocks nothing — the caller's
   * `onClick` refuses the press itself. Not `disabled`, because a button that goes unavailable as the
   * result of its own press would otherwise throw the keyboard focus back to the page and take its
   * guidance card, which says why, out of reach of the keyboard. `CheckboxField` settles the same.
   */
  readonly unavailable?: boolean;
  readonly onClick: () => void;
  /** Forwarded, because `ControlTooltip` hangs its guidance on the control through this. */
  readonly 'aria-describedby'?: string | undefined;
  /** The visible label, which is also the button's accessible name. */
  readonly children: ReactNode;
}

/**
 * One of the secondary buttons in the prompt preview's toolbar.
 *
 * A component rather than a shared class string, because the set is written in two files now —
 * `PromptActions` and the Copy, open & next button beside its Copy Prompt — and the glyph's markup
 * has to match as closely as the classes do.
 */
export function PromptActionButton({
  icon,
  iconClassName = '',
  className = '',
  unavailable = false,
  onClick,
  'aria-describedby': describedBy,
  children,
}: PromptActionButtonProps) {
  return (
    <button
      type="button"
      aria-disabled={unavailable}
      onClick={onClick}
      aria-describedby={describedBy}
      className={`${PROMPT_ACTION} ${className}`}
    >
      <span aria-hidden="true" className={`${PROMPT_ACTION_ICON} ${iconClassName}`}>
        {icon}
      </span>
      {children}
    </button>
  );
}
