import { describe, expect, it } from 'vitest';
import { DIRECTIONAL_MODES } from '../../types/output.ts';
import { SUBJECT_CATEGORIES, SUBJECT_FIELD_KEYS } from '../../types/subject.ts';
import { modePlansOf } from '../sheetPlans/index.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from './index.ts';
import { MODE_BOUND_OPTIONS, modesAgreeingWith } from './modeBoundOptions.ts';

/**
 * The table of values only some of a category's sheets agree with, held against the pools it quotes
 * and against the subject a category switch installs.
 *
 * The presets are the other half, in `presets/presets.test.ts`. This file holds the table's own guards
 * and the category defaults, because a default subject is assembled from first options rather than
 * chosen — `useSubjectStore` installs one on every category switch and on Reset — so nothing about it
 * is anyone's decision until it is checked.
 */

/** Every declaration, one row per value. */
const BINDINGS = SUBJECT_CATEGORIES.flatMap((category) =>
  SUBJECT_FIELD_KEYS.flatMap((key) =>
    Object.entries(MODE_BOUND_OPTIONS[category]?.[key] ?? {}).map(([value, modes]) => ({
      category,
      key,
      value,
      modes,
    })),
  ),
);

describe('the mode-bound option table', () => {
  it('reads the pools it is meant to be reading', () => {
    // A walk that came back empty would make every guard below vacuous, which is the shape a renamed
    // field key or a moved table would take.
    expect(BINDINGS.length).toBeGreaterThan(0);
  });

  it.each(BINDINGS)(
    '$category.$key binds “$value” as a pooled value, to some of the modes its category offers',
    ({ category, key, value, modes }) => {
      // Both checks that read the table take a value missing from it as tied to no mode. So a value the
      // pool does not offer binds nothing without saying so, a mode the category cannot compile names a
      // sheet that does not exist, and a list of every mode the category offers is no binding at all —
      // which is also why a single-mode category declares nothing.
      // Every mode some plan table of the category draws, whichever assembly base selects it.
      const offered = DIRECTIONAL_MODES.filter((mode) =>
        modePlansOf(category).some((plans) => plans[mode] !== undefined),
      );
      const pool = CATEGORY_OPTIONS[category].fields.find((field) => field.key === key)?.options ?? [];

      expect(pool).toContain(value);
      expect(modes.length).toBeGreaterThan(0);
      expect(modes.length).toBeLessThan(offered.length);
      expect(new Set(modes).size).toBe(modes.length);
      for (const mode of modes) expect(offered).toContain(mode);
    },
  );
});

describe('the subject a category switch installs', () => {
  it.each(SUBJECT_CATEGORIES)(
    '%s opens every pool on a value each of its sheet modes agrees with',
    (category) => {
      // The reported defect (issue #280). `defaultSubjectFor` takes every pool's first option, and the
      // store keeps that subject when the reader changes sheet mode, so a bound value here reaches section
      // 1 of a sheet that contradicts it before anyone has touched a field. BACKGROUND opened on
      // `Short Repeat, One Screen Wide`, which told the layer library how long its band repeats, and on
      // `Single Non-Repeating Panel`, which told the parallax set it never repeats.
      const subject = defaultSubjectFor(category);
      const bound = SUBJECT_FIELD_KEYS.flatMap((key) => {
        const modes = modesAgreeingWith(category, key, subject[key]);
        return modes === null ? [] : [`${key} “${subject[key]}” agrees only with ${modes.join(' and ')}`];
      });

      expect(bound, `${category}’s default subject contradicts one of its own sheets`).toEqual([]);
    },
  );
});
