import { useId, useRef } from 'react';
import { useAnchoredSurface } from '../../hooks/useAnchoredSurface.ts';
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
 *
 * **The list floats in the top layer**, not inside this control's box — see
 * {@link useAnchoredSurface} for why a `z-index` cannot get it out from under the next panel down
 * the page. It stays a DOM child of the container regardless, which is what keeps the
 * outside-press check and `aria-activedescendant` working unchanged.
 */
export function ComboBox({ label, tooltip, value, options, onChange }: ComboBoxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const combo = useComboBox({ options, onCommit: onChange, containerRef, listboxRef });
  // Anchored to the field row, not to `containerRef`. The two share a bottom edge and a width, so
  // a list dropping *below* cannot tell them apart — but the container starts at the top of the
  // label row, so one flipping *above* would clear the label and its ⓘ as well, and stand a row
  // further off the field than it should. `containerRef` stays what the outside-press check reads.
  useAnchoredSurface(fieldRef, listboxRef, combo.isOpen, 'stretch');
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

      <div className="relative flex items-center" ref={fieldRef}>
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
          // Positioned against the field, as it always was. `useAnchoredSurface` lifts it into the
          // top layer and overrides all of that with viewport coordinates where the browser can do
          // it; where it can't, this is what the list falls back to.
          //
          // `inset-x-0` rather than `w-full`, though both size the list to the field here.
          //
          // With `w-full`, the lifted list intermittently rendered the full width of the viewport
          // and spilled off the right of the screen — measured in Edge, 2 runs in 12, with the
          // element reporting the hook's inline `width: 457px` and a used width of 1400px at the
          // same instant. An inline declaration outranks `.w-full { width: 100% }` in the cascade,
          // so that should not be reachable and no mechanism here is claimed; what is established is
          // that removing the competing declaration removes it, 12 runs in 12, and that restoring it
          // brings it back. `inset-x-0` sizes the un-lifted list identically while leaving no
          // `width` for the hook's to be resolved against, and the `inset: auto` the hook already
          // writes for the user-agent popover style cancels it outright once lifted.
          //
          // `text-ink` is not decoration either: that same user-agent style sets `color: CanvasText`,
          // which would take any future child without a `text-*` of its own out of the palette.
          className="glass-float animate-fade-in absolute inset-x-0 z-50 mt-1.5 flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-xl p-1.5 text-ink"
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
