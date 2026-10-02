import { describe, expect, it, vi } from 'vitest';
import { CUSTOM_ICON_REFUSALS } from '../constants/iconCatalogue/customIconRefusals.ts';
import { ICON_CAPACITY_NOTICES } from '../constants/iconCatalogue/iconCapacityNotices.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import {
  LONGEST_CUSTOM_ICON,
  RELIC,
  RELIC_DRAFT,
  SPELL,
  TOGGLE,
  customPick,
  draftOf,
} from '../test/customIcons.ts';
import type { CustomIconDraft, CustomIconField } from '../types/customIconDraft.ts';
import { checkCustomIcon } from './checkCustomIcon.ts';

// A capacity a few entries fill, so the refusal for a full set is reachable; the real figure is held by
// the catalogue's own suite.
vi.mock('../constants/iconCatalogue/iconSheetLimits.ts', async (original) => ({
  ...(await original<typeof import('../constants/iconCatalogue/iconSheetLimits.ts')>()),
  ICON_ROSTER_CAPACITY: 4,
}));

/** The fields a check refused, in the order it refused them. */
function refusedFields(
  draft: Partial<CustomIconDraft>,
  picks = cataloguePicks(['heal-minor']),
): CustomIconField[] {
  return checkCustomIcon({ ...RELIC_DRAFT, ...draft }, picks, null).refusals.map((refusal) => refusal.field);
}

/** The messages a check refused with. */
function messages(draft: Partial<CustomIconDraft>, picks = cataloguePicks(['heal-minor'])): string[] {
  return checkCustomIcon({ ...RELIC_DRAFT, ...draft }, picks, null).refusals.map(
    (refusal) => refusal.message,
  );
}

describe('checkCustomIcon — what it accepts', () => {
  it('makes the entry a draft describes, its slot name derived from the role', () => {
    expect(checkCustomIcon(RELIC_DRAFT, cataloguePicks(['heal-minor']), null)).toEqual({
      entry: RELIC,
      refusals: [],
    });
  });

  it('makes a spell with its school, a pair with its states as slugs, and a figure', () => {
    expect(checkCustomIcon(draftOf(SPELL), [], null).entry).toEqual(SPELL);
    const typed = { ...draftOf(TOGGLE), states: ['  Engaged ', 'IDLE'] as const };
    expect(checkCustomIcon(typed, [], null).entry).toEqual(TOGGLE);
    expect(checkCustomIcon({ ...RELIC_DRAFT, figure: true }, [], null).entry).toEqual({
      ...RELIC,
      figure: true,
    });
  });

  it('collapses whitespace, line breaks included, and keeps the reader’s own punctuation', () => {
    const { entry } = checkCustomIcon(
      { ...RELIC_DRAFT, role: '  Nightcity’s   keycard ', look: 'a brass card,\n  “scorched” at one end' },
      [],
      null,
    );
    expect(entry?.role).toBe('Nightcity’s keycard');
    expect(entry?.id).toBe('nightcity-s-keycard');
    expect(entry?.look).toBe('a brass card, “scorched” at one end');
  });

  it('accepts texts at their limits exactly', () => {
    expect(refusedFields({ role: `R${'o'.repeat(47)}`, look: 'a'.repeat(200) }, [])).toEqual([]);
    expect(refusedFields({ states: ['o'.repeat(24), 'off'] }, [])).toEqual([]);
    expect(checkCustomIcon(draftOf(LONGEST_CUSTOM_ICON), [], null).entry).toEqual(LONGEST_CUSTOM_ICON);
  });

  it('measures a changed entry as if the one it replaces were gone', () => {
    const picks = [customPick(RELIC)];
    expect(checkCustomIcon({ ...RELIC_DRAFT, look: 'a cracked card' }, picks, RELIC.id).entry?.look).toBe(
      'a cracked card',
    );
    expect(refusedFields({}, picks)).toEqual(['role']);
  });
});

describe('checkCustomIcon — what it refuses', () => {
  it('refuses an empty role and look, and a role with no plain letter or digit', () => {
    expect(messages({ role: '   ', look: '' })).toEqual([
      CUSTOM_ICON_REFUSALS.roleEmpty,
      CUSTOM_ICON_REFUSALS.lookEmpty,
    ]);
    expect(messages({ role: '¿¡ — ¿¡' })).toEqual([CUSTOM_ICON_REFUSALS.roleUnnamed]);
  });

  it('refuses a text past its limit, saying how long it is', () => {
    expect(messages({ role: 'R'.repeat(49) })).toEqual([CUSTOM_ICON_REFUSALS.tooLong('role', 49)]);
    expect(messages({ look: 'a'.repeat(201) })).toEqual([CUSTOM_ICON_REFUSALS.tooLong('look', 201)]);
    expect(refusedFields({ states: ['o'.repeat(25), 'off'] })).toEqual(['firstState']);
  });

  it.each([
    ['role', { role: 'Relic [SEC:X]' }],
    ['look', { look: 'a relic [SEC:X]' }],
    ['firstState', { states: ['[SEC:X]', 'off'] as const }],
    ['secondState', { states: ['on', 'off]'] as const }],
  ] as const)(
    'refuses a square bracket in the %s, which the compiler would read as a citation',
    (field, draft) => {
      const found = checkCustomIcon({ ...RELIC_DRAFT, ...draft }, [], null);
      expect(found.entry).toBeNull();
      expect(found.refusals.map((refusal) => refusal.field)).toContain(field);
      expect(found.refusals.map((refusal) => refusal.message).join(' ')).toContain('square bracket');
    },
  );

  it('refuses a state with no plain letter or digit, and two states of one name', () => {
    expect(messages({ states: ['', '…'] })).toEqual([
      CUSTOM_ICON_REFUSALS.stateEmpty('first'),
      CUSTOM_ICON_REFUSALS.stateEmpty('second'),
    ]);
    expect(messages({ states: ['On', 'on!'] })).toEqual([CUSTOM_ICON_REFUSALS.sameStates]);
  });

  it('refuses a spell with no school, and a school on any other kind', () => {
    expect(messages({ kind: 'SPELL', school: null })).toEqual([CUSTOM_ICON_REFUSALS.schoolMissing]);
    expect(messages({ kind: 'ITEM', school: 'CRYO' })).toEqual([CUSTOM_ICON_REFUSALS.schoolStray]);
  });

  it.each([
    ['a catalogue entry’s id', 'Heal minor', 'heal-minor', 'the catalogue’s “Minor healing consumable”'],
    ['a catalogue pair’s drawing', 'System sound muted', 'system-sound-muted', 'the catalogue’s “Sound”'],
    ['an overlay piece', 'Locked mark', 'locked-mark', 'a piece of the overlay sheet'],
    ['an overlay piece’s drawing', 'Tier mark 2', 'tier-mark-2', 'a piece of the overlay sheet'],
    [
      'an entry of the reader’s own',
      'Nightcity  keycard relic!',
      'nightcity-keycard-relic',
      'your own “Nightcity Keycard Relic”',
    ],
  ])('refuses a role whose slot name %s already answers to', (_what, role, slot, owner) => {
    const found = messages({ role }, [customPick(RELIC)]);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain(`\`${slot}\``);
    expect(found[0]).toContain(owner);
  });

  it('refuses a pair whose drawing would take a slot something else answers to', () => {
    // `cloak-field-engaged` is the toggle's first drawing, so an entry named that collides with it.
    const found = messages({ role: 'Cloak field engaged' }, [customPick(TOGGLE)]);
    expect(found[0]).toContain('`cloak-field-engaged`');
    const pair = messages({ role: 'Cloak', states: ['field engaged', 'idle'] }, [
      customPick({ ...RELIC, id: 'cloak-field-engaged' }),
    ]);
    expect(pair[0]).toContain('`cloak-field-engaged`');
  });

  it('refuses an entry the set has no room for, counting a pair twice', () => {
    const full = cataloguePicks(['heal-minor', 'heal-major', 'mana-minor']);
    expect(refusedFields({}, full)).toEqual([]);
    expect(messages({ states: ['on', 'off'] }, full)).toEqual([ICON_CAPACITY_NOTICES.row(2, 1)]);
    expect(refusedFields({}, [...full, ...cataloguePicks(['elixir'])])).toEqual(['set']);
  });

  it('reports every refusal at once, and makes no entry', () => {
    const found = checkCustomIcon(
      { ...RELIC_DRAFT, role: '', look: '[x]', kind: 'SPELL', school: null },
      [],
      null,
    );
    expect(found.entry).toBeNull();
    expect(found.refusals.map((refusal) => refusal.field)).toEqual(['look', 'role', 'school']);
  });
});
