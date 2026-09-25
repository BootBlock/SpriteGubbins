import { ESTIMATED_SCALE_READING } from '../../constants/quantiser.ts';
import type { SheetReading } from '../../types/quantiser.ts';
import { Badge } from '../common/Badge.tsx';

interface ScaleBadgeProps {
  /**
   * Where the one look at the sheet stands, and what it established if it answered.
   *
   * The whole reading rather than the scale out of it, so that "no reading yet", "no reading at
   * all" and "no scale in this image" cannot be on screen together — two props can contradict each
   * other, and a spinner shown beside an answer, or beside the error that ended the wait, is the
   * state that tells a user the tab is broken.
   */
  readonly reading: SheetReading;
}

/**
 * What the sheet was read as, and **which reading said so**.
 *
 * Five states, and the distinction the estimate carries against a measurement is the point of the
 * component. An `EXACT` scale is a fact about the image — every colour transition in it falls on
 * that lattice — and wants nothing from the reader. An estimate is a reading with a tolerance in it, so it wears the
 * same "needs attention" gold as finding nothing at all: both mean the reader has to look at the
 * preview before trusting the number. Reporting an estimate in the settled emerald of a measurement
 * would be the exact failure the estimate is hedged against — a scale nobody checked, reducing a
 * sheet by the wrong factor with nothing on screen saying so.
 *
 * **Which estimate answered is named, not just that one did.** Three readings produce a number here
 * and they find it in three different things, so a badge that credited every one of them to the
 * spacing of the sheet's edges described the reading that answers on none of `test_sprites/`. The
 * wording comes from `ESTIMATED_SCALE_READING`, which the pane, the panel and the live region draw
 * from too.
 *
 * A reading that failed is gold as well, and settled rather than pulsing: nothing is being read any
 * more, and the reader has a number to type all the same. The error above the panels says why.
 *
 * The gold states never appear together, so sharing a tone costs no distinction: an estimate is
 * only ever read from a sheet the exact pass found nothing in, and a failed reading found nothing.
 */
export function ScaleBadge({ reading }: ScaleBadgeProps) {
  if (reading.kind === 'pending') {
    // The only tone that pulses, and this is what it is for: the sheet is being read, right now, on
    // the worker. See the note on `BadgeTone`.
    return <Badge tone="live">Measuring the sheet…</Badge>;
  }
  if (reading.kind === 'failed') return <Badge tone="attention">Not measured — the reading failed</Badge>;
  const { facts } = reading;
  if (facts.scale === null) {
    return <Badge tone="attention">No pixel scale in this image</Badge>;
  }
  if (facts.scale.measurement !== 'EXACT') {
    return (
      <Badge tone="attention">
        {facts.scale.grid}× — estimated {ESTIMATED_SCALE_READING[facts.scale.measurement].source}
      </Badge>
    );
  }
  // Not "every edge falls on it": the threshold believes a scale that up to a tenth of the sheet's
  // transitions miss, which is the whole point of it not being 1.0 — a stray pixel from a
  // compression artefact should not deny an obvious grid. The badge says how the number was arrived
  // at instead of overstating how cleanly it fits.
  return <Badge tone="valid">{facts.scale.grid}× — measured where the art changes</Badge>;
}
