import { describe, expect, it, vi } from 'vitest';
import { DAMAGE_SCHOOLS, ICON_KINDS } from '../../types/iconCatalogue.ts';
import { DAMAGE_SCHOOL_DEFINITIONS } from './damageSchools.ts';
import { ICON_PICKER_TOOLTIPS } from './iconPickerTooltips.ts';

/**
 * That the kind filter's card names each kind by the label the filter offers it under, and the school
 * filter's card names each school and its colour.
 *
 * The labels are moved to wording no card would type, so a card that had copied them out would go on
 * naming the old ones and fail here; every kind must appear, so a kind added without a word in the
 * card fails too.
 */
const MOVED = {
  ITEM: 'Moved item shelves',
  SPELL: 'Moved spell shelves',
  SOCIAL: 'Moved social shelves',
  COMPANION: 'Moved companion shelves',
  PROFESSION: 'Moved profession shelves',
  SYSTEM: 'Moved system shelves',
} as const;

vi.mock('./iconKindLabels.ts', () => ({
  ICON_KIND_LABELS: {
    ITEM: 'Moved item shelves',
    SPELL: 'Moved spell shelves',
    SOCIAL: 'Moved social shelves',
    COMPANION: 'Moved companion shelves',
    PROFESSION: 'Moved profession shelves',
    SYSTEM: 'Moved system shelves',
  },
}));

describe('ICON_PICKER_TOOLTIPS.kind', () => {
  it.each(ICON_KINDS)('names %s by its label', (kind) => {
    expect(ICON_PICKER_TOOLTIPS.kind).toContain(`_${MOVED[kind]}_`);
  });

  it('copies no label out by hand', () => {
    expect(ICON_PICKER_TOOLTIPS.kind).not.toContain('Items and consumables');
    expect(ICON_PICKER_TOOLTIPS.kind).not.toContain('Spells and abilities');
    expect(ICON_PICKER_TOOLTIPS.kind).not.toContain('Interface and system');
  });
});

describe('ICON_PICKER_TOOLTIPS.school', () => {
  it.each(DAMAGE_SCHOOLS)('names %s and its colour', (school) => {
    const { label, hex } = DAMAGE_SCHOOL_DEFINITIONS[school];
    expect(ICON_PICKER_TOOLTIPS.school).toContain(`${label} ${hex}`);
  });

  it('names the kind it is offered under by that kind’s label', () => {
    expect(ICON_PICKER_TOOLTIPS.school).toContain(`_${MOVED.SPELL}_`);
  });
});
