import type { SheetSubject } from '../types/subject.ts';
import { palettesFor } from './palettesFor.ts';

/**
 * What the Palette control says once the subject has withdrawn every pinned palette from it, or `''`
 * for a subject that can take every palette.
 *
 * Shown under the control, so it is plain text rather than card markup, and asked of `palettesFor`, the
 * lookup the control's list is filtered by, so it cannot appear while a palette is still offered. A tint
 * mask is the one subject that withdraws them (audit finding M1).
 */
export function paletteWithdrawal(subject: SheetSubject): string {
  if (palettesFor(subject).length > 1) return '';
  return 'This icon set is a tint mask, drawn in neutral greys for your engine to colour, so no fixed palette is offered. Apply a palette to the tint instead.';
}
