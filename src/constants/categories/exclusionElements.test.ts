import { describe, expect, it } from 'vitest';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import {
  EXCLUDED_ELEMENTS,
  NON_DEPICTIVE_FIELDS,
  contradictionsIn,
  mentionsTerm,
} from './exclusionElements.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from './index.ts';

/**
 * The table that says which words name the same visible element, held against the pools it is drawn
 * from and against the subject a category switch installs.
 *
 * Five shipped presets and the default CHARACTER subject each banned an element another of their own
 * fields asked for — a holstered sidearm under `No weapons`, a cloak under `No cape`, mounted cannons
 * under `No weapons` — and none of them shared a word between the two halves, which is why a
 * bare-word sweep over the library found nothing and every one of them had to be found by reading.
 * The synonyms are what make the check possible; these tests are what stop the synonym list drifting
 * away from the pools that need it.
 *
 * The other half of the sweep is in `presets/presets.test.ts`, where every per-preset assertion
 * lives. This file holds the table's own guards and the category defaults, because a default subject
 * is assembled from first options rather than chosen — `useSubjectStore` installs one on every
 * category switch and on Reset — so nothing about it is anyone's decision until it is checked.
 */

/** Every option of `category`'s `exclusions` pool. */
function exclusionOptions(category: SubjectCategory): readonly string[] {
  return CATEGORY_OPTIONS[category].fields.find((field) => field.key === 'exclusions')?.options ?? [];
}

/** Every option `category` offers in a field a ban is read against. */
function depictiveOptions(category: SubjectCategory): readonly string[] {
  return CATEGORY_OPTIONS[category].fields
    .filter((field) => !NON_DEPICTIVE_FIELDS.includes(field.key))
    .flatMap((field) => field.options);
}

const ELEMENTS = Object.entries(EXCLUDED_ELEMENTS);

describe('the excluded-element table', () => {
  it('reads the pools it is meant to be reading', () => {
    // A walk that came back empty would make all three guards below vacuous, which is the shape a
    // renamed field key or a moved directory would take.
    expect(ELEMENTS.length).toBeGreaterThan(0);
    for (const category of SUBJECT_CATEGORIES) {
      expect(exclusionOptions(category).length, `${category} offers no exclusions`).toBeGreaterThan(0);
      expect(depictiveOptions(category).length, `${category} offers no attributes`).toBeGreaterThan(0);
    }
  });

  it.each(ELEMENTS)('%s is one a single category can both ban and ask for', (element, entry) => {
    // The element guard. A category that bans a thing it cannot name, or names a thing it never
    // bans, cannot produce this defect — so an entry no *one* category holds both halves of is
    // covering nothing, and the first draft of the table carried four of them.
    const live = SUBJECT_CATEGORIES.filter(
      (category) =>
        exclusionOptions(category).some((option) => entry.bans.some((ban) => mentionsTerm(option, ban))) &&
        depictiveOptions(category).some((option) => entry.names.some((name) => mentionsTerm(option, name))),
    );

    expect(live, `no category both bans and names “${element}”`).not.toEqual([]);
  });

  it.each(ELEMENTS)('%s bans only phrases an exclusions pool writes', (element, entry) => {
    // The term guard, ban side. Each phrase is quoted from a pool option, so one that stops matching
    // has had its option reworded — and the element is then banned by nothing.
    for (const ban of entry.bans) {
      const pools = SUBJECT_CATEGORIES.filter((category) =>
        exclusionOptions(category).some((option) => mentionsTerm(option, ban)),
      );
      expect(pools, `“${ban}” bans “${element}” in no pool`).not.toEqual([]);
    }
  });

  it.each(ELEMENTS)('%s is named only in words the app writes', (element, entry) => {
    // The term guard, name side. A synonym no pool spells is one no configuration can trip over, so
    // it is vocabulary this table invented rather than vocabulary it collected.
    for (const name of entry.names) {
      const pools = SUBJECT_CATEGORIES.filter((category) =>
        depictiveOptions(category).some((option) => mentionsTerm(option, name)),
      );
      expect(pools, `“${name}” names “${element}” in no pool`).not.toEqual([]);
    }
  });

  it('matches a term as a whole word, in the singular or the plural', () => {
    // What the two guards above rest on, and the three readings that would break them. `Eyeless` and
    // `Faceplate` are live pool options, and reporting either as a facial feature is the false
    // positive that would make this check unusable.
    expect(mentionsTerm('Mounted Energy Cannons', 'cannon')).toBe(true);
    expect(mentionsTerm('Eyeless Sensing Slits', 'eye')).toBe(false);
    expect(mentionsTerm('Faceplate & Optic Lenses', 'face')).toBe(false);
    expect(mentionsTerm('Holstered Sidearm & Pouch', 'holster')).toBe(false);
  });
});

describe('the subject a category switch installs', () => {
  it.each(SUBJECT_CATEGORIES)('%s does not ban what its own defaults ask for', (category) => {
    // `defaultSubjectFor` takes the first option of all sixteen pools, so the pairing is a
    // consequence of pool order rather than anybody's choice — which is how the CHARACTER default
    // came to ask for a `Holstered Sidearm & Pouch` under `No weapons, no floor shadows`, and to keep
    // asking for it long after the preset spelling the same subject out was the reported defect.
    const contradictions = contradictionsIn(defaultSubjectFor(category)).map(
      ({ element, field, value, term }) => `${field} “${value}” asks for a ${element} (${term})`,
    );

    expect(contradictions, `${category}’s default subject cancels itself`).toEqual([]);
  });
});
