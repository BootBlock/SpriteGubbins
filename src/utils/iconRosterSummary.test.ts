import { describe, expect, it } from 'vitest';
import type { IconRosterTally } from './iconRosterTally.ts';
import { iconRosterSummary } from './iconRosterSummary.ts';

/** A tally whose every icon is an item, `custom` of them the reader's own. */
function items(icons: number, custom = 0): IconRosterTally {
  return {
    icons,
    components: icons,
    byKind: { ITEM: icons, SPELL: 0, SOCIAL: 0, COMPANION: 0, PROFESSION: 0, SYSTEM: 0 },
    custom,
  };
}

describe('iconRosterSummary', () => {
  it('states icons, components against the capacity, and sheets with the overlay sheet named', () => {
    const summary = iconRosterSummary(
      {
        icons: 20,
        components: 21,
        byKind: { ITEM: 8, SPELL: 5, SOCIAL: 1, COMPANION: 0, PROFESSION: 0, SYSTEM: 6 },
        custom: 0,
      },
      { icons: 2, overlays: 1 },
    );

    expect(summary.sentence).toBe(
      '20 icons, drawn as 21 of the 320 components a set can hold, on 3 sheets: 2 icon sheets and the overlay sheet.',
    );
    expect(summary.kinds).toBe(
      'Items and consumables: 8. Spells and abilities: 5. Emotes, chat and factions: 1. Mounts and pets: 0. Professions: 0. Interface and system: 6.',
    );
    expect(summary.digest).toBe('20 icons · 3 sheets');
  });

  it('agrees in number at one', () => {
    const summary = iconRosterSummary(items(1), { icons: 1, overlays: 1 });

    expect(summary.sentence).toBe(
      '1 icon, drawn as 1 of the 320 components a set can hold, on 2 sheets: 1 icon sheet and the overlay sheet.',
    );
    expect(summary.digest).toBe('1 icon · 2 sheets');
  });

  it.each([
    [3, 20, '20 icons, 3 of them your own, drawn as 20 of the 320'],
    [20, 20, '20 icons, all your own, drawn as 20 of the 320'],
    [1, 1, '1 icon, your own, drawn as 1 of the 320'],
  ])('says %i of %i icons are the reader’s own', (custom, icons, opening) => {
    expect(
      iconRosterSummary(items(icons, custom), { icons: 2, overlays: 1 }).sentence.startsWith(opening),
    ).toBe(true);
  });

  it('counts the overlay sheets where the extra pieces fill more than one', () => {
    const summary = iconRosterSummary(items(20), { icons: 2, overlays: 2 });

    expect(summary.sentence).toBe(
      '20 icons, drawn as 20 of the 320 components a set can hold, on 4 sheets: 2 icon sheets and 2 overlay sheets.',
    );
    expect(summary.digest).toBe('20 icons · 4 sheets');
    expect(iconRosterSummary(items(0), { icons: 0, overlays: 2 }).sentence).toBe(
      'No icons are ticked, so the series is 2 overlay sheets alone. A set holds up to 320 components.',
    );
  });

  it('says an empty set is the overlay sheet alone', () => {
    const summary = iconRosterSummary(items(0), { icons: 0, overlays: 1 });

    expect(summary.sentence).toBe(
      'No icons are ticked, so the series is the overlay sheet alone. A set holds up to 320 components.',
    );
    expect(summary.digest).toBe('0 icons · 1 sheet');
  });
});
