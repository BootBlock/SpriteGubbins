import { Tooltip } from '../common/Tooltip.tsx';

interface AtlasMetricProps {
  readonly label: string;
  readonly value: string;
  /** What the figure means and what it is worth doing about it. Required, deliberately — see below. */
  readonly tooltip: string;
}

/**
 * One derived atlas figure.
 *
 * A description-list pair rather than two stacked `<span>`s, so the label and the number it belongs
 * to are associated for anything reading the page rather than merely adjacent on it.
 *
 * **The guidance is not optional.** Every tile here is a number nobody can act on unexplained —
 * "usable bounds: 219 px max" states a quantity and no unit of judgement — and an optional prop is
 * how half of them would end up without one. Each figure carries its own entry in `ATLAS_TOOLTIPS`,
 * saying what it measures and what moves it.
 *
 * All six tiles look the same. Colouring them individually would mean borrowing `gold` and
 * `emerald` for decoration, and those two are semantic in this modal: the fit summary a few lines
 * away uses them to mean "does not fit" and "fits". A component count in gold sitting under a gold
 * warning would read as a warning about the component count.
 */
export function AtlasMetric({ label, value, tooltip }: AtlasMetricProps) {
  return (
    <div className="rounded-xl border border-foundry-700 bg-foundry-950 p-2.5">
      <dt className="flex items-center gap-1.5 text-2xs tracking-wide text-ink-faint uppercase">
        {label}
        <Tooltip text={tooltip} hint={label} />
      </dt>
      <dd className="text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}
