import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The trades that take raw stuff from the world: scavenging, mining, data harvesting, botany,
 * salvaging and fishing.
 *
 * **Each trade is an emblem: the gathering caught in the act, its tool and its haul together.** A
 * lone pick or rod is already on the tools shelf and a lone lump of ore on the materials one, so every
 * look draws the two meeting, a core drill drawing out a crystal core, a creel holding the catch.
 */
export const GATHERING_PROFESSIONS: IconCatalogueGroup = {
  id: 'gathering-professions',
  label: 'Gathering professions',
  kind: 'PROFESSION',
  entries: [
    {
      id: 'gather-scavenging',
      role: 'Scavenging',
      looks: {
        FANTASY: 'a pelt stretched on a wooden drying rack with a bone-handled flaying knife beside it',
        AGE_OF_STEAM: 'a brass electromagnet on a chain lifting a tangle of scrap iron',
        MODERN: 'a metal detector with its round coil hovering over a rusty tin',
        CYBERPUNK:
          'a battered brushed-steel scavenger’s grab-claw closing on a tangle of copper wire and salvaged chips',
        SPACE_OPERA: 'a white scavenger grab-claw gripping a glowing alien relic shard',
      },
    },
    {
      id: 'gather-mining',
      role: 'Mining',
      looks: {
        FANTASY: 'a wooden ore cart heaped with glinting silver ore, a miner’s lantern hung on its side',
        AGE_OF_STEAM: 'a riveted iron minecart of coal on a short length of rail',
        MODERN: 'a yellow hard hat with a lamp, resting on a chunk of gold-flecked quartz',
        CYBERPUNK:
          'a brushed-steel core drill boring into black rock, a glowing violet crystal core sliding out of its bit',
        SPACE_OPERA:
          'a white mining laser clamped to a small asteroid, its blue beam carving out a glowing ore chunk',
      },
    },
    {
      id: 'gather-data-harvesting',
      role: 'Data harvesting',
      looks: {
        FANTASY: 'a glowing ley-line crystal tapped by a silver spigot, light dripping into a vial',
        AGE_OF_STEAM:
          'a brass aether condenser drawing a glowing wisp through a copper antenna into a glass bulb',
        MODERN: 'a black external hard drive cabled into a server blade with a row of blinking green lights',
        CYBERPUNK:
          'a brushed-steel data shard drawing a stream of glowing cyan data cubes out of a cracked node port',
        SPACE_OPERA: 'a white probe drone siphoning a ribbon of glowing data from a floating crystal relay',
      },
    },
    {
      id: 'gather-botany',
      role: 'Botany and herb gathering',
      looks: {
        FANTASY: 'a silver sickle cutting a glowing herb sprig into a woven basket',
        AGE_OF_STEAM: 'a brass vasculum specimen tin lying open beside a pressed fern and a pair of snips',
        MODERN: 'a pair of red-handled secateurs beside a freshly cut sprig of rosemary',
        CYBERPUNK:
          'a pair of brushed-steel laser-pruning shears snipping a bioluminescent bud from a bubbling hydroponic grow-tube',
        SPACE_OPERA: 'a white bio-sampler wand drawing a glowing alien seed pod into a stasis capsule',
      },
    },
    {
      id: 'gather-salvage',
      role: 'Salvaging',
      looks: {
        FANTASY:
          'a cracked jewelled amulet splitting apart over a crystal disenchanting bowl, shimmering violet dust pouring out',
        AGE_OF_STEAM: 'a spanner prising the cogs from a broken brass clockwork engine into a tin bucket',
        MODERN: 'a socket wrench beside a dismantled car alternator and a tray of loose bolts',
        CYBERPUNK:
          'a plasma cutter torch slicing a combat drone’s brushed-steel casing in half, a glowing power cell exposed inside',
        SPACE_OPERA: 'a white recycler cube breaking a wrecked fighter wing into streams of blue particles',
      },
    },
    {
      id: 'gather-fishing',
      role: 'Fishing',
      looks: {
        FANTASY: 'a woven wicker creel with a fresh silver trout lying across its lid',
        AGE_OF_STEAM: 'a brass-hinged tackle box lying open beside a hooked mackerel',
        MODERN: 'a landing net holding a striped bass',
        CYBERPUNK:
          'a neon lure on a brushed-steel line hooked into a bioluminescent three-eyed mutant fish dripping canal sludge',
        SPACE_OPERA: 'a white tractor-beam scoop lifting a translucent glowing alien fish',
      },
    },
  ],
};
