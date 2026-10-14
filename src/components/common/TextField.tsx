import { useId } from 'react';
import { Tooltip } from './Tooltip.tsx';

interface TextFieldProps {
  readonly label: string;
  readonly tooltip: string;
  readonly value: string;
  readonly placeholder: string;
  /**
   * The longest value this field will accept, where the value has a hard limit rather than a
   * preference.
   *
   * Optional because two fields in the app have one and the rest do not. A project's name is
   * rendered as an option in the `<select>` every save goes through, and a native select truncates
   * rather than wrapping — so a name past the option budget loses the tail that tells two projects
   * apart. A custom palette's name is read into the middle of section 2 of the compiled prompt, and
   * a `.gpl` header is free text a writing tool may have filled with a path or a sentence. Refusing
   * the keystroke is the honest place to enforce either, since the alternative is accepting a name
   * and then showing it clipped, or carrying a paragraph into a prompt.
   *
   * The other call sites have no width to fit: most are free text the compiler emits or omits, and the
   * icon catalogue's form refuses an over-long role or state with a reason (`problem`) rather than
   * cutting it short. A permanently-unset prop on all of them would bury the two that mean it.
   */
  readonly maxLength?: number;
  /**
   * Why the value as it stands cannot be accepted, shown under the box in the error tone and wired as
   * its accessible description with `aria-invalid`, or empty where it can.
   *
   * Optional because one form has one: the icon catalogue's form for an icon of the reader's own,
   * whose role and states are required and refused with a reason rather than cut short as they are
   * typed. The other call sites are free text the compiler either emits or omits, with nothing to refuse.
   */
  readonly problem?: string;
  readonly onChange: (value: string) => void;
}

/**
 * A labelled free-text setting.
 *
 * `ComboBox` is for a field with a suggestion pool behind it; this is for the ones with no pool at
 * all — a pixel target, a socket list, an identity digest. Empty is meaningful for most of them: the
 * compiler omits the line rather than emitting a blank. The icon catalogue's form is the exception: its
 * role and state names are required, and an empty one is refused through `problem`.
 */
export function TextField({
  label,
  tooltip,
  value,
  placeholder,
  maxLength,
  problem = '',
  onChange,
}: TextFieldProps) {
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

      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={isInvalid}
        aria-describedby={isInvalid ? problemId : undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded-xl border border-foundry-600 bg-foundry-950/80 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors duration-390 hover:border-accent/40 focus:border-accent aria-invalid:border-rose/60"
      />

      {isInvalid && (
        <p id={problemId} className="mt-1 text-xs leading-relaxed text-rose">
          {problem}
        </p>
      )}
    </div>
  );
}
