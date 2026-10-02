import { describe, expect, it, vi } from 'vitest';
import type { IconRoster } from '../types/iconRoster.ts';
import { parseIconRoster } from './iconRosterParser.ts';

// A capacity small enough to reach with real catalogue ids; the real figure is held in the catalogue's
// own suite and in the series bound derived from it.
vi.mock('../constants/iconCatalogue/iconSheetLimits.ts', async (original) => ({
  ...(await original<typeof import('../constants/iconCatalogue/iconSheetLimits.ts')>()),
  ICON_ROSTER_CAPACITY: 3,
}));

const FALLBACK: IconRoster = { look: 'ISOLATED_MARK', picks: ['heal-minor'] };

describe('parseIconRoster', () => {
  it('reads a stored roster back unchanged', () => {
    const roster: IconRoster = { look: 'ISOLATED_MARK', picks: ['system-sound', 'heal-major'] };
    expect(parseIconRoster(JSON.parse(JSON.stringify(roster)), FALLBACK)).toEqual(roster);
  });

  it('drops a pick the catalogue no longer holds, and a repeat, keeping the rest in order', () => {
    expect(
      parseIconRoster(
        { look: 'ISOLATED_MARK', picks: ['heal-major', 'retired-entry', 7, 'heal-major', 'elixir'] },
        FALLBACK,
      ),
    ).toEqual({ look: 'ISOLATED_MARK', picks: ['heal-major', 'elixir'] });
  });

  it('falls back field by field where storage was damaged', () => {
    expect(parseIconRoster('not a roster', FALLBACK)).toBe(FALLBACK);
    expect(parseIconRoster(null, FALLBACK)).toBe(FALLBACK);
    expect(parseIconRoster({ look: 'ISOLATED_MARK', picks: 'heal-major' }, FALLBACK)).toEqual(FALLBACK);
    // A look this build does not draw is a retired identifier, which falls back rather than translating.
    expect(parseIconRoster({ look: 'FULL_BLEED_TILE', picks: ['elixir'] }, FALLBACK)).toEqual({
      look: 'ISOLATED_MARK',
      picks: ['elixir'],
    });
  });

  it('stops at the roster’s capacity, counting a two-state entry twice', () => {
    // The capacity is three here (see the mock above), so the toggle that would make four ends the
    // list, and nothing after it is read: a roster is cut where it overflows, never thinned.
    expect(
      parseIconRoster(
        { look: 'ISOLATED_MARK', picks: ['heal-minor', 'heal-major', 'system-sound', 'elixir'] },
        FALLBACK,
      ),
    ).toEqual({ look: 'ISOLATED_MARK', picks: ['heal-minor', 'heal-major'] });
  });
});
