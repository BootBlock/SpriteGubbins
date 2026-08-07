import { useId } from 'react';
import { Tooltip } from './Tooltip.tsx';

interface SelectChoice<T extends string | number> {
  readonly value: T;
  readonly label: string;
}

interface SelectFieldProps<T extends string | number> {
  readonly label: string;
  readonly tooltip: string;
  readonly value: T;
  readonly choices: readonly SelectChoice<T>[];
  readonly onChange: (value: T) => void;
}

/**
 * A labelled dropdown over a closed set of choices.
 *
 * Eleven controls in this app are exactly this — the seven output settings, the category, the target
 * model, and the atlas calculator's two — so it is one component rather than eleven copies of the
 * same label, tooltip and `<select>` markup.
 *
 * A native `<select>` on purpose. It is keyboard-operable, type-to-select, and renders as the
 * platform's own picker on touch devices; `ComboBox` exists for the fields where free text is
 * allowed, and these are not those.
 *
 * The change handler resolves the chosen option back to its own value rather than casting the DOM's
 * string. Every one of these values is an identifier the prompt compiler reads, so widening it with
 * `as T` would put the one place they can go wrong outside the compiler's reach.
 */
export function SelectField<T extends string | number>({
  label,
  tooltip,
  value,
  choices,
  onChange,
}: SelectFieldProps<T>) {
  const selectId = useId();

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <label htmlFor={selectId} className="text-xs font-semibold text-ink-muted">
          {label}
        </label>
        <Tooltip text={tooltip} hint={label} />
      </div>

      <select
        id={selectId}
        value={value}
        onChange={(event) => {
          const choice = choices.find((candidate) => String(candidate.value) === event.target.value);
          if (choice) onChange(choice.value);
        }}
        className="w-full rounded-xl border border-foundry-600 bg-foundry-950 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors focus:border-accent"
      >
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    </div>
  );
}
