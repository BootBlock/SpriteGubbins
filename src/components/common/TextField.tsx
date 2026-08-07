import { useId } from 'react';
import { Tooltip } from './Tooltip.tsx';

interface TextFieldProps {
  readonly label: string;
  readonly tooltip: string;
  readonly value: string;
  readonly placeholder: string;
  readonly onChange: (value: string) => void;
}

/**
 * A labelled free-text setting.
 *
 * `ComboBox` is for a field with a suggestion pool behind it; this is for the ones with no pool at
 * all — a pixel target, a socket list, an identity digest. Empty is meaningful for every one of
 * them: the compiler omits the line rather than emitting a blank.
 */
export function TextField({ label, tooltip, value, placeholder, onChange }: TextFieldProps) {
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
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded-xl border border-foundry-600 bg-foundry-950 p-2.5 font-mono text-xs text-ink shadow-inner transition-colors focus:border-accent"
      />
    </div>
  );
}
