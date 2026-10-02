import { describe, expect, it, vi } from 'vitest';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { RELIC, SPELL, TOGGLE, customPick } from '../test/customIcons.ts';
import { ICON_LOOKS } from '../types/iconRoster.ts';
import type { IconRoster } from '../types/iconRoster.ts';
import { parseIconRoster } from './iconRosterParser.ts';

// A capacity small enough to reach with real catalogue ids; the real figure is held in the catalogue's
// own suite and in the series bound derived from it.
vi.mock('../constants/iconCatalogue/iconSheetLimits.ts', async (original) => ({
  ...(await original<typeof import('../constants/iconCatalogue/iconSheetLimits.ts')>()),
  ICON_ROSTER_CAPACITY: 3,
}));

const FALLBACK: IconRoster = { look: 'ISOLATED_MARK', picks: cataloguePicks(['heal-minor']) };

/** A roster as storage holds it: written out and read back as plain JSON. */
function stored(picks: readonly unknown[], look = 'ISOLATED_MARK'): unknown {
  return JSON.parse(JSON.stringify({ look, picks }));
}

/** A custom pick as storage holds it, with some of its entry's fields replaced. */
function storedCustom(fields: Record<string, unknown>): unknown {
  return { source: 'CUSTOM', entry: { ...RELIC, ...fields } };
}

describe('parseIconRoster', () => {
  it.each(ICON_LOOKS)('reads a stored %s roster back unchanged', (look) => {
    const roster: IconRoster = { look, picks: cataloguePicks(['heal-major', 'system-sound']) };
    expect(parseIconRoster(stored(roster.picks, look), FALLBACK)).toEqual(roster);
  });

  it('drops a pick the catalogue no longer holds, and a repeat, keeping the rest in order', () => {
    const picks = [
      ...cataloguePicks(['heal-major', 'retired-entry']),
      7,
      ...cataloguePicks(['heal-major', 'elixir']),
    ];
    expect(parseIconRoster(stored(picks), FALLBACK)).toEqual({
      look: 'ISOLATED_MARK',
      picks: cataloguePicks(['heal-major', 'elixir']),
    });
  });

  it('drops a pick stored before picks were tagged, as a retired shape', () => {
    // A bare id was a pick before the reader's own entries arrived; it is not translated.
    expect(parseIconRoster(stored(['heal-major', ...cataloguePicks(['elixir'])]), FALLBACK)).toEqual({
      look: 'ISOLATED_MARK',
      picks: cataloguePicks(['elixir']),
    });
  });

  it('falls back field by field where storage was damaged', () => {
    expect(parseIconRoster('not a roster', FALLBACK)).toBe(FALLBACK);
    expect(parseIconRoster(null, FALLBACK)).toBe(FALLBACK);
    expect(parseIconRoster({ look: 'ISOLATED_MARK', picks: 'heal-major' }, FALLBACK)).toEqual(FALLBACK);
    // A look this build does not draw is a retired identifier, which falls back rather than translating.
    expect(parseIconRoster(stored(cataloguePicks(['elixir']), 'EMBOSSED_BUTTON'), FALLBACK)).toEqual({
      look: 'ISOLATED_MARK',
      picks: cataloguePicks(['elixir']),
    });
  });

  it('stops at the roster’s capacity, counting a two-state entry twice', () => {
    // The capacity is three here (see the mock above), so the toggle that would make four ends the
    // list, and nothing after it is read: a roster is cut where it overflows, never thinned.
    const picks = cataloguePicks(['heal-minor', 'heal-major', 'system-sound', 'elixir']);
    expect(parseIconRoster(stored(picks), FALLBACK)).toEqual({
      look: 'ISOLATED_MARK',
      picks: cataloguePicks(['heal-minor', 'heal-major']),
    });
  });
});

describe('parseIconRoster — the reader’s own entries', () => {
  it('reads an item, a spell and a pair back unchanged, in the order they were stored', () => {
    const picks = [customPick(SPELL), ...cataloguePicks(['heal-minor']), customPick(RELIC)];
    expect(parseIconRoster(stored(picks), FALLBACK)).toEqual({ look: 'ISOLATED_MARK', picks });
    expect(parseIconRoster(stored([customPick(TOGGLE)]), FALLBACK).picks).toEqual([customPick(TOGGLE)]);
  });

  it.each([
    ['[SEC:X] in its look', { look: 'a relic marked [SEC:X]' }],
    ['[SEC:X] in its role', { role: 'Relic [SEC:X]' }],
    ['a bracket in a state', { states: ['on', '[off]'] }],
    ['an empty role', { role: '   ' }],
    ['an empty look', { look: '' }],
    ['a look past its limit', { look: 'a'.repeat(201) }],
    ['a role with no plain letter', { role: '¿¡' }],
    ['a kind this build does not shelve', { kind: 'MOUNT' }],
    ['a school on an item', { school: 'CRYO' }],
    ['a spell with no school', { kind: 'SPELL' }],
    ['a school this build does not hold', { kind: 'SPELL', school: 'PSYCHIC' }],
    ['a figure that is not `true`', { figure: 'yes' }],
    ['states that are not a pair', { states: ['on'] }],
    ['two states of one name', { states: ['On', 'on'] }],
    ['a role that is not text', { role: 7 }],
    ['the slot of a catalogue entry', { role: 'Heal minor' }],
    ['the slot of an overlay piece', { role: 'Locked mark' }],
  ])('drops an entry with %s, keeping the rest', (_what, fields) => {
    const picks = [...cataloguePicks(['heal-minor']), storedCustom(fields)];
    expect(parseIconRoster(stored(picks), FALLBACK).picks).toEqual(cataloguePicks(['heal-minor']));
  });

  it('keeps the first of two entries answering to one slot name', () => {
    const twin = { ...RELIC, look: 'a second relic' };
    expect(parseIconRoster(stored([customPick(RELIC), customPick(twin)]), FALLBACK).picks).toEqual([
      customPick(RELIC),
    ]);
  });

  it('derives the slot name from the role rather than trusting the stored one', () => {
    const picks = [storedCustom({ id: 'heal-minor', role: 'Vault relic' })];
    expect(parseIconRoster(stored(picks), FALLBACK).picks).toEqual([
      customPick({ ...RELIC, id: 'vault-relic', role: 'Vault relic' }),
    ]);
  });

  it('counts a custom pair twice against the capacity', () => {
    const picks = [...cataloguePicks(['heal-minor', 'heal-major']), customPick(TOGGLE), customPick(RELIC)];
    expect(parseIconRoster(stored(picks), FALLBACK).picks).toEqual(
      cataloguePicks(['heal-minor', 'heal-major']),
    );
  });
});
