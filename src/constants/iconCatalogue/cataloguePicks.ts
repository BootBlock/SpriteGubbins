import type { IconPick } from '../../types/iconRoster.ts';

/**
 * Catalogue ids as roster picks — how a preset and the starter roster declare the icons they tick.
 *
 * A declaration lists ids because that is what a reader recognises in it; the roster holds picks because
 * it also holds the reader's own entries, and this is the one place the first becomes the second.
 */
export function cataloguePicks(ids: readonly string[]): readonly IconPick[] {
  return ids.map((id) => ({ source: 'CATALOGUE', id }));
}
