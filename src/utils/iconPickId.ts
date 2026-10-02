import type { IconPick } from '../types/iconRoster.ts';

/**
 * The slot name a pick answers to: a catalogue entry's id, or the id of the reader's own entry.
 *
 * Unique across a roster, since `checkCustomIcon` refuses a custom id any catalogue entry or other pick
 * already answers to — so it is what a roster is deduplicated, compared and edited by.
 */
export function iconPickId(pick: IconPick): string {
  return pick.source === 'CATALOGUE' ? pick.id : pick.entry.id;
}
