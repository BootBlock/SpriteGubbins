import { useId } from 'react';
import type { ReactNode } from 'react';
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
   * Optional because every other select in the app has nothing of the kind to say, and twenty-five
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
   * twenty-six selects has a setting above it that takes its value over, and the other
   * twenty-five passing a permanently-empty string would bury the one that does.
   */
  readonly disabledReason?: string;
  /**
   * A control rendered on the same row as the `<select>`, to the right of it.
   *
   * One select in the app has somewhere to *go* as well as something to choose — the target model,
   * whose generator has a site the reader is about to paste the prompt into — and a button for that
   * belongs beside the value it acts on rather than in the panel's corner.
   *
   * **It costs the select width, and that width is budgeted rather than absorbed.** A native
   * `<select>` truncates the tail of its selected option, so a row that quietly takes 48px off the
   * control is how the parenthetical marking the standard choice disappears at one viewport and not
   * another. `tests/selectLabelBudget.ts` derives what this row spends from the classes below, and
   * `tests/studio-column-width.test.ts` holds the studio's split to the wider column it now needs.
   */
  readonly action?: ReactNode;
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
  action,
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

      {/*
        The row the control and its action share. Always rendered, rather than only where an action
        was passed: a single-child flex row lays a `w-full` select out exactly as a bare one, so one
        path serves all twenty-six call sites and there is no second arrangement to keep in step.
      */}
      <div className="flex items-center gap-2">
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
          className={`w-full min-w-0 rounded-xl border border-foundry-600 bg-foundry-950/80 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors duration-390 hover:border-accent/40 focus:border-accent aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${isDisabled ? '' : 'cursor-pointer'}`}
        >
          {choices.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>

        {action}
      </div>

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
