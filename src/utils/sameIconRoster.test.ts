import { describe, expect, it } from 'vitest';
import type { IconRoster } from '../types/iconRoster.ts';
import { sameIconRoster } from './sameIconRoster.ts';

const ROSTER: IconRoster = { look: 'ISOLATED_MARK', picks: ['heal-minor', 'mana-minor'] };

describe('sameIconRoster', () => {
  it('compares two rosters by value', () => {
    expect(sameIconRoster(ROSTER, { look: 'ISOLATED_MARK', picks: ['heal-minor', 'mana-minor'] })).toBe(true);
  });

  it('tells apart a roster with another pick, another order or one pick more', () => {
    expect(sameIconRoster(ROSTER, { ...ROSTER, picks: ['heal-minor', 'heal-major'] })).toBe(false);
    expect(sameIconRoster(ROSTER, { ...ROSTER, picks: ['mana-minor', 'heal-minor'] })).toBe(false);
    expect(sameIconRoster(ROSTER, { ...ROSTER, picks: [...ROSTER.picks, 'elixir'] })).toBe(false);
  });

  it('holds two absent rosters the same, and an absent one apart from any roster', () => {
    expect(sameIconRoster(undefined, undefined)).toBe(true);
    expect(sameIconRoster(undefined, { look: 'ISOLATED_MARK', picks: [] })).toBe(false);
  });
});
