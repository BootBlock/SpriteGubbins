import { useId } from 'react';
import { Tooltip } from './Tooltip.tsx';

interface NumberFieldProps {
  readonly label: string;
  readonly tooltip: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** When set, the reason the value is not yours to set — shown in place of nothing at all. */
  readonly disabledReason: string;
  readonly onChange: (value: number) => void;
}

/**
 * A labelled numeric setting.
 *
 * Separate from `TextField` because the value it carries is a number, and a shared component would
 * have to hold a `string | number` and hand the parsing back to every caller.
 *
 * A partially-typed, empty or out-of-range entry is **ignored rather than committed**: the field is
 * bound to the stored number, so an unusable keystroke simply does not move it. Committing `NaN`
 * would put `NaN°` in the prompt, and clamping silently would tell the user their `120` was accepted
 * when it became `90`.
 *
 * The empty string is checked explicitly, before `Number` sees it. `Number('')` is `0`, which is
 * finite and inside most ranges, so a user who selects all and deletes on the way to retyping would
 * otherwise have committed a real `0` — and if they clicked away at that moment, silently kept it.
 *
 * **`step` is a check here, not a hint**, and that is the half the platform does not give you: a
 * `type="number"` input reports a value off its own step grid as *invalid* and still hands it over
 * verbatim, so a field declaring `step={1}` used to commit a typed `20.5`. Every call site in the
 * app declares a step of 1, and each wanted a whole number for a reason of its own — a count of
 * components, a degree of camera elevation, the side of a cell that becomes an `ImageData` — and the
 * component budget had grown its own `Number.isInteger` guard while the rest had not. A guard per
 * call site is a check three of four callers forget; one here is what makes the prop mean what it
 * says. The comparison is taken against `min` rather than
 * against zero, because a grid may be offset, and it carries a tolerance because binary floating
 * point cannot represent every step exactly.
 *
 * `disabledReason` is a string for the reason `CheckboxField` gives: a greyed-out control says
 * nothing about why. The camera elevation is fixed by six of the seven projections and free under
 * the seventh, so *which* setting has taken the number over is the whole of what a reader needs.
 */
/**
 * Whether a value sits on the field's own step grid, counting from `min`.
 *
 * The tolerance is relative to the step, so it holds for a step far from 1 as well: at `step` 0.1,
 * `(0.3 - 0) / 0.1` comes to 2.9999999999999996 in binary floating point, and rounding that to 3
 * before comparing is what stops a value the reader typed exactly being refused.
 */
function onStep(value: number, min: number, step: number): boolean {
  if (step <= 0) return true;
  const steps = (value - min) / step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

export function NumberField({
  label,
  tooltip,
  value,
  min,
  max,
  step,
  disabledReason,
  onChange,
}: NumberFieldProps) {
  const inputId = useId();
  const reasonId = useId();
  const isDisabled = disabledReason !== '';

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <label
          htmlFor={inputId}
          className={`text-xs font-semibold ${isDisabled ? 'text-ink-faint' : 'text-ink-muted'}`}
        >
          {label}
        </label>
        <Tooltip text={tooltip} hint={label} />
      </div>

      <input
        id={inputId}
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        // `aria-disabled` rather than `disabled`, as `CheckboxField` does and for the same reason:
        // the control keeps its place in the tab order, so a keyboard user reaches it and hears why
        // it is unavailable rather than skipping over a value the prompt still carries.
        //
        // `readOnly` is what actually refuses the input, and it is available here where the
        // checkbox had to refuse in its own handler: the attribute does nothing on a checkbox and
        // everything on a text or number field, blocking typing, the spinner, paste and autofill
        // alike. So there is no guard below — the platform holds this one.
        aria-disabled={isDisabled}
        aria-describedby={isDisabled ? reasonId : undefined}
        readOnly={isDisabled}
        onChange={(event) => {
          const entered = event.target.value.trim();
          if (entered === '') return;
          const parsed = Number(entered);
          if (Number.isFinite(parsed) && parsed >= min && parsed <= max && onStep(parsed, min, step)) {
            onChange(parsed);
          }
        }}
        className="w-full rounded-xl border border-foundry-600 bg-foundry-950/80 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors duration-390 hover:border-accent/40 focus:border-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      />

      {isDisabled && (
        <p id={reasonId} className="mt-1 text-xs text-ink-faint">
          {disabledReason}
        </p>
      )}
    </div>
  );
}
