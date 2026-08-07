interface AtlasMetricProps {
  readonly label: string;
  readonly value: string;
}

/**
 * One derived atlas figure.
 *
 * A description-list pair rather than two stacked `<span>`s, so the label and the number it belongs
 * to are associated for anything reading the page rather than merely adjacent on it.
 *
 * All four tiles look the same. Colouring them individually would mean borrowing `gold` and
 * `emerald` for decoration, and those two are semantic here: this very modal uses them a few lines
 * away to mean "needs attention" and "power-of-two clean". A component count in gold sitting under a
 * gold warning badge would read as a warning about the component count.
 */
export function AtlasMetric({ label, value }: AtlasMetricProps) {
  return (
    <div className="rounded-xl border border-foundry-700 bg-foundry-950 p-2.5">
      <dt className="text-[10px] tracking-wide text-ink-faint uppercase">{label}</dt>
      <dd className="text-sm font-bold text-ink">{value}</dd>
    </div>
  );
}
