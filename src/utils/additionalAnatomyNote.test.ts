import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../constants/promptText/inventory.ts';
import { parseAdditionalAnatomy } from './additionalAnatomy.ts';
import { additionalAnatomyNote } from './additionalAnatomyNote.ts';
import { componentSlots } from './componentSlots.ts';

/**
 * What the *Extra Overlay Pieces* field says under itself (audit finding T8): a piece named like one the
 * overlay sheet already draws, which used to be drawn twice and renamed without a word, and pieces enough
 * to push that sheet past the ceiling, which only the budget notice for the sheet on screen reported.
 */
const ICONS = defaultSubjectFor('ICON');
const SERIES = { mode: 'SINGLE_DIRECTION_POSE_LIBRARY', directions: 'SINGLE_FRONT', rig: null } as const;

function noteFor(pieces: string): string {
  return additionalAnatomyNote('ICON', ICONS, parseAdditionalAnatomy(pieces), SERIES);
}

describe('additionalAnatomyNote', () => {
  it('says nothing of pieces the overlay sheet does not draw and can hold', () => {
    expect(noteFor('Equipped Corner Tick ×1, Hostile Chevron ×1')).toBe('');
    expect(noteFor('NONE')).toBe('');
  });

  it('names a piece the overlay sheet already draws, which the slots rename', () => {
    expect(noteFor('Selected Ring ×1')).toBe(
      'The “Overlay pieces” sheet already draws Selected Ring, so it is drawn a second time, as a separate file.',
    );
    // The renaming the note reports, which no reader was told of.
    const overlay = 1;
    const slots = componentSlots(
      'ICON',
      ICONS,
      SERIES.mode,
      SERIES.directions,
      overlay,
      parseAdditionalAnatomy('Selected Ring ×1'),
      null,
    );
    expect(slots).toContain('selected-ring-2');
  });

  it('names a piece that repeats a line of the library as well as one of its drawings', () => {
    expect(noteFor('Cooldown Sweep ×1, Tier Mark ×2')).toContain(
      'already draws Cooldown Sweep and Tier Mark',
    );
  });

  it('says when the pieces push the overlay sheet past the ceiling', () => {
    expect(noteFor('Favourite Star ×40')).toBe(
      `The pieces in Extra Overlay Pieces bring the “Overlay pieces” sheet to 54 components, past the ${String(PRACTICAL_COMPONENT_CEILING)} one generation reliably returns.`,
    );
  });
});
