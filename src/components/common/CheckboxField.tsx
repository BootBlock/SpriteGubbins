import { useId } from 'react';
import { Tooltip } from './Tooltip.tsx';

interface CheckboxFieldProps {
  readonly label: string;
  readonly tooltip: string;
  readonly checked: boolean;
  /** When set, the reason the option is unavailable — shown in place of nothing at all. */
  readonly disabledReason: string;
  readonly onChange: (checked: boolean) => void;
}

/**
 * A labelled on/off setting.
 *
 * `disabledReason` is a string rather than a boolean because a control that is simply greyed out
 * tells the user nothing about why. Both options this carries — the component map and the
 * adherence report — are unavailable on most targets, and *which* capability the target is missing
 * is the part worth saying: a string lets the caller name it, where a boolean could only hide the
 * control and leave the user guessing.
 */
export function CheckboxField({ label, tooltip, checked, disabledReason, onChange }: CheckboxFieldProps) {
  const inputId = useId();
  const reasonId = useId();
  const isDisabled = disabledReason !== '';

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          // `aria-disabled` rather than `disabled`, so the control keeps its place in the tab order
          // and a keyboard user can reach it and hear *why* it is unavailable. A `disabled` input is
          // skipped entirely, which would hide the explanation from the people who most need it.
          aria-disabled={isDisabled}
          aria-describedby={isDisabled ? reasonId : undefined}
          onChange={(event) => {
            // Honoured here rather than by the DOM, since `aria-disabled` does not block input.
            if (isDisabled) return;
            onChange(event.target.checked);
          }}
          className="size-4 shrink-0 rounded border-foundry-600 bg-foundry-950 accent-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        />
        <label
          htmlFor={inputId}
          className={`text-xs font-semibold ${isDisabled ? 'text-ink-faint' : 'text-ink-muted'}`}
        >
          {label}
        </label>
        <Tooltip text={tooltip} hint={label} />
      </div>

      {isDisabled && (
        <p id={reasonId} className="mt-1 ml-6 text-xs text-ink-faint">
          {disabledReason}
        </p>
      )}
    </div>
  );
}
