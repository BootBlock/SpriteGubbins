import { describe, expect, it } from 'vitest';
import { DIRECTIONAL_MODES } from '../../types/output.ts';
import { SUBJECT_CATEGORIES } from '../../types/subject.ts';
import type { SubjectCategory } from '../../types/subject.ts';
import { CATEGORY_OPTIONS, defaultSubjectFor } from '../categories/index.ts';
import { DIRECTION_LISTS } from '../promptText/camera.ts';
import { CATEGORY_ASSEMBLY_BASES } from './assemblyBases.ts';
import type { ModePlans } from './modePlans.ts';
import {
  CATEGORY_SHEET_PLANS,
  DEFAULT_MODE_FOR,
  modesWithheldBy,
  plansFor,
  resolveMode,
  supportsMode,
} from './modes.ts';

/**
 * The table of assembly bases whose sheets are not their category's standard ones, held against the
 * pools it quotes and against the plans it stands beside (issue #283).
 *
 * `plansFor` reads this table on every compile, so a key the pool does not offer is a base no reader
 * can pick, and a table that draws what the standard plans already draw is a declaration that changes
 * nothing while still resetting the sheet index whenever a reader chooses it. The studio's half — what
 * a change of base does to the stored sheet mode — is `stores/useSubjectStore.test.ts`, and whether
 * each card says what its category's bases do is `tests/subject-field-inventory.test.ts`.
 */

/** Every declaration, one row per pooled value. */
const DECLARATIONS = SUBJECT_CATEGORIES.flatMap((category) =>
  Object.entries(CATEGORY_ASSEMBLY_BASES[category] ?? {}).map(([value, plans]) => ({
    category,
    value,
    plans,
  })),
);

/**
 * What a plan table draws, as text: every mode it offers and the sheets each takes at every facing list.
 *
 * Read out rather than compared by identity, because the directional builders produce fresh plans on
 * every call — two tables drawing the same sheets are equal only in what they say.
 */
function drawnBy(plans: ModePlans): string {
  return JSON.stringify(
    DIRECTIONAL_MODES.map((mode) => {
      const seriesFor = plans[mode];
      return seriesFor === undefined
        ? null
        : Object.values(DIRECTION_LISTS).map((facings) => seriesFor(facings));
    }),
  );
}

/** The anatomy pool a category offers. */
function anatomyPool(category: SubjectCategory): readonly string[] {
  return CATEGORY_OPTIONS[category].fields.find((field) => field.key === 'anatomy')?.options ?? [];
}

describe('the assembly base table', () => {
  it('reads the pools it is meant to be reading', () => {
    // Every guard below is `it.each` over this list, which asserts nothing for an empty one — the shape
    // a renamed export or a moved table would take.
    expect(DECLARATIONS.length).toBeGreaterThan(0);
  });

  it.each(DECLARATIONS)(
    '$category declares “$value” from its own pool, with plans that draw something else',
    ({ category, value, plans }) => {
      expect(anatomyPool(category)).toContain(value);
      expect(DIRECTIONAL_MODES.some((mode) => plans[mode] !== undefined)).toBe(true);
      expect(drawnBy(plans)).not.toBe(drawnBy(CATEGORY_SHEET_PLANS[category]));
    },
  );

  it.each(SUBJECT_CATEGORIES)(
    '%s shares one table between the values that draw the same sheets',
    (category) => {
      // `plansFor` answers by identity and the studio resets the sheet index only where that identity
      // changes, so two equal tables would move a reader back to sheet one for a change that draws
      // nothing new.
      const byDrawing = new Map<string, ModePlans>();
      for (const plans of Object.values(CATEGORY_ASSEMBLY_BASES[category] ?? {})) {
        const drawing = drawnBy(plans);
        const earlier = byDrawing.get(drawing);
        if (earlier !== undefined) expect(plans).toBe(earlier);
        byDrawing.set(drawing, plans);
      }
    },
  );

  it.each(SUBJECT_CATEGORIES)('%s opens on a base its own default sheet mode can draw', (category) => {
    // A default subject whose base could not be drawn on `DEFAULT_MODE_FOR` would move the sheet mode on
    // every category switch, before the reader had chosen anything.
    expect(supportsMode(category, defaultSubjectFor(category), DEFAULT_MODE_FOR[category])).toBe(true);
  });
});

describe('matching a subject to its base', () => {
  it('reads a typed base however it is cased and spaced', () => {
    const rigid = plansFor('OBJECT', { anatomy: 'Single Rigid Object', clothing: '' });
    expect(rigid).not.toBe(CATEGORY_SHEET_PLANS.OBJECT);
    expect(plansFor('OBJECT', { anatomy: '  single rigid object ', clothing: '' })).toBe(rigid);
  });

  it('draws the standard plans for a base in words the pool does not offer', () => {
    // A guess here would change which components somebody pays a generation for.
    expect(plansFor('OBJECT', { anatomy: 'A rigid object in one piece', clothing: '' })).toBe(
      CATEGORY_SHEET_PLANS.OBJECT,
    );
    expect(plansFor('OBJECT', { anatomy: '', clothing: '' })).toBe(CATEGORY_SHEET_PLANS.OBJECT);
  });

  it('falls back to a mode the base draws where it cannot take the category’s default', () => {
    // BACKGROUND defaults to its parallax set, and a single non-repeating panel is drawn by the layer
    // library alone, so the category default is no answer for it.
    const panel = { anatomy: 'Single Non-Repeating Panel', clothing: '' };
    expect(resolveMode('BACKGROUND', panel, 'TILESET_MODULAR')).toBe('SINGLE_DIRECTION_POSE_LIBRARY');
    // And the category default where the base does draw it, as before any base was declared.
    const rigid = { anatomy: 'Single Rigid Object', clothing: '' };
    expect(resolveMode('OBJECT', rigid, 'CUTOUT_RIG_SINGLE_DIRECTION')).toBe(DEFAULT_MODE_FOR.OBJECT);
  });

  it('names the modes a base withholds, and none for the standard plans', () => {
    expect(modesWithheldBy('OBJECT', { anatomy: 'Single Rigid Object', clothing: '' })).toEqual([
      'CUTOUT_RIG_SINGLE_DIRECTION',
    ]);
    expect(modesWithheldBy('OBJECT', { anatomy: 'Multi-Segment Turret', clothing: '' })).toEqual([]);
    expect(modesWithheldBy('INTERFACE', { anatomy: 'Nine-Slice Stretching Frame', clothing: '' })).toEqual([
      'SINGLE_DIRECTION_POSE_LIBRARY',
    ]);
  });
});
