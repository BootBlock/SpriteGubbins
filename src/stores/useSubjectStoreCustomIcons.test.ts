import { beforeEach, describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { CUSTOM_ICON_REFUSALS } from '../constants/iconCatalogue/customIconRefusals.ts';
import { cataloguePicks } from '../constants/iconCatalogue/cataloguePicks.ts';
import { ICON_CATALOGUE_GROUPS } from '../constants/iconCatalogue/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { RELIC, RELIC_DRAFT, SPELL, TOGGLE, customPick } from '../test/customIcons.ts';
import { customIconDraftOf } from '../utils/customIconDraftOf.ts';
import type { IconPick } from '../types/iconRoster.ts';
import { iconPickId } from '../utils/iconPickId.ts';
import { canRedoStudio, canUndoStudio } from '../utils/studioHistory.ts';
import { useOutputStore } from './useOutputStore.ts';
import { useSubjectStore } from './useSubjectStore.ts';

/**
 * The store's actions on the reader's own icons: each one act on the studio's undo stack, each checked
 * by `checkCustomIcon` before it lands, each keeping the roster in shelving order and the sheet index
 * inside the series.
 */

function iconStudio(picks: readonly IconPick[]): void {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useSubjectStore.setState({
    category: 'ICON',
    subject: { ...defaultSubjectFor('ICON'), icons: { look: 'ISOLATED_MARK', picks } },
  });
  useSubjectStore.getState().openStudio();
}

function picks(): readonly IconPick[] {
  return useSubjectStore.getState().subject.icons?.picks ?? [];
}

function ids(): readonly string[] {
  return picks().map(iconPickId);
}

describe('useSubjectStore — the reader’s own icons', () => {
  beforeEach(() => {
    iconStudio(cataloguePicks(['heal-minor', 'system-bags']));
  });

  it('adds an entry at the end of its kind’s shelves, as one act Undo and Redo step over', () => {
    expect(useSubjectStore.getState().addCustomIcon(RELIC_DRAFT, [])).toEqual([]);
    expect(picks()).toEqual([
      ...cataloguePicks(['heal-minor']),
      customPick(RELIC),
      ...cataloguePicks(['system-bags']),
    ]);

    useSubjectStore.getState().undoStudio();
    expect(ids()).toEqual(['heal-minor', 'system-bags']);
    useSubjectStore.getState().redoStudio();
    expect(ids()).toEqual(['heal-minor', RELIC.id, 'system-bags']);
  });

  it('refuses a draft the check refuses, changing and recording nothing', () => {
    const hostile = { ...RELIC_DRAFT, look: 'a relic [SEC:X]' };
    const refusals = useSubjectStore.getState().addCustomIcon(hostile, []);

    expect(refusals.map((refusal) => refusal.message)).toEqual([CUSTOM_ICON_REFUSALS.brackets('look')]);
    expect(ids()).toEqual(['heal-minor', 'system-bags']);
    expect(canUndoStudio(useSubjectStore.getState().history)).toBe(false);
  });

  it('refuses a second entry answering to the same slot name', () => {
    useSubjectStore.getState().addCustomIcon(RELIC_DRAFT, []);
    const refusals = useSubjectStore.getState().addCustomIcon({ ...RELIC_DRAFT, look: 'a second relic' }, []);
    expect(refusals.map((refusal) => refusal.field)).toEqual(['role']);
    expect(ids().filter((id) => id === RELIC.id)).toHaveLength(1);
  });

  it('changes an entry in place, keeping its slot when its role stays, as one act', () => {
    iconStudio([customPick(RELIC), customPick({ ...RELIC, id: 'second-relic', role: 'Second relic' })]);

    expect(
      useSubjectStore.getState().updateCustomIcon(RELIC.id, { ...RELIC_DRAFT, look: 'a cracked card' }, []),
    ).toEqual([]);
    expect(picks()[0]).toEqual(customPick({ ...RELIC, look: 'a cracked card' }));
    expect(ids()).toEqual([RELIC.id, 'second-relic']);

    useSubjectStore.getState().undoStudio();
    expect(picks()[0]).toEqual(customPick(RELIC));
  });

  it('renames an entry’s slot with its role, and moves it after the new kind’s own entries', () => {
    // The toggle is already the reader's own SYSTEM entry, so a relic moved to SYSTEM goes after it:
    // replaced in place, it would have kept its earlier position and sorted before the toggle.
    iconStudio([
      ...cataloguePicks(['heal-minor']),
      customPick(RELIC),
      ...cataloguePicks(['system-bags']),
      customPick(TOGGLE),
    ]);
    useSubjectStore
      .getState()
      .updateCustomIcon(RELIC.id, { ...RELIC_DRAFT, role: 'Vault pass', kind: 'SYSTEM' }, []);
    expect(ids()).toEqual(['heal-minor', 'system-bags', TOGGLE.id, 'vault-pass']);
  });

  it('keeps an entry’s place among its kind’s own entries when its kind stays', () => {
    const second = { ...RELIC, id: 'second-relic', role: 'Second relic' };
    iconStudio([customPick(RELIC), customPick(second)]);
    useSubjectStore.getState().updateCustomIcon(RELIC.id, { ...RELIC_DRAFT, role: 'First relic' }, []);
    expect(ids()).toEqual(['first-relic', 'second-relic']);
  });

  it('refuses a change to an entry the set no longer holds, and changes nothing', () => {
    iconStudio([...cataloguePicks(['heal-minor']), customPick(RELIC)]);
    useSubjectStore.getState().clearIcons();
    const refusals = useSubjectStore
      .getState()
      .updateCustomIcon(RELIC.id, { ...RELIC_DRAFT, look: 'a cracked card' }, []);

    expect(refusals.map((refusal) => refusal.message)).toEqual([CUSTOM_ICON_REFUSALS.gone]);
    expect(picks()).toEqual([]);
  });

  it('records nothing for a change that changes nothing', () => {
    iconStudio([customPick(RELIC)]);
    useSubjectStore.getState().updateCustomIcon(RELIC.id, RELIC_DRAFT, []);
    expect(canUndoStudio(useSubjectStore.getState().history)).toBe(false);
  });

  it('removes an entry as one act, which Undo brings back', () => {
    iconStudio([...cataloguePicks(['heal-minor']), customPick(RELIC), customPick(TOGGLE)]);

    useSubjectStore.getState().removeCustomIcon(RELIC.id);
    expect(ids()).toEqual(['heal-minor', TOGGLE.id]);

    useSubjectStore.getState().undoStudio();
    expect(ids()).toEqual(['heal-minor', RELIC.id, TOGGLE.id]);
    expect(canRedoStudio(useSubjectStore.getState().history)).toBe(true);
  });

  it('pulls the sheet index back inside a series a removal shortens, in the same act', () => {
    // Sixteen one-component icons fill one sheet, so the reader's relic opens a second.
    const sixteen = ICON_CATALOGUE_GROUPS.flatMap((group) => group.entries)
      .filter((entry) => entry.states === undefined)
      .slice(0, 16)
      .map((entry) => entry.id);
    iconStudio(cataloguePicks(sixteen));
    useSubjectStore.getState().addCustomIcon(customIconDraftOf(SPELL), []);
    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 2 } });
    useSubjectStore.getState().openStudio();

    useSubjectStore.getState().removeCustomIcon(SPELL.id);
    expect(useOutputStore.getState().output.sheetIndex).toBe(1);

    useSubjectStore.getState().undoStudio();
    expect(useOutputStore.getState().output.sheetIndex).toBe(2);
  });

  it('does nothing on a subject with no roster', () => {
    useSubjectStore.getState().setCategory('CHARACTER');
    useSubjectStore.getState().openStudio();
    expect(useSubjectStore.getState().addCustomIcon(RELIC_DRAFT, [])).toEqual([]);
    expect(useSubjectStore.getState().subject.icons).toBeUndefined();
    expect(canUndoStudio(useSubjectStore.getState().history)).toBe(false);
  });

  it('refuses a slot the project’s library holds, and lets a change keep its own library slot', () => {
    // The library's relic is not ticked, and a second icon named for it could never share a set with it.
    expect(
      useSubjectStore
        .getState()
        .addCustomIcon(RELIC_DRAFT, [RELIC])
        .map((refusal) => refusal.field),
    ).toEqual(['role']);
    expect(ids()).toEqual(['heal-minor', 'system-bags']);

    // The set's copy of a library entry is the same slot, so changing it is measured as the slot gone.
    iconStudio([customPick(RELIC)]);
    expect(
      useSubjectStore
        .getState()
        .updateCustomIcon(RELIC.id, { ...RELIC_DRAFT, look: 'a cracked card' }, [RELIC]),
    ).toEqual([]);
    expect(picks()).toEqual([customPick({ ...RELIC, look: 'a cracked card' })]);
  });

  it('takes the reader’s own entries off the set with the rest when it is cleared', () => {
    iconStudio([...cataloguePicks(['heal-minor']), customPick(RELIC)]);
    useSubjectStore.getState().clearIcons();
    expect(picks()).toEqual([]);
    useSubjectStore.getState().undoStudio();
    expect(ids()).toEqual(['heal-minor', RELIC.id]);
  });
});
