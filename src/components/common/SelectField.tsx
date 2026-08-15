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
   * Optional because every other select in the app has nothing of the kind to say, and twenty-three
   * call sites passing a permanently-empty string would bury the one that does — while empty *is* still
   * accepted from the one that passes it, as `CheckboxField`'s reason is, so a caller resolving the
   * text can hand over what it found rather than choosing between a prop and no prop.
   */
  readonly description?: string;
  /**
   * When set, the reason the value is not yours to choose — shown in place of nothing at all, as
   * `NumberField` and `CheckboxField` both show theirs.
   *
   * Optional here where those two require it, for the reason `description` is: one of the app's
   * twenty-four selects has a setting above it that takes its value over, and the other
   * twenty-three passing a permanently-empty string would bury the one that does.
   */
  readonly disabledReason?: string;
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
  disabledReason,
  onChange,
}: SelectFieldProps<T>) {
  const selectId = useId();
  const descriptionId = useId();
  const reasonId = useId();
  const hasDescription = description !== undefined && description !== '';
  const isDisabled = disabledReason !== undefined && disabledReason !== '';
  // Both paragraphs where a control carries both, in the order they are rendered. A control with
  // neither has to describe itself with nothing at all rather than with an empty string, which a
  // screen reader announces as a description that failed to resolve.
  const describedBy = [hasDescription ? descriptionId : '', isDisabled ? reasonId : '']
    .filter((id) => id !== '')
    .join(' ');

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <label
          htmlFor={selectId}
          className={`text-xs font-semibold ${isDisabled ? 'text-ink-faint' : 'text-ink-muted'}`}
        >
          {label}
        </label>
        <Tooltip text={tooltip} hint={label} />
      </div>

      <select
        id={selectId}
        value={value}
        // Described-by rather than a paragraph merely sitting next to the control: the text changes
        // with the value, so a reader who cannot see the two together has no way to tell it is about
        // the option currently chosen. `CheckboxField` associates its own reason the same way, and
        // both descriptions are named here where a control carries the two at once.
        aria-describedby={describedBy === '' ? undefined : describedBy}
        // `aria-disabled` rather than `disabled`, as `NumberField` and `CheckboxField` do and for the
        // same reason: the control keeps its place in the tab order, so a keyboard user reaches it
        // and hears why it is unavailable rather than skipping past a value the prompt still carries.
        //
        // The handler is what actually refuses the change. `readOnly` does nothing on a `<select>`
        // — the attribute is defined for text-entry controls alone — so this is the checkbox's
        // situation rather than the number field's, and the guard below is the refusal.
        aria-disabled={isDisabled}
        onChange={(event) => {
          if (isDisabled) return;
          const choice = choices.find((candidate) => String(candidate.value) === event.target.value);
          if (choice) onChange(choice.value);
        }}
        className={`w-full rounded-xl border border-foundry-600 bg-foundry-950/80 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors duration-390 hover:border-accent/40 focus:border-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${isDisabled ? '' : 'cursor-pointer'}`}
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

      {isDisabled && (
        <p id={reasonId} className="mt-1 text-xs text-ink-faint">
          {disabledReason}
        </p>
      )}
    </div>
  );
}
