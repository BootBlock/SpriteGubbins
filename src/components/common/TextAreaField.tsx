import { useId } from 'react';
import { Tooltip } from './Tooltip.tsx';

interface TextAreaFieldProps {
  readonly label: string;
  readonly tooltip: string;
  readonly value: string;
  readonly placeholder: string;
  /** How many lines the box shows before it scrolls. */
  readonly rows: number;
  /**
   * Why the value as it stands cannot be accepted, shown under the box in the error tone and wired as
   * its accessible description with `aria-invalid`, or empty where it can — as `TextField`'s is, for
   * the same one form: the icon catalogue's form for an icon of the reader's own, whose look is refused
   * with a reason rather than cut short.
   */
  readonly problem?: string;
  readonly onChange: (value: string) => void;
}

/**
 * A labelled free-text setting whose value has lines in it.
 *
 * `TextField` beside it is the same control for a value that is one line, and the two are not
 * interchangeable: a single-line input **discards the line breaks in a paste**, which browsers each
 * do differently — one joins the lines with spaces, another keeps only the first. A hex list pasted
 * into one would arrive as something other than what the reader copied, and which something would
 * depend on their browser.
 *
 * `rows` is required rather than defaulted, because the right height is a property of what the box
 * is for: a palette worth reading back shows several colours at once, and a box the size of an input
 * says the opposite of what it accepts.
 */
export function TextAreaField({
  label,
  tooltip,
  value,
  placeholder,
  rows,
  problem = '',
  onChange,
}: TextAreaFieldProps) {
  const inputId = useId();
  const problemId = useId();
  const isInvalid = problem !== '';

  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5">
        <label htmlFor={inputId} className="text-xs font-semibold text-ink-muted">
          {label}
        </label>
        <Tooltip text={tooltip} hint={label} />
      </div>

      <textarea
        id={inputId}
        value={value}
        placeholder={placeholder}
        rows={rows}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? problemId : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full resize-y rounded-xl border border-foundry-600 bg-foundry-950/80 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors duration-390 hover:border-accent/40 focus:border-accent aria-invalid:border-rose/60"
      />

      {isInvalid && (
        <p id={problemId} className="mt-1 text-xs leading-relaxed text-rose">
          {problem}
        </p>
      )}
    </div>
  );
}
