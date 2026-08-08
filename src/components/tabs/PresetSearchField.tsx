import { useId, useRef } from 'react';

interface PresetSearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  /** How many presets the current query matches, across every collection. */
  readonly matchCount: number;
  /**
   * Whether the query has actually narrowed the library.
   *
   * Passed in rather than derived from `value`, because the two are not the same question: a query of
   * `-` is text in the box that matches nothing in particular, and the matcher — which compares
   * normalised terms — narrows nothing at all. Deriving it here from `value.trim()` would have this
   * field announce a filter that is not in effect, and is exactly the second definition of "filtering"
   * that put the collection list and the panel into disagreement.
   */
  readonly isNarrowed: boolean;
}

/**
 * The library's filter box.
 *
 * Not a `TextField`: that primitive is for a *setting* — a labelled value with a tooltip explaining
 * what the prompt does with it — and this is a control that changes what is on screen and nothing
 * about the prompt. It needs the three things a search box has and a setting does not: search
 * semantics, Escape to clear, and a spoken count of what the query found.
 *
 * That count is the reason for the live region. Filtering as you type is a purely visual answer, so
 * without it a screen-reader user typing into this box gets no feedback at all until they navigate
 * away from it and count the cards themselves.
 */
export function PresetSearchField({ value, onChange, matchCount, isNarrowed }: PresetSearchFieldProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  // Whether there is anything to clear, which is a different question from whether the library is
  // narrowed: punctuation alone is text in the box and no filter in effect, and the button that
  // removes it has to be there either way.
  const hasText = value !== '';

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1 block text-2xs font-semibold tracking-wide text-ink-faint uppercase"
      >
        Search presets
      </label>

      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs opacity-70"
        >
          🔍
        </span>

        <input
          ref={inputRef}
          id={inputId}
          type="search"
          value={value}
          placeholder="Name, style, camera…"
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            // The conventional way out of a filter box. Not `preventDefault`ed and not stopped from
            // propagating: nothing above this listens for Escape, and swallowing it would break
            // whatever eventually does.
            if (event.key === 'Escape') onChange('');
          }}
          // The engine's own cancel button is suppressed rather than styled: it is not reachable by
          // keyboard, and leaving it beside the button below would put two clear affordances in one
          // control, one of which half the app's users cannot use.
          className="w-full rounded-xl border border-foundry-600 bg-foundry-950/80 py-2 pr-9 pl-8 text-xs text-ink shadow-inner transition-colors duration-390 hover:border-accent/40 focus:border-accent [&::-webkit-search-cancel-button]:appearance-none"
        />

        {hasText && (
          <button
            type="button"
            onClick={() => {
              // Focused *before* the state change, not after: clearing the box unmounts this button,
              // so a focus call afterwards would be aimed at an element React has already removed and
              // focus would fall to the document — leaving a keyboard user's next Tab starting again
              // from the top of the page. The input is also where the caret belongs once a filter has
              // been cleared, so this is the right destination rather than merely a safe one.
              inputRef.current?.focus();
              onChange('');
            }}
            aria-label="Clear the preset search"
            className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-lg px-1.5 py-1 text-2xs font-semibold text-ink-faint transition-colors hover:bg-foundry-700 hover:text-ink"
          >
            <span aria-hidden="true">✕</span>
          </button>
        )}
      </div>

      <p role="status" className="sr-only">
        {isNarrowed
          ? `${String(matchCount)} preset${matchCount === 1 ? '' : 's'} match ${value.trim()}`
          : 'Showing every preset'}
      </p>
    </div>
  );
}
