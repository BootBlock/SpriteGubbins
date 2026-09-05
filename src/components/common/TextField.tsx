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
   * Optional because only one field in the app has one: a project's name is rendered as an option
   * in the `<select>` every save goes through, and a native select truncates rather than wrapping —
   * so a name past the option budget loses the tail that tells two projects apart. Refusing the
   * keystroke is the honest place to enforce that, since the alternative is accepting a name and
   * then showing it clipped in the one control that has to distinguish it.
   *
   * Every other call site here is free text the compiler either emits or omits, with no width it
   * has to fit, and a permanently-unset prop on all of them would bury the one that means it.
   */
  readonly maxLength?: number;
  readonly onChange: (value: string) => void;
}

/**
 * A labelled free-text setting.
 *
 * `ComboBox` is for a field with a suggestion pool behind it; this is for the ones with no pool at
 * all — a pixel target, a socket list, an identity digest. Empty is meaningful for every one of
 * them: the compiler omits the line rather than emitting a blank.
 */
export function TextField({ label, tooltip, value, placeholder, maxLength, onChange }: TextFieldProps) {
  const inputId = useId();

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
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded-xl border border-foundry-600 bg-foundry-950/80 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors duration-390 hover:border-accent/40 focus:border-accent"
      />
    </div>
  );
}
