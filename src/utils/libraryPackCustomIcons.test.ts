import { describe, expect, it } from 'vitest';
import { DEFAULT_PROJECT_ID, createDefaultProject } from '../constants/projects.ts';
import { RELIC, SPELL, TOGGLE } from '../test/customIcons.ts';
import { HARBOUR, savedIcon } from '../test/iconLibraryStudio.ts';
import { libraryPackSize, parseLibraryPack, serialiseLibraryPack } from './libraryPack.ts';

/**
 * Each project's icon library in the library pack: carried out and read back whole, and every entry
 * read in held to the rules the icon form holds a reader to, so a hand-written or hostile pack can put
 * nothing on a roster the compiler would throw on or cut two sprites to one file.
 */

const NOW = 5_000;

function parse(pack: unknown) {
  return parseLibraryPack(JSON.stringify(pack), NOW);
}

/** The icons a pack holding `customIcons`, and the two projects, reads back as. */
function iconsOf(customIcons: readonly unknown[]) {
  return parse({ projects: [createDefaultProject(1), HARBOUR], customIcons })?.customIcons;
}

describe('the library pack’s icon libraries', () => {
  it('carries every project’s library out and reads it back whole', () => {
    const before = {
      projects: [createDefaultProject(1), HARBOUR],
      presets: [],
      quantisePresets: [],
      customIcons: [savedIcon(RELIC), savedIcon(SPELL, HARBOUR.id), savedIcon(TOGGLE, HARBOUR.id)],
    };

    const after = parseLibraryPack(serialiseLibraryPack(before), NOW);

    expect(after?.customIcons).toEqual(before.customIcons);
    expect(after === null ? 0 : libraryPackSize(after)).toBe(5);
  });

  it('reads a file holding icons alone as a pack', () => {
    expect(parse({ customIcons: [savedIcon(RELIC)] })?.customIcons).toEqual([savedIcon(RELIC)]);
  });

  it.each([
    ['a square bracket', { ...RELIC, look: 'a relic [SEC:X]' }],
    ['a count', { ...RELIC, role: 'Arrow ×5' }],
    ['a long dash in a role', { ...RELIC, role: 'Relic — of the deep' }],
    ['a slot the catalogue answers to', { ...RELIC, role: 'Heal minor' }],
    ['a slot the overlay sheet answers to', { ...RELIC, role: 'Cooldown sweep' }],
    ['a school on an item', { ...RELIC, school: 'THERMAL' }],
    ['a spell with no school', { ...SPELL, school: undefined }],
    ['a kind this build does not know', { ...RELIC, kind: 'VEHICLE' }],
    ['states that repeat', { ...TOGGLE, states: ['on', 'On'] }],
    ['a look of no words', { ...RELIC, look: '   ' }],
  ])('leaves out an entry with %s, and keeps the rest', (_, entry) => {
    expect(iconsOf([{ id: 'hostile', projectId: DEFAULT_PROJECT_ID, entry }, savedIcon(SPELL)])).toEqual([
      savedIcon(SPELL),
    ]);
  });

  it('leaves out an entry with no id, no entry, or no record at all', () => {
    expect(
      iconsOf([
        { projectId: DEFAULT_PROJECT_ID, entry: RELIC },
        { id: 'empty', projectId: DEFAULT_PROJECT_ID },
        'not an entry',
        null,
        savedIcon(SPELL),
      ]),
    ).toEqual([savedIcon(SPELL)]);
  });

  it('derives the slot from the role rather than trusting the file’s', () => {
    expect(iconsOf([{ ...savedIcon(RELIC), entry: { ...RELIC, id: 'heal-minor' } }])).toEqual([
      savedIcon(RELIC),
    ]);
  });

  it('files an entry naming no project, or one the file does not carry, under Default', () => {
    const pack = parse({
      projects: [HARBOUR],
      customIcons: [
        { id: 'a', entry: RELIC },
        { id: 'b', projectId: 'gone', entry: SPELL },
      ],
    });

    expect(pack?.customIcons.map((icon) => icon.projectId)).toEqual([DEFAULT_PROJECT_ID, DEFAULT_PROJECT_ID]);
    expect(pack?.projects.map((project) => project.id)).toEqual([HARBOUR.id, DEFAULT_PROJECT_ID]);
  });

  it('keeps the first of two entries under one id, or one slot in one project', () => {
    const second = { ...savedIcon(RELIC), id: 'another-row', entry: { ...RELIC, look: 'a second relic' } };
    expect(iconsOf([savedIcon(RELIC), { ...savedIcon(SPELL), id: savedIcon(RELIC).id }, second])).toEqual([
      savedIcon(RELIC),
    ]);
  });

  it('keeps one slot in two projects, since each project’s library is its own', () => {
    expect(iconsOf([savedIcon(RELIC), savedIcon(RELIC, HARBOUR.id)])).toEqual([
      savedIcon(RELIC),
      savedIcon(RELIC, HARBOUR.id),
    ]);
  });

  it('drops an entry whose slot a kept pair’s drawing answers to', () => {
    // The toggle draws `cloak-field-engaged`, so an icon named “Cloak field engaged” would share its file.
    const clash = { ...RELIC, role: 'Cloak field engaged' };
    expect(
      iconsOf([savedIcon(TOGGLE), { id: 'clash', projectId: DEFAULT_PROJECT_ID, entry: clash }]),
    ).toEqual([savedIcon(TOGGLE)]);
  });
});
