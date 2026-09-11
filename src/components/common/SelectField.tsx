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
   * What this control is doing *right now* — which is usually what the current selection means, and
   * once what the list is missing — shown under the control and wired as its accessible description.
   *
   * Orthogonal to `tooltip`, which explains the field and reads the same whatever is chosen. Six of
   * the seven call sites are selects whose options differ from each other in a way no single
   * sentence can cover — the palette, the render style, the art style reference, the system profile,
   * the target generator and the sheet contents. Each of those has a table behind it holding a
   * different account of what some of its options mean, and this is where the row for the chosen one
   * is read out.
   *
   * **The seventh is the rig mode, and it reads the other way.** Its options need no per-option
   * account, but its *list* narrows: sheet contents that deliver a sheet drawing each moving part
   * once per position it takes do not offer the cut-out rig, because that rig's first rule is that
   * no piece commits to a position. An option that disappears with no explanation reads as a control
   * that failed to render, so the sentence naming the sheet that withdrew it goes here — where a
   * screen reader announces it with the control, rather than in a paragraph beside it.
   *
   * Optional because the other twenty-four have nothing of either kind to say, and twenty-four
   * call sites passing a permanently-empty string would bury the seven that do — while empty *is*
   * still accepted from those seven, as `CheckboxField`'s reason is, so a caller resolving the text
   * out of its table can hand over what it found rather than choosing between a prop and no prop.
   * Five of the seven need that in earnest — four whose tables are keyed on something the select can
   * hold and the table has no row for, and the rig mode, whose sentence applies to some sheets and
   * not others — and the other two never take it up: the target generator's is a guard over a miss
   * its own call site records as unreachable, and the sheet contents' table has a row for every mode
   * a category can offer, because both are keyed on the same closed union.
   */
  readonly description?: string;
  /**
   * When set, the reason the value is not yours to choose — shown in place of nothing at all, as
   * `NumberField` and `CheckboxField` both show theirs.
   *
   * Optional here where those two require it, for the reason `description` is: one of the app's
   * thirty-one selects — the rig mode — has a setting above it that takes its value over, and the other
   * thirty passing a permanently-empty string would bury the one that does. It is the same
   * select that carries the seventh `description`, and the two say different things: this one is the
   * sheet taking the choice over, that one the sheet withdrawing an option from a choice the reader
   * still has.
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
   * another. `tests/columnSplit.ts` derives what this row spends from the classes below, and
   * `tests/studio-column-width.test.ts` holds the studio's split to the wider column it now needs.
   */
  readonly action?: ReactNode;
  /**
   * Words that follow `label` in the control's accessible name, and appear nowhere on screen — for a
   * select rendered once for each item in a list, where `label` alone gives every copy one name.
   *
   * One of the thirty-one passes it: `ProjectSelectField`, which each saved-preset row renders to
   * re-file its preset. Those were a select called “Project” per saved item, beside an ⓘ called
   * “Guidance: Project”, so a reader moving control to control met a run of identical names with
   * nothing saying which save each would move — while the buttons in the same rows already named
   * their preset.
   *
   * **A qualifier rather than a whole name**, so the name cannot lose the visible label. WCAG 2.5.3
   * asks that an accessible name contain the words on screen, because someone driving the app by
   * speech says what they can see; a caller handing over a complete name is free to leave `label`
   * out, which is how seven of the names the #252 fix wrote first shipped. The ⓘ takes the same words,
   * since it is repeated exactly as often as the select it explains.
   *
   * It admits `undefined` outright so `ProjectSelectField` can hand its own optional prop straight
   * through, which `exactOptionalPropertyTypes` otherwise refuses.
   */
  readonly nameQualifier?: string | undefined;
  readonly onChange: (value: T) => void;
}

/**
 * A labelled dropdown over a closed set of choices.
 *
 * Thirty-one controls in this app are exactly this — the studio's output settings, the category, the
 * target model, the quantiser's dials, the atlas calculator's two and the settings dialog's one — so
 * it is one component rather than thirty-one copies of the same label, tooltip and `<select>` markup.
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
  nameQualifier,
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
        <Tooltip text={tooltip} hint={label} nameQualifier={nameQualifier} />
      </div>

      {/*
        The row the control and its action share. Always rendered, rather than only where an action
        was passed: a single-child flex row lays a `w-full` select out exactly as a bare one, so one
        path serves all thirty-one call sites and there is no second arrangement to keep in step.
      */}
      <div className="flex items-center gap-2">
        <select
          id={selectId}
          value={value}
          // Only where a qualifier was passed. `aria-label` outranks the `<label>` when the name is
          // computed, so the label still focuses the control on a click while the name carries the
          // item — and a select with no qualifier is named by its label alone, as it always was.
          aria-label={nameQualifier === undefined ? undefined : `${label} ${nameQualifier}`}
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
