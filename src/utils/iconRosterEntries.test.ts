import { describe, expect, it } from 'vitest';
import { iconCatalogueEntry } from '../constants/iconCatalogue/index.ts';
import type { SheetSubject } from '../types/subject.ts';
import { iconRosterEntries } from './iconRosterEntries.ts';

function subjectWith(picks: readonly string[], setting = 'Near-Future Cyberpunk'): SheetSubject {
  return { anatomy: '', setting, clothing: '', face_head: '', icons: { look: 'ISOLATED_MARK', picks } };
}

describe('iconRosterEntries', () => {
  it('writes one named line per pick, in the roster’s order, opening on the role', () => {
    const lines = iconRosterEntries(subjectWith(['heal-minor', 'system-settings']));
    expect(lines.map((line) => line.label)).toEqual(['heal-minor', 'system-settings']);
    expect(lines[0]).toEqual({
      label: 'heal-minor',
      text: `Minor healing consumable ×1 — ${iconCatalogueEntry('heal-minor')?.looks.CYBERPUNK ?? ''}`,
      count: 1,
      kind: 'structure',
    });
  });

  it('writes a two-state entry as one line of two named drawings', () => {
    const [sound] = iconRosterEntries(subjectWith(['system-sound']));
    const states = iconCatalogueEntry('system-sound')?.states;
    if (sound === undefined || states === undefined) throw new Error('system-sound is not a toggle');

    expect(sound.count).toBe(2);
    expect(sound.parts).toEqual(states.map((state) => `system-sound-${state}`));
    expect(sound.text.startsWith(`Sound ×2, one icon drawn ${states[0]} and then ${states[1]} — `)).toBe(
      true,
    );
  });

  it('says a state’s hyphens as spaces', () => {
    const [ready] = iconRosterEntries(subjectWith(['status-ready-check']));
    expect(ready?.text).toContain('one icon drawn ready and then not ready — ');
  });

  it('skips an id the catalogue does not hold, and draws nothing for no roster', () => {
    const lines = iconRosterEntries(subjectWith(['retired-entry', 'heal-minor']));
    expect(lines.map((line) => line.label)).toEqual(['heal-minor']);
    expect(iconRosterEntries({ anatomy: '', setting: '', clothing: '', face_head: '' })).toEqual([]);
  });
});
