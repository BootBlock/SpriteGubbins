import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The nanite school’s attacks: a direct hit, an area blast, a lingering searing, a channelled beam, a
 * finisher, a judgement mark and an ultimate.
 *
 * **Seven spellbook slots in one colour, told apart by silhouette.** Every entry is nanite, so the
 * prompt leads each with gold and no look names another school’s hue. What keeps the seven apart on an
 * action bar is the shape each slot keeps on every attack shelf: a projectile for the hit, a ring for
 * the blast, a slow drip or scorch for the searing, a straight beam for the channel, a heavy weapon for
 * the finisher, a marked plate for the judgement and the largest showpiece for the ultimate.
 */
export const NANITE_ATTACKS: IconCatalogueGroup = {
  id: 'nanite-attacks',
  label: 'Nanite attacks',
  kind: 'SPELL',
  entries: [
    {
      id: 'nanite-strike',
      role: 'Nanite direct-hit attack',
      school: 'NANITE',
      looks: {
        FANTASY: 'a golden spear of holy light with a radiant tip',
        AGE_OF_STEAM: 'a burnished brass reflector lamp firing a single golden radium-glow bolt',
        MODERN: 'a black flare pistol firing a blazing yellow-white magnesium flare',
        CYBERPUNK: 'a chrome nano-injector dart with a swirling gold nanobot payload in its glass chamber',
        SPACE_OPERA: 'a white emitter firing a needle-thin golden starlight bolt',
      },
    },
    {
      id: 'nanite-blast',
      role: 'Nanite area blast',
      school: 'NANITE',
      looks: {
        FANTASY: 'a ring of golden holy light bursting outward from a radiant sunburst',
        AGE_OF_STEAM: 'a brass flash-powder lamp bursting in a golden ring of light',
        MODERN: 'a white magnesium flash charge bursting in a round blinding yellow ring',
        CYBERPUNK:
          'a swarm of gold micro-drones bursting outward in a ring from a cracked chrome hive canister',
        SPACE_OPERA: 'a white solar-flare emitter releasing a round golden stellar nova',
      },
    },
    {
      id: 'nanite-over-time',
      role: 'Nanite damage over time',
      school: 'NANITE',
      looks: {
        FANTASY: 'a silver chalice spilling slow drops of golden holy fire',
        AGE_OF_STEAM: 'a glass vial of glowing golden radium paint, a drop beading at its brass spout',
        MODERN: 'a black UV curing lamp searing a steel plate with a steady yellow glow',
        CYBERPUNK: 'a grey-goo cloud of gold nanobots slowly eating a chrome plate down to dust',
        SPACE_OPERA: 'a white hull plate blistering under a lingering golden starlight scorch',
      },
    },
    {
      id: 'nanite-channel',
      role: 'Nanite channelled attack',
      school: 'NANITE',
      looks: {
        FANTASY: 'a golden beam of holy light pouring down from a radiant halo',
        AGE_OF_STEAM: 'a burnished brass searchlight casting a straight golden beam',
        MODERN: 'a black laser designator holding a straight yellow laser beam',
        CYBERPUNK: 'a chrome nano-emitter wand streaming a steady line of gold nanobots',
        SPACE_OPERA: 'a white starlight lance emitter firing a straight golden beam',
      },
    },
    {
      id: 'nanite-finisher',
      role: 'Nanite finisher',
      school: 'NANITE',
      looks: {
        FANTASY: 'a massive divine warhammer smashing down in a golden burst',
        AGE_OF_STEAM: 'a heavy brass-bound radium maul with a glowing golden striking block',
        MODERN: 'a heavy black laser-guided bomb with a yellow designator dot on its nose',
        CYBERPUNK:
          'a chrome nano-injector spike driven down, unleashing a dense gold swarm that disassembles its target',
        SPACE_OPERA: 'a white solar hammer with a captured golden star core, swung down',
      },
    },
    {
      id: 'nanite-vulnerability',
      role: 'Nanite vulnerability debuff',
      school: 'NANITE',
      looks: {
        FANTASY: 'a cracked steel shield with a golden judgement sigil glowing at its centre',
        AGE_OF_STEAM: 'a brass reflector disc focusing a golden glare spot onto a scorched plate',
        MODERN: 'a steel plate with a yellow laser-designator dot inside a crosshair',
        CYBERPUNK:
          'a chrome armour plate with a gold nanobot tracer tag clinging to it, tiny gold specks swarming its seams',
        SPACE_OPERA: 'a white hull plate lit by a golden starlight targeting halo',
      },
    },
    {
      id: 'nanite-ultimate',
      role: 'Nanite ultimate',
      school: 'NANITE',
      looks: {
        FANTASY: 'a colossal golden divine hammer descending through a ring of radiant light',
        AGE_OF_STEAM: 'a towering brass reflector array focusing a vast golden radium beam',
        MODERN: 'a cluster of white magnesium flare bombs blazing with a vast blinding yellow light',
        CYBERPUNK:
          'a vast gold grey-goo nanite cloud pouring from a cracked chrome hive core, dissolving everything it touches',
        SPACE_OPERA: 'a captured golden sun core blazing inside a white containment ring',
      },
    },
  ],
};
