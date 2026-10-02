import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../categories/index.ts';
import { ICON_CATALOGUE_GROUPS } from '../iconCatalogue/index.ts';
import { DIRECTION_LISTS } from '../promptText/camera.ts';
import type { SheetSubject } from '../../types/subject.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { iconSeries } from './icon.ts';
import { ICON_OVERLAY_SHEET } from './iconOverlaySheet.ts';
import { sheetSeriesFor } from './index.ts';

const SINGLE_ONES = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries)
  .filter((entry) => entry.states === undefined)
  .map((entry) => entry.id);

function subjectWith(picks: readonly string[], setting = 'High Fantasy'): SheetSubject {
  return { anatomy: '', setting, clothing: '', face_head: '', icons: { look: 'ISOLATED_MARK', picks } };
}

function seriesOf(subject: SheetSubject) {
  return iconSeries(DIRECTION_LISTS.SINGLE_FRONT, subject);
}

function entriesOf(sheet: ReturnType<typeof seriesOf>[number]) {
  return sheet.groups.flatMap((group) => group.entries);
}

describe('the ICON series', () => {
  it('opens on the overlay sheet, which is all a set with no icons draws', () => {
    expect(seriesOf({ anatomy: '', setting: '', clothing: '', face_head: '' })).toEqual([ICON_OVERLAY_SHEET]);
    expect(seriesOf(subjectWith([]))).toEqual([ICON_OVERLAY_SHEET]);
  });

  it('draws the starter set on one sheet of sixteen after the overlay sheet', () => {
    const series = sheetSeriesFor(
      'ICON',
      defaultSubjectFor('ICON'),
      'SINGLE_DIRECTION_POSE_LIBRARY',
      'SINGLE_FRONT',
    );
    expect(series.map((sheet) => sheet.name)).toEqual(['Overlay pieces', 'Icons 1–16']);
    expect(entriesOf(series[1] ?? ICON_OVERLAY_SHEET).map((entry) => entry.label)).toEqual(
      defaultSubjectFor('ICON').icons?.picks,
    );
  });

  it('runs a longer roster to a second sheet, named for the positions it holds', () => {
    const picks = SINGLE_ONES.slice(0, 21);
    const [overlay, first, second, ...rest] = seriesOf(subjectWith(picks));
    expect(overlay).toBe(ICON_OVERLAY_SHEET);
    expect(rest).toEqual([]);
    expect(first?.name).toBe('Icons 1–16');
    expect(second?.name).toBe('Icons 17–21');
    expect(componentTotal(entriesOf(second ?? ICON_OVERLAY_SHEET))).toBe(5);
  });

  it('states the grid each sheet holds, and the short last row of a short sheet', () => {
    const [, full, short] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 23)));
    expect(full?.groups[0]?.intro).toContain(
      'Sixteen icons, four across and four down, in the reading order below.',
    );
    expect(short?.groups[0]?.intro).toContain(
      'Seven icons, four across and two down, the last row holding three, in the reading order below.',
    );
    const [, one] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 1)));
    expect(one?.groups[0]?.intro).toContain('One icon, alone in the middle of the sheet.');
  });

  it('tells every icon that a colour its own entry names outranks the set’s accent', () => {
    const [, sheet] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 4)));
    expect(sheet?.groups[0]?.intro?.replaceAll(/\s+/g, ' ')).toContain(
      'A colour an entry names is that icon’s own, and outranks the set’s accent colour for it',
    );
  });

  it('gives every icon sheet of a series one assembly sentence, so the series groups them as one run', () => {
    const [, ...icons] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 40)));
    expect(icons).toHaveLength(3);
    expect(new Set(icons.map((sheet) => sheet.assembly)).size).toBe(1);
    expect(icons.every((sheet) => sheet.drawnElsewhere === 'clothing')).toBe(true);
  });

  it('draws each icon as its world’s look, and the same icons in another world in that world’s', () => {
    const [, fantasy] = seriesOf(subjectWith(['heal-minor'], 'High Fantasy'));
    const [, cyberpunk] = seriesOf(subjectWith(['heal-minor'], 'Near-Future Cyberpunk'));
    expect(entriesOf(fantasy ?? ICON_OVERLAY_SHEET)[0]?.text).toContain(
      'a small round glass vial of red potion',
    );
    expect(entriesOf(cyberpunk ?? ICON_OVERLAY_SHEET)[0]?.text).toContain('stim-pack auto-injector');
  });

  it('keeps the overlay sheet’s state and overlay pieces, and no changed-state pair', () => {
    const labels = entriesOf(ICON_OVERLAY_SHEET).map((entry) => entry.label);
    expect(labels).toEqual([
      'disabled-veil',
      'highlight-halo',
      'selected-ring',
      'cooldown-sweep',
      'tier-mark',
      'rarity-glow',
      'locked-mark',
      'new-item-flare',
      'broken-overlay',
      'empty-mark',
    ]);
    expect(componentTotal(entriesOf(ICON_OVERLAY_SHEET))).toBe(14);
  });
});
