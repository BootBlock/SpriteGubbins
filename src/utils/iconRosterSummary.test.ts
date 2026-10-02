import { describe, expect, it } from 'vitest';
import { iconRosterSummary } from './iconRosterSummary.ts';

describe('iconRosterSummary', () => {
  it('states icons, components against the capacity, and sheets with the overlay sheet named', () => {
    const summary = iconRosterSummary({ icons: 20, components: 21, byKind: { ITEM: 14, SYSTEM: 6 } }, 3);

    expect(summary.sentence).toBe(
      '20 icons, drawn as 21 of the 320 components a set can hold, on 3 sheets: the overlay sheet and 2 icon sheets.',
    );
    expect(summary.kinds).toBe('Items and consumables: 14. Interface and system: 6.');
    expect(summary.digest).toBe('20 icons · 3 sheets');
  });

  it('agrees in number at one', () => {
    const summary = iconRosterSummary({ icons: 1, components: 1, byKind: { ITEM: 1, SYSTEM: 0 } }, 2);

    expect(summary.sentence).toBe(
      '1 icon, drawn as 1 of the 320 components a set can hold, on 2 sheets: the overlay sheet and 1 icon sheet.',
    );
    expect(summary.digest).toBe('1 icon · 2 sheets');
  });

  it('says an empty set is the overlay sheet alone', () => {
    const summary = iconRosterSummary({ icons: 0, components: 0, byKind: { ITEM: 0, SYSTEM: 0 } }, 1);

    expect(summary.sentence).toBe(
      'No icons are ticked, so the series is the overlay sheet alone. A set holds up to 320 components.',
    );
    expect(summary.digest).toBe('0 icons · 1 sheet');
  });
});
