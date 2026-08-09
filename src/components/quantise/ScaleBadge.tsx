import type { SheetFacts } from '../../types/quantiser.ts';
import { Badge } from '../common/Badge.tsx';

interface ScaleBadgeProps {
  /**
   * What one look at the sheet established, or `null` while the worker is still looking.
   *
   * The whole reading rather than the scale out of it, so that "no reading yet" and "no scale in
   * this image" cannot both be on screen at once — two props can contradict each other, and a
   * spinner shown beside an answer is the state that tells a user the tab is broken.
   *
   * That covers the four states below and no more. `null` also arrives when the survey itself
   * **failed**, where this pulses "Measuring the sheet…" beside the settled error the tab renders
   * above — which predates this component and is not what the single-prop shape is claiming to
   * prevent. Telling those two apart needs the error, which belongs to the tab; do not read this
   * doc as an assertion that it already has been.
   */
  readonly facts: SheetFacts | null;
}

/**
 * What the sheet was read as, and **which reading said so**.
 *
 * Four states, and the distinction the middle two carry is the point of the component. An `EXACT`
 * scale is a fact about the image — every colour transition in it falls on that lattice — and
 * wants nothing from the reader. An `ESTIMATED` one is the period of edges that resampling has
 * already softened away, which is a measurement with a tolerance in it, so it wears the same
 * "needs attention" gold as finding nothing at all: both mean the reader has to look at the preview
 * before trusting the number. Reporting an estimate in the settled emerald of a measurement would
 * be the exact failure the estimate is hedged against — a scale nobody checked, reducing a sheet by
 * the wrong factor with nothing on screen saying so.
 *
 * The two gold states never appear together, so sharing a tone costs no distinction: an estimate is
 * only ever read from a sheet the exact pass found nothing in.
 */
export function ScaleBadge({ facts }: ScaleBadgeProps) {
  if (facts === null) {
    // The only tone that pulses, and this is what it is for: the sheet is being read, right now, on
    // the worker. See the note on `BadgeTone`.
    return <Badge tone="live">Measuring the sheet…</Badge>;
  }
  if (facts.scale === null) {
    return <Badge tone="attention">No pixel scale in this image</Badge>;
  }
  if (facts.scale.measurement === 'ESTIMATED') {
    return <Badge tone="attention">{facts.scale.grid}× — estimated from the softened edges</Badge>;
  }
  // Not "every edge falls on it": the threshold believes a scale that up to a tenth of the sheet's
  // transitions miss, which is the whole point of it not being 1.0 — a stray pixel from a
  // compression artefact should not deny an obvious grid. The badge says how the number was arrived
  // at instead of overstating how cleanly it fits.
  return <Badge tone="valid">{facts.scale.grid}× — measured where the art changes</Badge>;
}
