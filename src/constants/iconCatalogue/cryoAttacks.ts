import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The cryo school’s attacks: a direct hit, an area blast, a frostbite, a channelled freezing stream, a
 * finisher, a brittleness mark and an ultimate.
 *
 * **Seven spellbook slots in one colour, told apart by silhouette.** Every entry is cryo, so the prompt
 * leads each with ice cyan and no look names another school’s hue. What keeps the seven apart on an
 * action bar is the shape each slot keeps on every attack shelf: a projectile for the hit, a ring for
 * the blast, creeping frost for the frostbite, a straight stream for the channel, a heavy weapon for
 * the finisher, a crazed plate for the brittleness and the largest showpiece for the ultimate.
 */
export const CRYO_ATTACKS: IconCatalogueGroup = {
  id: 'cryo-attacks',
  label: 'Cryo attacks',
  kind: 'SPELL',
  entries: [
    {
      id: 'cryo-strike',
      role: 'Cryo direct-hit attack',
      school: 'CRYO',
      looks: {
        FANTASY: 'a jagged ice shard flying point-first, trailing a wake of frost crystals',
        AGE_OF_STEAM: 'a brass air-rifle dart tipped with a spike of frozen brine',
        MODERN: 'a steel dart with a frosted cyan liquid-nitrogen tip and a vapour trail',
        CYBERPUNK:
          'a cryo-round in a chrome casing with a glowing cyan coolant core, frost cracking across its tip',
        SPACE_OPERA: 'a white cryonic bolt shaped like a long crystal spear, leaving a cyan frost wake',
      },
    },
    {
      id: 'cryo-blast',
      role: 'Cryo area blast',
      school: 'CRYO',
      looks: {
        FANTASY: 'a ring of jagged ice spikes erupting outward from a frozen cyan core',
        AGE_OF_STEAM: 'a riveted brass ice-box condenser bursting open in a ring of frozen brine shards',
        MODERN: 'a white carbon-dioxide canister bursting into a round cloud of freezing white vapour',
        CYBERPUNK:
          'a ruptured chrome coolant line spraying a ring of cyan coolant that freezes into icicles as it flies',
        SPACE_OPERA: 'a white absolute-zero field generator throwing out a round cyan frost nova',
      },
    },
    {
      id: 'cryo-over-time',
      role: 'Cryo damage over time',
      school: 'CRYO',
      looks: {
        FANTASY: 'a long icicle dripping cyan meltwater, its tip pale with frost',
        AGE_OF_STEAM: 'a frost-rimed brass pipe valve dripping icy brine that freezes into icicles',
        MODERN:
          'a cracked liquid-nitrogen dewar flask with pale vapour spilling over its rim and frost creeping down its side',
        CYBERPUNK:
          'a frost-locked chrome servo joint, cyan ice creeping through its gears and icicles hanging off it',
        SPACE_OPERA: 'a white hull plate with a lattice of cyan stasis frost slowly spreading across it',
      },
    },
    {
      id: 'cryo-channel',
      role: 'Cryo channelled attack',
      school: 'CRYO',
      looks: {
        FANTASY: 'a crystal-tipped staff pouring a steady stream of cyan frost',
        AGE_OF_STEAM: 'a brass condenser nozzle blowing a straight jet of freezing brine spray',
        MODERN: 'a black liquid-nitrogen hose nozzle pouring a straight jet of white freezing vapour',
        CYBERPUNK:
          'a chrome liquid-nitrogen injector gun with a gauged canister on top, holding a straight cyan cryo stream',
        SPACE_OPERA:
          'a white cryo-beam projector firing a straight cyan freezing ray that ices over as it goes',
      },
    },
    {
      id: 'cryo-finisher',
      role: 'Cryo finisher',
      school: 'CRYO',
      looks: {
        FANTASY: 'a massive ice-forged warhammer slamming down in a burst of cyan frost shards',
        AGE_OF_STEAM: 'a heavy brass-bound ice maul with a block of frozen brine as its striking end',
        MODERN: 'a steel ice axe striking down into a frozen block that cracks apart in cyan shards',
        CYBERPUNK:
          'a chrome cryo-hammer with a cyan coolant reservoir in its haft, shattering a frozen chrome plate',
        SPACE_OPERA: 'a white stasis lance driving down into a cyan crystal block that shatters',
      },
    },
    {
      id: 'cryo-vulnerability',
      role: 'Cryo vulnerability debuff',
      school: 'CRYO',
      looks: {
        FANTASY: 'a frost-rimed steel shield with a spiderweb of cracks spreading from a cyan ice sigil',
        AGE_OF_STEAM: 'a frost-whitened brass armour plate crazed with brittle hairline cracks',
        MODERN: 'a frozen steel plate with a cyan crosshair marker sprayed over its crazed coat of ice',
        CYBERPUNK:
          'a chrome armour panel crusted in cyan frost, a brittle crack running under a blinking cyan targeting reticle',
        SPACE_OPERA: 'a white shield emitter frozen over in cyan stasis frost, a crack splitting its dome',
      },
    },
    {
      id: 'cryo-ultimate',
      role: 'Cryo ultimate',
      school: 'CRYO',
      looks: {
        FANTASY: 'a towering cyan ice-crystal spire erupting from a ring of frozen shards',
        AGE_OF_STEAM:
          'a towering brass refrigeration engine venting a roaring blizzard of frozen brine from its stacks',
        MODERN: 'a white industrial liquid-nitrogen tank venting a huge freezing cloud from a burst valve',
        CYBERPUNK:
          'a chrome cryo-cannon rig fed by twin cyan coolant tanks, firing a blast that freezes into a jagged wall of ice',
        SPACE_OPERA:
          'a white absolute-zero sphere suspended in a shell of cyan stasis frost and floating ice shards',
      },
    },
  ],
};
