import type { SheetFacts, SheetReading } from '../types/quantiser.ts';

/**
 * The facts a reading established, or `null` where it established none — still pending, or failed.
 *
 * For the readers that only ever act on an answer, such as the grid rule and the preview captions,
 * and have nothing different to say about the two states without one. A surface that *describes*
 * the reading has to tell those two apart, and switches on the reading's `kind` instead.
 */
export function sheetReadingFacts(reading: SheetReading): SheetFacts | null {
  return reading.kind === 'facts' ? reading.facts : null;
}
