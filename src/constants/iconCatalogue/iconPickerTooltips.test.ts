import { describe, expect, it, vi } from 'vitest';
import { ICON_KINDS } from '../../types/iconCatalogue.ts';
import { ICON_PICKER_TOOLTIPS } from './iconPickerTooltips.ts';

/**
 * That the kind filter's card names each kind by the label the filter offers it under.
 *
 * The labels are moved to wording no card would type, so a card that had copied them out would go on
 * naming the old ones and fail here; every kind must appear, so a kind added without a word in the
 * card fails too.
 */
vi.mock('./iconKindLabels.ts', () => ({
  ICON_KIND_LABELS: { ITEM: 'Moved item shelves', SYSTEM: 'Moved system shelves' },
}));

describe('ICON_PICKER_TOOLTIPS.kind', () => {
  it.each(ICON_KINDS)('names %s by its label', (kind) => {
    const moved = { ITEM: 'Moved item shelves', SYSTEM: 'Moved system shelves' }[kind];
    expect(ICON_PICKER_TOOLTIPS.kind).toContain(`_${moved}_`);
  });

  it('copies no label out by hand', () => {
    expect(ICON_PICKER_TOOLTIPS.kind).not.toContain('Items and consumables');
    expect(ICON_PICKER_TOOLTIPS.kind).not.toContain('Interface and system');
  });
});
