import { describe, expect, it } from 'vitest';
import { CATEGORY_DIRECTION_SETS } from '../constants/categoryDirectionSets.ts';
import { modesFor, sheetSeriesFor } from '../constants/sheetPlans/index.ts';
import type { DirectionSet } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import { componentCountFor } from './componentSet.ts';
import { componentSlots } from './componentSlots.ts';

/** A tail and a pair of horns, so every walk below carries anatomy as well as the plan's own. */
const ANATOMY = [
  { name: 'Demon Horn', count: 2 },
  { name: 'Tail', count: 1 },
] as const;

/** Every sheet the studio can reach, which is the set both counts have to agree over. */
const SHEETS = SUBJECT_CATEGORIES.flatMap((category) =>
  modesFor(category).flatMap((mode) =>
    (CATEGORY_DIRECTION_SETS[category] as readonly DirectionSet[]).flatMap((directions) =>
      sheetSeriesFor(category, mode, directions).map((plan, sheetIndex) => ({
        category,
        mode,
        directions,
        sheetIndex,
        sheet: plan.name,
      })),
    ),
  ),
);

describe('one name per component the sheet asks for', () => {
  it.each(SHEETS)(
    '$category / $mode / $directions / $sheet',
    ({ category, mode, directions, sheetIndex }) => {
      const slots = componentSlots(category, mode, directions, sheetIndex, '', ANATOMY);

      // The property the manifest rests on: the nth sprite in reading order is the nth component, so a
      // name list of a different length maps every sprite after the divergence onto the wrong one.
      expect(slots).toHaveLength(componentCountFor(category, mode, directions, sheetIndex, '', ANATOMY));
      expect(new Set(slots).size).toBe(slots.length);
      for (const slot of slots) expect(slot).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    },
  );
});

describe('what a name says', () => {
  it('names a directional core by its facing, in the order the inventory lists them', () => {
    const slots = componentSlots('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', 'FOUR_CARDINAL', 0, '', []);

    expect(slots).toStrictEqual([
      'heads-south',
      'heads-west',
      'heads-north',
      'heads-east',
      'torsos-south',
      'torsos-west',
      'torsos-north',
      'torsos-east',
      'pelvises-south',
      'pelvises-west',
      'pelvises-north',
      'pelvises-east',
    ]);
  });

  it('names each piece of a rig from the line that lists it', () => {
    // The reported defect: fifteen rig pieces cut out as `01-trunk-1.png` through `15-right-leg-3.png`,
    // where the sheet's own inventory calls them the head, the torso, the pelvis and three segments a
    // side. An engine importer keys a piece by its slot, so every one of them had to be renamed by
    // hand against a table held somewhere else.
    const slots = componentSlots('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 'FOUR_CARDINAL', 0, '', []);

    expect(slots).toStrictEqual([
      'head',
      'torso',
      'pelvis',
      'left-upper-arm',
      'left-lower-arm',
      'left-hand',
      'right-upper-arm',
      'right-lower-arm',
      'right-hand',
      'left-upper-leg',
      'left-lower-leg',
      'left-foot',
      'right-upper-leg',
      'right-lower-leg',
      'right-foot',
    ]);
  });

  it('numbers the copies of a named part inside its own name', () => {
    // The pose library's arm line is eight *variants* of three named segments, so the name says both
    // halves: which segment, and which of that segment's copies. `left-arm-4` said neither.
    const slots = componentSlots('CHARACTER', 'SINGLE_DIRECTION_POSE_LIBRARY', 'FOUR_CARDINAL', 0, '', []);

    expect(slots.slice(0, 6)).toStrictEqual([
      'head',
      'torso',
      'pelvis',
      'left-upper-arm-1',
      'left-upper-arm-2',
      'left-upper-arm-3',
    ]);
  });

  it('leaves a genuine ×N line on its ordinals', () => {
    // `Base material tile ×6: the primary, and five variants differing only in surface scatter` has no
    // name to give its second variant that its third does not equally answer to. An ordinal is what
    // such a component is actually called, so the entry states no parts and the suffix stands.
    const slots = componentSlots('TERRAIN', 'TILESET_MODULAR', 'SINGLE_FRONT', 0, '', []);

    expect(slots.slice(0, 6)).toStrictEqual([
      'base-material-tile-1',
      'base-material-tile-2',
      'base-material-tile-3',
      'base-material-tile-4',
      'base-material-tile-5',
      'base-material-tile-6',
    ]);
  });

  it('appends the subject’s own anatomy last, once per facing where the sheet turns it', () => {
    const slots = componentSlots('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', 'FOUR_CARDINAL', 0, '', ANATOMY);

    // Last because grid position is the only thing identifying a component: interleaving would
    // renumber every entry the plan promised. The facing is the outer axis, the ×2 copies together.
    expect(slots.slice(12)).toStrictEqual([
      'demon-horn-1-south',
      'demon-horn-2-south',
      'demon-horn-1-west',
      'demon-horn-2-west',
      'demon-horn-1-north',
      'demon-horn-2-north',
      'demon-horn-1-east',
      'demon-horn-2-east',
      'tail-south',
      'tail-west',
      'tail-north',
      'tail-east',
    ]);
  });

  it('carries no anatomy on a sheet whose inventory does not', () => {
    // The articulation sheets are runs that are not the series' trunk, so a tail beside them would
    // hang on nothing — the same answer `anatomyFacingsFor` gives the prompt.
    const slots = componentSlots('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', 'FOUR_CARDINAL', 1, '', ANATOMY);

    expect(slots.some((slot) => slot.startsWith('tail'))).toBe(false);
  });

  it('gives a component whose name is not an identifier its position instead', () => {
    // A name in a non-Latin script, or in punctuation alone, is a perfectly good thing to write in
    // the prompt and cannot be a file name. Without the fallback the manifest states an empty name
    // while claiming the sheet is named, and the pack writes an entry called `16-.png`.
    const slots = componentSlots('CHARACTER', 'SINGLE_DIRECTION_POSE_LIBRARY', 'FOUR_CARDINAL', 0, '', [
      { name: '尻尾', count: 1 },
      { name: '???', count: 1 },
    ]);

    expect(slots.slice(-2)).toStrictEqual(['component-38', 'component-39']);
    expect(slots.every((slot) => slot !== '')).toBe(true);
  });

  it('does not hand a later component a name it has just given away', () => {
    // Counting occurrences alone renames the second `tail` to `tail-2` and then hands the genuine
    // `Tail 2` that name as well — two sprites answering to one name, which is two entries at one
    // path in a pack and only one of them surviving extraction.
    const slots = componentSlots('CHARACTER', 'SINGLE_DIRECTION_POSE_LIBRARY', 'FOUR_CARDINAL', 0, '', [
      { name: 'Tail', count: 1 },
      { name: 'Tail', count: 1 },
      { name: 'Tail 2', count: 1 },
    ]);

    expect(slots.slice(-3)).toStrictEqual(['tail', 'tail-2', 'tail-2-2']);
  });

  it('separates two components a subject named the same thing', () => {
    const slots = componentSlots('CHARACTER', 'SINGLE_DIRECTION_POSE_LIBRARY', 'FOUR_CARDINAL', 0, '', [
      { name: 'Tail', count: 1 },
      { name: 'tail', count: 1 },
    ]);

    expect(slots.slice(-2)).toStrictEqual(['tail', 'tail-2']);
  });
});
