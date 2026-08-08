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
  /**
   * What the *current* selection means, shown under the control and wired as its accessible
   * description.
   *
   * Orthogonal to `tooltip`, which explains the field and reads the same whatever is chosen: this is
   * for the one select whose options differ from each other in a way no single sentence can cover.
   * Optional because every other select in the app has nothing of the kind to say, and eighteen call
   * sites passing a permanently-empty string would bury the one that does — while empty *is* still
   * accepted from the one that passes it, as `CheckboxField`'s reason is, so a caller resolving the
   * text can hand over what it found rather than choosing between a prop and no prop.
   */
  readonly description?: string;
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
  description,
  onChange,
}: SelectFieldProps<T>) {
  const selectId = useId();
  const descriptionId = useId();
  const hasDescription = description !== undefined && description !== '';

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
        // Described-by rather than a paragraph merely sitting next to the control: the text changes
        // with the value, so a reader who cannot see the two together has no way to tell it is about
        // the option currently chosen. `CheckboxField` associates its own reason the same way.
        aria-describedby={hasDescription ? descriptionId : undefined}
        onChange={(event) => {
          const choice = choices.find((candidate) => String(candidate.value) === event.target.value);
          if (choice) onChange(choice.value);
        }}
        className="w-full cursor-pointer rounded-xl border border-foundry-600 bg-foundry-950/80 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors duration-300 hover:border-accent/40 focus:border-accent"
      >
        {choices.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>

      {hasDescription && (
        <p id={descriptionId} className="mt-2 text-xs leading-relaxed text-ink-muted">
          {description}
        </p>
      )}
    </div>
  );
}
