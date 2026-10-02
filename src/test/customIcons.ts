import { defaultSubjectFor } from '../constants/categories/index.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import type { CustomIconDraft } from '../types/customIconDraft.ts';
import type { CustomIconEntry, IconPick } from '../types/iconRoster.ts';
import type { SubjectDefinition } from '../types/subject.ts';

/**
 * Entries of the reader's own for the suites to put on a roster: one of each shape a custom entry can
 * take — an item, a spell with its school, a two-state toggle, and an emote that shows a figure — each
 * as `checkCustomIcon` would make it from the draft beside it.
 */

export const RELIC_DRAFT: CustomIconDraft = {
  role: 'Nightcity Keycard Relic',
  kind: 'ITEM',
  school: null,
  figure: false,
  states: null,
  look: 'a scorched brass keycard on a snapped chain',
};

export const RELIC: CustomIconEntry = {
  id: 'nightcity-keycard-relic',
  role: 'Nightcity Keycard Relic',
  kind: 'ITEM',
  look: 'a scorched brass keycard on a snapped chain',
};

export const SPELL: CustomIconEntry = {
  id: 'grid-collapse',
  role: 'Grid collapse',
  kind: 'SPELL',
  school: 'VOLTAIC',
  look: 'a crumpling cube of power lines folding in on itself',
};

export const TOGGLE: CustomIconEntry = {
  id: 'cloak-field',
  role: 'Cloak field',
  kind: 'SYSTEM',
  states: ['engaged', 'idle'],
  look: 'a hexagonal shimmer panel over a slim emitter',
};

export const SALUTE: CustomIconEntry = {
  id: 'gang-salute',
  role: 'Gang salute',
  kind: 'SOCIAL',
  figure: true,
  look: 'a raised gloved hand with chrome knuckles',
};

/**
 * An entry written to every limit `CUSTOM_ICON_LIMITS` allows — the longest role, look and states, a
 * spell's school and a figure — so the longest card a row of the reader's own can carry is measured.
 */
export const LONGEST_CUSTOM_ICON: CustomIconEntry = {
  id: 'relic-of-a-drowned-chrome-saint-of-the-old-grids',
  role: 'Relic of a drowned chrome saint of the old grids',
  kind: 'SPELL',
  school: 'NEURAL',
  figure: true,
  states: ['awake-and-burning-bright', 'asleep-under-cold-static'],
  look: 'a cracked chrome reliquary held in a gloved hand, its glass cut into facets, a violet storm caught inside it, wires trailing from its base like roots, a halo of drifting sparks above it, worn by age',
};

/** An entry of the reader's own as a roster holds it. */
export function customPick(entry: CustomIconEntry): IconPick {
  return { source: 'CUSTOM', entry };
}

/** The draft that makes `entry` again, as the form would hand it over. */
export function draftOf(entry: CustomIconEntry): CustomIconDraft {
  return {
    role: entry.role,
    kind: entry.kind,
    school: entry.school ?? null,
    figure: entry.figure === true,
    states: entry.states ?? null,
    look: entry.look,
  };
}

/**
 * An ICON subject holding a catalogue pick and one entry of each custom shape, in the shelving order a
 * parsed roster comes back in — what the persistence suites write and expect to read back.
 */
export function customIconSubject(): SubjectDefinition {
  return {
    ...defaultSubjectFor('ICON'),
    setting: 'Near-Future Cyberpunk',
    icons: {
      look: 'FULL_BLEED_TILE',
      picks: [
        ...cataloguePicks(['heal-minor']),
        customPick(RELIC),
        customPick(SPELL),
        customPick(SALUTE),
        customPick(TOGGLE),
      ],
    },
  };
}

/**
 * {@link customIconSubject} as storage might hold it after a hand edit: one more entry, whose look cites
 * a section no prompt carries — what the compiler would throw on if the parser let it through.
 */
export function hostileStoredSubject(): unknown {
  const subject = customIconSubject();
  const hostile = {
    source: 'CUSTOM',
    entry: { ...RELIC, id: 'hostile-relic', role: 'Hostile relic', look: 'a relic [SEC:X]' },
  };
  return JSON.parse(
    JSON.stringify({
      ...subject,
      icons: { ...subject.icons, picks: [...(subject.icons?.picks ?? []), hostile] },
    }),
  );
}
