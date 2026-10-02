import { describe, expect, it } from 'vitest';
import { toggleIconPicks } from './toggleIconPicks.ts';

describe('toggleIconPicks', () => {
  it('ticks into catalogue order and unticks without disturbing the rest', () => {
    const ticked = toggleIconPicks(['system-bags'], ['heal-minor'], true, 320);
    expect(ticked).toEqual({ picks: ['heal-minor', 'system-bags'], refused: [] });

    expect(toggleIconPicks(ticked.picks, ['system-bags'], false, 320)).toEqual({
      picks: ['heal-minor'],
      refused: [],
    });
  });

  it('refuses each tick past the capacity, counting a two-state entry twice', () => {
    // Two components of three used: the sound toggle needs two and is refused, the pin after it fits.
    const toggled = toggleIconPicks(
      ['heal-minor', 'heal-major'],
      ['system-sound', 'pin-quest-available'],
      true,
      3,
    );

    expect(toggled.picks).toEqual(['heal-minor', 'heal-major', 'pin-quest-available']);
    expect(toggled.refused).toEqual(['system-sound']);
  });

  it('ignores an id the catalogue does not hold, and one already ticked', () => {
    expect(toggleIconPicks(['heal-minor'], ['heal-minor', 'retired-icon'], true, 1)).toEqual({
      picks: ['heal-minor'],
      refused: [],
    });
  });
});
