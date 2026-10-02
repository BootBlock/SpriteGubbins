import { describe, expect, it } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { RELIC, TOGGLE, customPick } from '../test/customIcons.ts';
import { toggleIconPicks } from './toggleIconPicks.ts';

describe('toggleIconPicks', () => {
  it('ticks into catalogue order and unticks without disturbing the rest', () => {
    const ticked = toggleIconPicks(cataloguePicks(['system-bags']), ['heal-minor'], true, 320);
    expect(ticked).toEqual({ picks: cataloguePicks(['heal-minor', 'system-bags']), refused: [] });

    expect(toggleIconPicks(ticked.picks, ['system-bags'], false, 320)).toEqual({
      picks: cataloguePicks(['heal-minor']),
      refused: [],
    });
  });

  it('refuses each tick past the capacity, counting a two-state entry twice', () => {
    // Two components of three used: the sound toggle needs two and is refused, the pin after it fits.
    const toggled = toggleIconPicks(
      cataloguePicks(['heal-minor', 'heal-major']),
      ['system-sound', 'pin-quest-available'],
      true,
      3,
    );

    expect(toggled.picks).toEqual(cataloguePicks(['heal-minor', 'heal-major', 'pin-quest-available']));
    expect(toggled.refused).toEqual(['system-sound']);
  });

  it('ignores an id the catalogue does not hold, and one already ticked', () => {
    expect(toggleIconPicks(cataloguePicks(['heal-minor']), ['heal-minor', 'retired-icon'], true, 1)).toEqual({
      picks: cataloguePicks(['heal-minor']),
      refused: [],
    });
  });

  it('counts the reader’s own entries against the capacity and never unticks one', () => {
    // The toggle is two components and the relic one, so a capacity of four leaves room for one tick.
    const picks = [customPick(RELIC), customPick(TOGGLE)];
    const ticked = toggleIconPicks(picks, ['heal-minor', 'heal-major'], true, 4);
    expect(ticked.refused).toEqual(['heal-major']);

    const unticked = toggleIconPicks(ticked.picks, [RELIC.id, TOGGLE.id, 'heal-minor'], false, 4);
    expect(unticked.picks).toEqual([customPick(RELIC), customPick(TOGGLE)]);
  });
});
