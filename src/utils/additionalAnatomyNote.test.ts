import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../constants/promptText/inventory.ts';
import { parseAdditionalAnatomy } from './additionalAnatomy.ts';
import { additionalAnatomyNote } from './additionalAnatomyNote.ts';
import { componentSlots } from './componentSlots.ts';

/**
 * What the *Extra Overlay Pieces* field says under itself (audit finding T8): a piece named like one the
 * overlay library already draws, which used to be drawn twice and renamed without a word, pieces enough
 * to push a sheet past the ceiling, which only the budget notice for the sheet on screen reported (a sheet
 * the pieces are appended to, since the overlay sheets lay a piece across as many as it fills), and
 * pieces enough to add an overlay sheet to the series.
 */
const ICONS = defaultSubjectFor('ICON');
const SERIES = { mode: 'SINGLE_DIRECTION_POSE_LIBRARY', directions: 'SINGLE_FRONT', rig: null } as const;

/** The subject with these pieces typed into the field, which is where the series reads them. */
function withPieces(pieces: string) {
  return { ...ICONS, additional_anatomy: pieces };
}

function noteFor(pieces: string): string {
  return additionalAnatomyNote('ICON', withPieces(pieces), parseAdditionalAnatomy(pieces), SERIES);
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
      withPieces('Selected Ring ×1'),
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

  it('names a repeat on the overlay sheet that draws the line, when the cut puts the piece on another', () => {
    // Nine pieces after the library's fourteen are two sheets: the selected ring stays on the first, and
    // the reader's own ring lands on the second.
    const pieces = 'Equipped Corner Tick ×8, Selected Ring ×1';
    expect(noteFor(pieces)).toContain(
      'The “Overlay pieces 1–12” sheet already draws Selected Ring, so it is drawn a second time, as a separate file.',
    );
  });

  it('says when the pieces add an overlay sheet to the series, and which sheets draw them', () => {
    expect(noteFor('Equipped Corner Tick ×3, Hostile Chevron ×1')).toBe(
      'The pieces in Extra Overlay Pieces fill more cells than the sheets without them hold, so they add a sheet to the series, and are drawn on “Overlay pieces 10–18”.',
    );
  });

  it('lays one piece worth several sheets across them, so no overlay sheet passes the ceiling', () => {
    const note = noteFor('Favourite Star ×50');
    expect(note).toContain('they add three sheets to the series');
    expect(note).not.toContain('past the');
  });

  it('says when one piece pushes a sheet it is appended to past the ceiling', () => {
    // A character's pieces are appended to its sheet whole, so the ceiling is still reachable there.
    const subject = { ...defaultSubjectFor('CHARACTER'), additional_anatomy: 'Tentacle ×50' };
    expect(
      additionalAnatomyNote('CHARACTER', subject, parseAdditionalAnatomy('Tentacle ×50'), SERIES),
    ).toContain(
      `The pieces in Additional Genuine Anatomy bring the “Pose library” sheet to 87 components, past the ${String(PRACTICAL_COMPONENT_CEILING)} one generation reliably returns.`,
    );
  });
});
