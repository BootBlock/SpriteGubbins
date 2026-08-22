import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_PRESET } from '../constants/presets/index.ts';
import { STUDIO_HISTORY_LIMIT } from '../constants/studioHistory.ts';
import type { StudioPosition } from '../types/studioHistory.ts';
import {
  canRedoStudio,
  canUndoStudio,
  currentStudioPosition,
  openStudioHistory,
  recordStudio,
  redoStudio,
  studioUndoDepth,
  syncStudio,
  undoStudio,
} from './studioHistory.ts';

/**
 * The stack's one genuinely subtle rule: the cursor slot takes the live studio before the cursor
 * moves.
 *
 * Everything else here is the shape `dialHistory.ts` already has. That rule is not, and it is what
 * pays for recording only the four destructive acts rather than every field edit — a reader's
 * ordinary typing is never recorded and must still never be lost, in either direction.
 */

const OPEN_AT: StudioPosition = {
  category: DEFAULT_PRESET.category,
  subject: DEFAULT_PRESET.subject,
  output: DEFAULT_OUTPUT_CONFIG,
};

const OPEN = openStudioHistory(OPEN_AT);

/** The opening position with some of the sixteen answers overwritten, which is what an edit does. */
function edited(overrides: Partial<StudioPosition['subject']>): StudioPosition {
  return { ...OPEN_AT, subject: { ...OPEN_AT.subject, ...overrides } };
}

/** A different category with its own defaults, which is what a category switch lands on. */
const BUILDING: StudioPosition = {
  category: 'BUILDING',
  subject: defaultSubjectFor('BUILDING'),
  output: DEFAULT_OUTPUT_CONFIG,
};

describe('openStudioHistory', () => {
  it('opens at the position it was given, with nowhere to step', () => {
    expect(currentStudioPosition(OPEN)).toEqual(OPEN_AT);
    expect(canUndoStudio(OPEN)).toBe(false);
    expect(canRedoStudio(OPEN)).toBe(false);
    expect(studioUndoDepth(OPEN)).toBe(0);
  });
});

describe('recordStudio', () => {
  it('leaves one step back to where the act started', () => {
    const history = recordStudio(OPEN, OPEN_AT, BUILDING);

    expect(studioUndoDepth(history)).toBe(1);
    expect(currentStudioPosition(history)).toEqual(BUILDING);
    expect(currentStudioPosition(undoStudio(history, BUILDING))).toEqual(OPEN_AT);
  });

  it('records nothing for an act that changed nothing', () => {
    // Choosing the category that is already selected, which is one arrow key away in the select.
    const history = recordStudio(OPEN, OPEN_AT, { ...OPEN_AT });

    expect(studioUndoDepth(history)).toBe(0);
    expect(canRedoStudio(history)).toBe(false);
  });

  it('records the live studio rather than what the previous act left behind', () => {
    // The reported case, in order: switch category, then edit two fields, then randomise. The
    // position the second act has to be able to return to is the edited one, not the bare defaults
    // the switch produced.
    const switched = recordStudio(OPEN, OPEN_AT, BUILDING);
    const typed: StudioPosition = { ...BUILDING, subject: { ...BUILDING.subject, species: 'Keep' } };
    const rolled: StudioPosition = { ...BUILDING, subject: defaultSubjectFor('BUILDING') };

    const history = recordStudio(switched, typed, rolled);

    expect(currentStudioPosition(undoStudio(history, rolled)).subject.species).toBe('Keep');
  });

  it('drops the branch ahead of the cursor', () => {
    const first = recordStudio(OPEN, OPEN_AT, BUILDING);
    const steppedBack = undoStudio(first, BUILDING);
    const elsewhere = edited({ species: 'Elsewhere' });

    const history = recordStudio(steppedBack, OPEN_AT, elsewhere);

    expect(canRedoStudio(history)).toBe(false);
    expect(currentStudioPosition(history)).toEqual(elsewhere);
    expect(currentStudioPosition(undoStudio(history, elsewhere))).toEqual(OPEN_AT);
  });

  it('drops the oldest positions once the cap is reached', () => {
    let history = OPEN;
    let at = OPEN_AT;
    for (let step = 0; step < STUDIO_HISTORY_LIMIT + 5; step += 1) {
      const next = edited({ species: `Subject ${String(step)}` });
      history = recordStudio(history, at, next);
      at = next;
    }

    expect(history.entries).toHaveLength(STUDIO_HISTORY_LIMIT);
    expect(studioUndoDepth(history)).toBe(STUDIO_HISTORY_LIMIT - 1);
    expect(currentStudioPosition(history).subject.species).toBe(
      `Subject ${String(STUDIO_HISTORY_LIMIT + 4)}`,
    );
  });
});

describe('syncStudio', () => {
  it('writes the live studio into the cursor slot without moving the cursor', () => {
    const typed = edited({ species: 'Typed after the act' });

    const history = syncStudio(OPEN, typed);

    expect(history.index).toBe(0);
    expect(currentStudioPosition(history)).toEqual(typed);
  });

  it('returns the same history where nothing has moved', () => {
    expect(syncStudio(OPEN, { ...OPEN_AT })).toBe(OPEN);
  });
});

describe('undoStudio and redoStudio', () => {
  it('keeps edits made after an act, so a redo returns them', () => {
    const switched = recordStudio(OPEN, OPEN_AT, BUILDING);
    const typed: StudioPosition = { ...BUILDING, subject: { ...BUILDING.subject, species: 'Keep' } };

    const back = undoStudio(switched, typed);
    expect(currentStudioPosition(back)).toEqual(OPEN_AT);

    const forward = redoStudio(back, OPEN_AT);
    expect(currentStudioPosition(forward).subject.species).toBe('Keep');
  });

  it('stays where it is at either end of the stack', () => {
    expect(undoStudio(OPEN, OPEN_AT)).toBe(OPEN);
    expect(redoStudio(OPEN, OPEN_AT)).toBe(OPEN);
  });
});
