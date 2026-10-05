import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../categories/index.ts';
import { ICON_CATALOGUE_GROUPS } from '../iconCatalogue/index.ts';
import { DIRECTION_LISTS } from '../promptText/camera.ts';
import { DEFAULT_ICON_LOOK } from '../iconCatalogue/defaultIconLook.ts';
import { ICON_LOOKS } from '../../types/iconRoster.ts';
import type { IconLook } from '../../types/iconRoster.ts';
import type { SheetSubject } from '../../types/subject.ts';
import { componentTotal } from '../../utils/componentTotal.ts';
import { iconSeries } from './icon.ts';
import { ICON_OVERLAY_PLANS } from './iconOverlaySheet.ts';
import { sheetSeriesFor } from './index.ts';
import { cataloguePicks } from '../iconCatalogue/cataloguePicks.ts';
import { iconPickId } from '../../utils/iconPickId.ts';

const SINGLE_ONES = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries)
  .filter((entry) => entry.states === undefined)
  .map((entry) => entry.id);

const ISOLATED_OVERLAY = ICON_OVERLAY_PLANS.ISOLATED_MARK;

function subjectWith(
  picks: readonly string[],
  setting = 'High Fantasy',
  look: IconLook = 'ISOLATED_MARK',
): SheetSubject {
  return {
    anatomy: '',
    setting,
    clothing: '',
    face_head: '',
    icons: { look, colourMode: 'FULL_COLOUR', picks: cataloguePicks(picks) },
  };
}

function seriesOf(subject: SheetSubject) {
  return iconSeries(DIRECTION_LISTS.SINGLE_FRONT, subject);
}

function entriesOf(sheet: ReturnType<typeof seriesOf>[number]) {
  return sheet.groups.flatMap((group) => group.entries);
}

/** Every piece of prose a plan writes outside its entries, joined and with its line breaks folded. */
function proseOf(sheet: ReturnType<typeof seriesOf>[number]): string {
  return [
    sheet.assembly,
    sheet.scaleExample,
    sheet.componentClass,
    ...sheet.groups.flatMap((group) => [group.intro ?? '', group.outro ?? '']),
    ...entriesOf(sheet).map((entry) => entry.text),
  ]
    .join(' ')
    .replaceAll(/\s+/g, ' ');
}

describe('the ICON series', () => {
  it('opens on the overlay sheet, which is all a set with no icons draws', () => {
    // A subject with no roster is only ever hand-built, and takes the default look.
    expect(seriesOf({ anatomy: '', setting: '', clothing: '', face_head: '' })).toEqual([
      ICON_OVERLAY_PLANS[DEFAULT_ICON_LOOK],
    ]);
    expect(seriesOf(subjectWith([]))).toEqual([ISOLATED_OVERLAY]);
  });

  it('draws the starter set on one sheet of sixteen after the overlay sheet, as full-bleed squares', () => {
    const series = sheetSeriesFor(
      'ICON',
      defaultSubjectFor('ICON'),
      'SINGLE_DIRECTION_POSE_LIBRARY',
      'SINGLE_FRONT',
    );
    expect(series.map((sheet) => sheet.name)).toEqual(['Overlay pieces', 'Icons 1–16']);
    expect(entriesOf(series[1] ?? ISOLATED_OVERLAY).map((entry) => entry.label)).toEqual(
      defaultSubjectFor('ICON').icons?.picks.map(iconPickId),
    );
    expect(series[0]).toBe(ICON_OVERLAY_PLANS.FULL_BLEED_TILE);
    expect(series[1]?.backdrop).toBe('OWN_SQUARE');
  });

  it('runs a longer roster to a second sheet, named for the positions it holds', () => {
    const picks = SINGLE_ONES.slice(0, 21);
    const [overlay, first, second, ...rest] = seriesOf(subjectWith(picks));
    expect(overlay).toBe(ISOLATED_OVERLAY);
    expect(rest).toEqual([]);
    expect(first?.name).toBe('Icons 1–16');
    expect(second?.name).toBe('Icons 17–21');
    expect(componentTotal(entriesOf(second ?? ISOLATED_OVERLAY))).toBe(5);
  });

  it('states the grid each sheet holds, and the short last row of a short sheet', () => {
    const [, full, short] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 23)));
    expect(full?.groups[0]?.intro).toContain(
      'Sixteen drawings, four across and four down, in the reading order below.',
    );
    expect(short?.groups[0]?.intro).toContain(
      'Seven drawings, four across and two down, the last row holding three, in the reading order below.',
    );
    const [, one] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 1)));
    expect(one?.groups[0]?.intro).toContain('One drawing, alone in the middle of the sheet.');
    // And names itself with the one position it holds.
    expect(one?.name).toBe('Icon 1');
  });

  it.each(ICON_LOOKS)(
    'tells every %s icon that a colour its own entry names outranks the set’s colours',
    (look) => {
      const [, sheet] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 4), 'High Fantasy', look));
      expect(sheet?.groups[0]?.intro?.replaceAll(/\s+/g, ' ')).toContain(
        'A colour an entry names is that icon’s own, and outranks the set’s primary and accent colours for it',
      );
    },
  );

  it('counts a two-state entry as one icon drawn twice, in drawings rather than icons', () => {
    // A sound toggle and a potion are two icons and three drawings: the grid is stated in drawings,
    // and the intro says what the ×2 line is rather than calling it two different subjects.
    const [, sheet] = seriesOf(subjectWith(['system-sound', 'heal-minor']));
    const intro = sheet?.groups[0]?.intro?.replaceAll(/\s+/g, ' ') ?? '';
    expect(intro).toContain('Three drawings, three across and one down, in the reading order below.');
    expect(intro).toContain('an entry marked ×2 is one icon drawn once in each of its two states');
    expect(intro).not.toMatch(/\bicons,/);
    expect(entriesOf(sheet ?? ISOLATED_OVERLAY)[0]?.text).toMatch(
      /^Sound ×2, one icon drawn unmuted and then muted — /,
    );
  });

  it.each(ICON_LOOKS)(
    'gives every %s icon sheet of a series one assembly sentence, so the series groups them as one run',
    (look) => {
      const [, ...icons] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 40), 'High Fantasy', look));
      expect(icons).toHaveLength(3);
      expect(new Set(icons.map((sheet) => sheet.assembly)).size).toBe(1);
      expect(icons.every((sheet) => sheet.drawnElsewhere === 'clothing')).toBe(true);
    },
  );

  it('draws each icon as its world’s look, and the same icons in another world in that world’s', () => {
    const [, fantasy] = seriesOf(subjectWith(['heal-minor'], 'High Fantasy'));
    const [, cyberpunk] = seriesOf(subjectWith(['heal-minor'], 'Near-Future Cyberpunk'));
    expect(entriesOf(fantasy ?? ISOLATED_OVERLAY)[0]?.text).toContain(
      'a small round glass vial of red potion',
    );
    expect(entriesOf(cyberpunk ?? ISOLATED_OVERLAY)[0]?.text).toContain('stim-pack auto-injector');
  });

  it.each(ICON_LOOKS)(
    'keeps the %s overlay sheet’s state and overlay pieces as the same named slots',
    (look) => {
      const labels = entriesOf(ICON_OVERLAY_PLANS[look]).map((entry) => entry.label);
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
      expect(componentTotal(entriesOf(ICON_OVERLAY_PLANS[look]))).toBe(14);
    },
  );
});

describe('the ICON look', () => {
  // R5 of `docs/todo/done/icon-catalogue.md`: the full-bleed square declares its backdrop, so section 0, the
  // exclusions and the wrappers can follow it, and nothing else does.
  it('declares a backdrop on full-bleed icon sheets alone, never on an overlay sheet', () => {
    const picks = SINGLE_ONES.slice(0, 20);
    const [fullOverlay, ...fullIcons] = seriesOf(subjectWith(picks, 'High Fantasy', 'FULL_BLEED_TILE'));
    const [markOverlay, ...markIcons] = seriesOf(subjectWith(picks, 'High Fantasy', 'ISOLATED_MARK'));

    expect(fullIcons.map((sheet) => sheet.backdrop)).toEqual(['OWN_SQUARE', 'OWN_SQUARE']);
    expect(markIcons.map((sheet) => sheet.backdrop)).toEqual([undefined, undefined]);
    expect(fullOverlay?.backdrop).toBeUndefined();
    expect(markOverlay?.backdrop).toBeUndefined();
  });

  it('describes a full-bleed square edge to edge, with no frame, and a backdrop that is never a scene', () => {
    const [, sheet] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 4), 'High Fantasy', 'FULL_BLEED_TILE'));
    const prose = proseOf(sheet ?? ISOLATED_OVERLAY);
    expect(prose).toContain('a square tile painted edge to edge');
    expect(prose).toContain(
      'with no frame, border or bevel along the tile’s edge, because the interface draws the frame',
    );
    expect(prose).toContain(
      'The backdrop is a field behind the subject, drawn as section [SEC:CONTRACT] states, never a scene with a horizon',
    );
    // Subject Framing's margin is backdrop, so a padded subject never leaves the square unpainted.
    expect(prose).toContain('its backdrop fills the rest of the square to the edge');
  });

  it('keeps every word of a backdrop and a square off the isolated sheets', () => {
    const [overlay, sheet] = seriesOf(subjectWith(SINGLE_ONES.slice(0, 4)));
    for (const plan of [overlay, sheet]) {
      expect(proseOf(plan ?? ISOLATED_OVERLAY)).not.toMatch(/backdrop|square|edge to edge/);
    }
  });

  it('shapes the full-bleed overlay pieces that cover an icon to the square of one tile', () => {
    const text = entriesOf(ICON_OVERLAY_PLANS.FULL_BLEED_TILE).map((entry) => entry.text);
    expect(text.slice(0, 4).every((line) => /square/.test(line))).toBe(true);
    expect(proseOf(ICON_OVERLAY_PLANS.FULL_BLEED_TILE)).toContain(
      'Every piece is drawn to the square of one tile',
    );
  });
});
