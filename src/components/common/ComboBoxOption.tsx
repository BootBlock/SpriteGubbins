import { ColorSwatch } from './ColorSwatch.tsx';

interface ComboBoxOptionProps {
  readonly id: string;
  readonly option: string;
  readonly isSelected: boolean;
  readonly isActive: boolean;
  readonly onSelect: () => void;
  readonly onHover: () => void;
}

/**
 * One suggestion in a `ComboBox`'s list.
 *
 * A real `<button>` rather than a `<li role="option">`, so it is an interactive element in its own
 * right — but skipped by Tab, because the ARIA editable-combobox pattern keeps focus in the text
 * field and moves a highlight with `aria-activedescendant` instead.
 *
 * *Selected* and *active* are different states: selected is the value the field holds, active is
 * where the keyboard highlight currently is. Both can be visible at once, on different rows.
 */
export function ComboBoxOption({ id, option, isSelected, isActive, onSelect, onHover }: ComboBoxOptionProps) {
  return (
    <button
      id={id}
      type="button"
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
      // The press must not pull focus out of the text field, or the list would close before the
      // click could select anything.
      onMouseDown={(event) => {
        event.preventDefault();
      }}
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-all duration-150 ${
        isSelected
          ? 'bg-accent/30 font-bold text-accent-soft ring-1 ring-accent/40'
          : isActive
            ? 'translate-x-0.5 bg-accent/20 text-ink'
            : 'text-ink-muted'
      }`}
    >
      <span className="flex items-center gap-1.5 truncate">
        {option}
        <ColorSwatch colorText={option} />
      </span>
      {isSelected && (
        <span aria-hidden="true" className="ml-2 font-mono text-accent-soft">
          ✓
        </span>
      )}
    </button>
  );
}
