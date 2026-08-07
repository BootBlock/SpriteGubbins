import { useId, useRef } from 'react';
import { useComboBox } from '../../hooks/useComboBox.ts';
import { ColorSwatch } from './ColorSwatch.tsx';
import { ComboBoxOption } from './ComboBoxOption.tsx';
import { Tooltip } from './Tooltip.tsx';

interface ComboBoxProps {
  readonly label: string;
  readonly tooltip: string;
  readonly value: string;
  readonly options: readonly string[];
  readonly onChange: (value: string) => void;
}

/**
 * A text field with a list of suggestions — the control every subject field uses.
 *
 * **Unfiltered by design.** Typing narrows nothing: the list is the category's whole option pool,
 * always, and anything typed is accepted whether or not it appears there. That is the point of the
 * pool — it covers the common cases and free text covers everything else, which is why
 * `SubjectDefinition` holds plain strings rather than a union of the options.
 *
 * Built to the ARIA editable-combobox pattern rather than as a styled `<input>` with a click-to-open
 * panel. Focus stays in the text field throughout and the active option is pointed at with
 * `aria-activedescendant`, so arrow keys move a highlight the way a native `<select>` does without
 * the field ever losing focus. Escape closes; Enter takes the highlighted option. The state machine
 * behind all of that is {@link useComboBox}.
 */
export function ComboBox({ label, tooltip, value, options, onChange }: ComboBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const combo = useComboBox({ options, onCommit: onChange, containerRef, listboxRef });
  const baseId = useId();
  const inputId = `${baseId}-input`;
  const listboxId = `${baseId}-listbox`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  return (
    <div className="relative" ref={containerRef}>
      <div className="mb-1 flex items-center gap-1.5">
        <label htmlFor={inputId} className="text-xs font-semibold text-ink-muted">
          {label}
        </label>
        <ColorSwatch colorText={value} />
        <Tooltip text={tooltip} hint={label} />
      </div>

      <div className="relative flex items-center">
        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-expanded={combo.isOpen}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            combo.isOpen && combo.activeIndex >= 0 ? optionId(combo.activeIndex) : undefined
          }
          autoComplete="off"
          value={value}
          placeholder="Type a value, or pick from the list"
          onChange={(event) => {
            onChange(event.target.value);
            combo.open();
            combo.highlight(-1);
          }}
          onFocus={combo.open}
          onKeyDown={combo.handleKeyDown}
          className="w-full rounded-xl border border-foundry-600 bg-foundry-950/80 py-2 pr-9 pl-3 font-sans text-xs text-ink shadow-inner transition-colors duration-200 hover:border-accent/40 focus:border-accent"
        />

        <button
          type="button"
          // Skipped by Tab and hidden from assistive technology: the field it belongs to is already
          // focusable, and the arrow keys there do everything this button does.
          tabIndex={-1}
          aria-hidden="true"
          onClick={combo.toggle}
          className="absolute right-2 flex items-center justify-center p-1 text-ink-faint transition-colors hover:text-accent-soft"
        >
          <svg
            className={`size-4 transition-transform duration-200 ${combo.isOpen ? 'rotate-180 text-accent-soft' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {combo.isOpen && (
        <div
          id={listboxId}
          ref={listboxRef}
          role="listbox"
          aria-label={`${label} suggestions`}
          className="glass-float animate-fade-in absolute z-50 mt-1.5 flex max-h-56 w-full flex-col gap-0.5 overflow-y-auto rounded-xl p-1.5"
        >
          {options.map((option, index) => (
            <ComboBoxOption
              key={option}
              id={optionId(index)}
              option={option}
              isSelected={option === value}
              isActive={index === combo.activeIndex}
              onSelect={() => {
                combo.commit(option);
              }}
              onHover={() => {
                combo.highlight(index);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
