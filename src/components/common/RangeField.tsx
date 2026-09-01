import { useId } from 'react';
import { Tooltip } from './Tooltip.tsx';

interface RangeFieldProps {
  readonly label: string;
  readonly tooltip: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** What the current value reads as beside the slider — `1.5` as `1.5×`, or `0` as `off`. */
  readonly format: (value: number) => string;
  readonly onChange: (value: number) => void;
}

/**
 * A labelled slider over a continuous range, with the value read out beside it.
 *
 * The quantiser's tuning dials outgrew stepped pills: a blend strength or a merge tolerance is a
 * *position on a range*, judged against a live preview, and five pills across it force the reader
 * to the nearest offered notch rather than the value the sheet wants. A native `input[type=range]`
 * is keyboard-operable out of the box — arrows step, Home and End jump to the ends — and the
 * worker's debounce is what makes a drag affordable: the intermediate positions coalesce, and only
 * the settled value is computed.
 *
 * The readout is part of the control, not decoration: a slider alone answers "roughly where", and
 * every dial here feeds an exact figure into the transform, so the figure is shown in the mono
 * style every metric in the app wears — through `format`, because `0` on one dial means *off*
 * while `1` on another means *plain*, and only the call site knows which. It doubles as the
 * accessible value text via `aria-valuetext`, so a screen reader hears "off" where a sighted
 * reader reads it.
 *
 * The thumb takes the `accent` token through the `accent-*` utility — interaction is the primary's
 * colour everywhere in the app — and the value parses through `Number(...)` from the DOM's string,
 * which for a range input is always a representable step position.
 *
 * **There is no step check on the value this is *handed*, and that is a claim about the boundary
 * rather than an omission.** A range input snaps its thumb to the grid and leaves the value alone,
 * so an off-grid position would show as its neighbour while the pipeline ran at what was stored —
 * which is what an imported preset pack carrying a line strength of 2.34567 did. The refusal
 * belongs where the value arrives, so `db/readers.ts` reads every dial with `pickSteppedNumber`,
 * against the same `*_RANGE` the `step` below comes from; the sweep's own candidate ladders are
 * swept through that parser by a test for the same reason. A second guard here would be a second
 * opinion about a question already answered, and would have to invent an answer — snap, or refuse
 * to render — that the storage layer has settled.
 */
export function RangeField({ label, tooltip, value, min, max, step, format, onChange }: RangeFieldProps) {
  const inputId = useId();

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {/* The Tooltip is a sibling of the label, never inside it, as every field primitive keeps
          it: nested, the revealed card joins the slider's accessible name and a click on the
          guidance text becomes label activation aimed at the input. */}
      <span className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted">
        <label htmlFor={inputId}>{label}</label>
        <Tooltip text={tooltip} hint={label} />
      </span>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={format(value)}
        onChange={(event) => {
          onChange(Number(event.target.value));
        }}
        className="accent-accent w-56 max-w-full"
      />
      <span className="w-12 font-mono text-xs text-ink-faint">{format(value)}</span>
    </div>
  );
}
