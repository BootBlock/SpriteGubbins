import { describe, expect, it } from 'vitest';
import { iconCatalogueEntry, iconCatalogueGroupOf } from '../iconCatalogue/index.ts';
import { lookFamilyOfWorld } from '../iconCatalogue/lookFamilyOfWorld.ts';
import { lookObject } from '../../test/lookObject.ts';
import { ONE_OBJECT_GROUPS } from '../../test/oneObjectGroups.ts';
import { sharedObjects } from '../../test/sharedObjects.ts';
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
 *
 * An icon from a shelf drawn as one marked carrier (`ONE_OBJECT_GROUPS`: the chat bubbles, the emotes'
 * hands and faces, the pet commands' paw prints) is left out, as the per-shelf check leaves it out. So
 * the Cyberpunk Emote Wheel, every icon of which is an emote, is the one preset this cannot read.
 */

/** A preset's icons as their looks in its world, leaving out the shelves of one marked carrier. */
function readableIcons(preset: (typeof ICON_SET_PRESETS)[number]): readonly { id: string; look: string }[] {
  const family = lookFamilyOfWorld(preset.subject.setting);
  if (family === null) throw new Error(`${preset.name} names a world no family draws`);
  return (preset.subject.icons?.picks ?? []).map(iconPickId).flatMap((id) => {
    const entry = iconCatalogueEntry(id);
    if (entry === undefined) throw new Error(`${preset.name} picks ${id}, which the catalogue lacks`);
    return ONE_OBJECT_GROUPS.has(iconCatalogueGroupOf(id)?.id ?? '')
      ? []
      : [{ id, look: entry.looks[family] }];
  });
}

const READABLE = ICON_SET_PRESETS.filter((preset) => readableIcons(preset).length > 0);
describe('the ICON presets’ silhouettes', () => {
  it.each(READABLE.map((preset) => [preset.name, preset] as const))(
    '%s draws no two of its icons as one object',
    (_name, preset) => {
      expect(sharedObjects(readableIcons(preset))).toEqual([]);
    },
  );

  it('reads every preset but the emote wheel', () => {
    const unread = ICON_SET_PRESETS.filter((preset) => !READABLE.includes(preset)).map(
      (preset) => preset.name,
    );
    expect(unread).toEqual(['Cyberpunk Emote Wheel']);
  });

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
