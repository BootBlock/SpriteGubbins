import { defaultSubjectFor } from '../constants/categories/index.ts';
import { ICON_CATALOGUE_GROUPS, iconComponentCount } from '../constants/iconCatalogue/index.ts';
import { chunkEntries } from '../utils/chunkEntries.ts';
import { ICON_ROSTER_CAPACITY } from '../constants/iconCatalogue/iconSheetLimits.ts';
import { LOOK_FAMILY_OF_WORLD } from '../constants/iconCatalogue/lookFamilyOfWorld.ts';
import { LOOK_FAMILIES } from '../types/iconCatalogue.ts';
import type { IconRoster } from '../types/iconRoster.ts';
import type { SubjectDefinition } from '../types/subject.ts';

/**
 * A world the look-family table does not name, which draws every icon from its role.
 *
 * Typed rather than pooled on purpose: it is the reader who writes their own world, and the fallback
 * sentence is what a sweep has to see compiled.
 */
export const UNMAPPED_WORLD = 'Clockwork Moon Colony';

/**
 * The whole catalogue as rosters, in catalogue order, each holding as many entries as the roster's
 * capacity allows — one roster while the catalogue fits in one, and as many as it takes once it does not.
 */
export function iconCatalogueRosters(): readonly IconRoster[] {
  const lines = ICON_CATALOGUE_GROUPS.flatMap((group) =>
    group.entries.map((entry) => ({ id: entry.id, count: iconComponentCount(entry) })),
  );
  return chunkEntries(lines, ICON_ROSTER_CAPACITY).map((run) => ({
    look: 'ISOLATED_MARK',
    picks: run.map((line) => line.id),
  }));
}

/**
 * One world per look family, in `LOOK_FAMILIES` order, then {@link UNMAPPED_WORLD} — the worlds that
 * between them send a reader every look the catalogue writes and the hand-typed fallback.
 */
export function everyLookWorld(): readonly string[] {
  return [
    ...LOOK_FAMILIES.map((family) => {
      const world = Object.keys(LOOK_FAMILY_OF_WORLD).find(
        (option) => LOOK_FAMILY_OF_WORLD[option] === family,
      );
      if (world === undefined) throw new Error(`No World & Era option draws from ${family}`);
      return world;
    }),
    UNMAPPED_WORLD,
  ];
}

/**
 * ICON subjects that between them draw every catalogue entry: each whole-catalogue roster under each of
 * `worlds` — `base`'s own world unless a sweep names more.
 *
 * **What a sweep over "every sheet ICON can compile" walks.** ICON's sheets are built from the roster, so
 * the starter set's sixteen icons are a sample of the catalogue rather than the catalogue, and a check
 * holding every sheet to a rule has to meet every entry. A structural sweep, which reads plans and
 * compiles nothing, can afford {@link everyLookWorld} as well; a sweep compiling a prompt per sheet
 * walks one world, and the catalogue's own suite holds every look to the rules a look can break. The
 * rest of the subject is `base`, so a suite compiling from these still carries every field section 1
 * does.
 */
export function iconCatalogueSubjects(
  base: SubjectDefinition = defaultSubjectFor('ICON'),
  worlds: readonly string[] = [base.setting],
): readonly SubjectDefinition[] {
  return iconCatalogueRosters().flatMap((icons) => worlds.map((setting) => ({ ...base, setting, icons })));
}
