import { useId } from 'react';
import { Tooltip } from './Tooltip.tsx';

interface NumberFieldProps {
  readonly label: string;
  readonly tooltip: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
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
 */
export function NumberField({ label, tooltip, value, min, max, step, onChange }: NumberFieldProps) {
  const inputId = useId();

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <label htmlFor={inputId} className="text-xs font-semibold text-ink-muted">
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
        onChange={(event) => {
          const entered = event.target.value.trim();
          if (entered === '') return;
          const parsed = Number(entered);
          if (Number.isFinite(parsed) && parsed >= min && parsed <= max) onChange(parsed);
        }}
        className="w-full rounded-xl border border-foundry-600 bg-foundry-950/80 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors duration-200 hover:border-accent/40 focus:border-accent"
      />
    </div>
  );
}
