import { describe, expect, it } from 'vitest';
import { iconCatalogueEntry } from '../iconCatalogue/index.ts';
import { lookFamilyOfWorld } from '../iconCatalogue/lookFamilyOfWorld.ts';
import { lookObject } from '../../test/lookObject.ts';
import { sharedObjects } from '../../test/oneObjectSets.ts';
import { iconPickId } from '../../utils/iconPickId.ts';
import { ICON_SET_PRESETS } from './iconSets.ts';

/**
 * That no ICON preset draws two of its icons as one object (audit finding C1).
 *
 * A preset's roster mixes shelves — the cyberpunk action bar takes restoratives, boosts and throwables
 * — so the per-shelf check in `iconCatalogue.test.ts` cannot see two shelves agreeing on an object. The
 * action bar once drew nine of its sixteen icons as injector pens told apart by hue, which a red–green
 * colour-blind player cannot read; every icon on a sheet now differs in outline, save the tier ladders
 * and marked pairs `ONE_OBJECT_SETS` names.
 */
describe('the ICON presets’ silhouettes', () => {
  it.each(ICON_SET_PRESETS.map((preset) => [preset.name, preset] as const))(
    '%s draws no two of its icons as one object',
    (_name, preset) => {
      const family = lookFamilyOfWorld(preset.subject.setting);
      if (family === null) throw new Error(`${preset.name} names a world no family draws`);
      const picks = (preset.subject.icons?.picks ?? []).map(iconPickId);
      const entries = picks.flatMap((id) => {
        const entry = iconCatalogueEntry(id);
        if (entry === undefined) throw new Error(`${preset.name} picks ${id}, which the catalogue lacks`);
        return entry.figure === true ? [] : [{ id, look: entry.looks[family] }];
      });
      expect(sharedObjects(entries)).toEqual([]);
    },
  );

  it('bites on the action bar the audit found', () => {
    // The cyberpunk looks of four of the nine injector pens C1 counted, as they were.
    const before = [
      { id: 'mana-minor', look: 'a slim cyan neuro-boost auto-injector with a capped needle' },
      { id: 'cure-poison', look: 'a green detox injector with a twin-needle tip' },
      {
        id: 'elixir',
        look: 'a gold-cased military-grade combat injector with a red and cyan double chamber',
      },
      { id: 'boost-strength', look: 'a chunky orange myo-boost injector with a chrome hydraulic piston' },
    ];
    expect(before.map(({ look }) => lookObject(look))).toEqual([
      'injector',
      'injector',
      'injector',
      'injector',
    ]);
    expect(sharedObjects(before)).toEqual([['mana-minor', 'cure-poison', 'elixir', 'boost-strength']]);
  });
});
