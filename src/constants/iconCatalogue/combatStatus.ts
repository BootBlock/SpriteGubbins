import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The small status icons a unit frame shows beside a portrait: in combat, resting, flagged for
 * player-versus-player, dead, away, busy, group leader, loot master, the ready check and a threat
 * warning.
 *
 * **Each is drawn to sit in a corner of a unit frame,** so it is one compact object in one strong
 * colour, and the ready check is a single pick drawn in both of its answers.
 */
export const COMBAT_STATUS: IconCatalogueGroup = {
  id: 'combat-status',
  label: 'Combat status',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'status-in-combat',
      role: 'In combat',
      looks: {
        FANTASY: 'a pair of crossed steel sabres with gold hilts',
        AGE_OF_STEAM: 'a pair of crossed cavalry sabres over a brass gear',
        MODERN: 'a pair of crossed combat knives on a red disc',
        CYBERPUNK: 'a pair of crossed chrome mono-katanas with glowing red edges throwing off sparks',
        SPACE_OPERA: 'a pair of crossed white energy blades humming with red light',
      },
    },
    {
      id: 'status-resting',
      role: 'Resting',
      looks: {
        FANTASY: 'a pale crescent moon cradling a small golden star',
        AGE_OF_STEAM: 'a brass candle holder with a snuffed candle and a curl of smoke',
        MODERN: 'a white crescent moon on a navy-blue disc',
        CYBERPUNK: 'a neon-violet crescent moon tube glowing softly against a black chrome backplate',
        SPACE_OPERA: 'a white crescent of a planet edge-lit in soft blue',
      },
    },
    {
      id: 'status-pvp-flagged',
      role: 'Player-versus-player flagged',
      looks: {
        FANTASY: 'a red-and-black battle standard crossed with a spear',
        AGE_OF_STEAM: 'a pair of crossed duelling pistols over a red pennant',
        MODERN: 'a red flag with a pair of crossed white bars',
        CYBERPUNK:
          'a red holographic bounty crosshair locked over a black chrome dog tag, flickering with static',
        SPACE_OPERA: 'a red targeting reticle glowing around a white insignia star',
      },
    },
    {
      id: 'status-dead',
      role: 'Dead',
      looks: {
        FANTASY: 'a pale blue wisp of spirit flame drifting upwards',
        AGE_OF_STEAM: 'a snuffed brass oil lamp with a wisp of grey smoke rising',
        MODERN: 'a flat grey heart split by a jagged crack',
        CYBERPUNK: 'a flatlined neon-green heart monitor trace on a cracked black glass slab',
        SPACE_OPERA: 'a dim white life-sign beacon with its blue light gone grey',
      },
    },
    {
      id: 'status-away',
      role: 'Away',
      looks: {
        FANTASY: 'a small wooden hourglass with golden sand trickling down',
        AGE_OF_STEAM: 'a brass pocket watch with its lid open and its chain trailing',
        MODERN: 'a yellow disc with a plain dark crescent moon on it',
        CYBERPUNK: 'a black chrome hourglass with neon-amber nanite sand trickling through it',
        SPACE_OPERA: 'a white standby crystal pulsing slowly with amber light',
      },
    },
    {
      id: 'status-busy',
      role: 'Busy',
      looks: {
        FANTASY: 'a closed oak door with an iron bar dropped across it',
        AGE_OF_STEAM: 'a brass railway signal lamp shining red',
        MODERN: 'a red disc with a white horizontal bar across it',
        CYBERPUNK:
          'a red neon no-entry disc with a black bar, buzzing with a faint flicker on a black backplate',
        SPACE_OPERA: 'a red force-field barrier shimmering over a white disc',
      },
    },
    {
      id: 'status-group-leader',
      role: 'Group leader',
      looks: {
        FANTASY: 'a small gold crown set with three red gems',
        AGE_OF_STEAM: 'a brass officer crown of laurel leaves with a cog at its front',
        MODERN: 'a simple gold crown with three points',
        CYBERPUNK: 'a chrome crown of angular spikes with neon-gold edge lights and a glowing cyan gem',
        SPACE_OPERA: 'a white command chevron crowned with a gold star',
      },
    },
    {
      id: 'status-loot-master',
      role: 'Loot master',
      looks: {
        FANTASY: 'a gold key crossed over a bulging coin sack',
        AGE_OF_STEAM: 'a brass ring of keys hung from a strongbox lock',
        MODERN: 'a gold key with a round bow on a red ribbon',
        CYBERPUNK: 'a chrome keycard with a glowing gold chip and a neon-cyan stripe along its edge',
        SPACE_OPERA: 'a white crystalline access key with a gold light at its core',
      },
    },
    {
      id: 'status-ready-check',
      role: 'Ready check',
      states: ['ready', 'not-ready'],
      looks: {
        FANTASY:
          'a green wax seal pressed with a tick, and a red wax seal pressed with a cross for the second state',
        AGE_OF_STEAM:
          'a brass railway semaphore blade raised with a green lamp lit, and lowered with a red lamp lit for the second state',
        MODERN: 'a green disc with a white tick, and a red disc with a white cross for the second state',
        CYBERPUNK:
          'a neon-green tick glowing on a black chrome chip, and a neon-red cross on the same chip for the second state',
        SPACE_OPERA:
          'a white status disc glowing green with a tick of light, and glowing red with a cross for the second state',
      },
    },
    {
      id: 'status-threat',
      role: 'Threat warning',
      looks: {
        FANTASY: 'a red triangular shield with a jagged crack down its centre',
        AGE_OF_STEAM: 'a brass boiler safety valve venting a jet of steam, its lever glowing red-hot',
        MODERN: 'a red-and-orange triangle with a thick dark border',
        CYBERPUNK:
          'a pulsing neon-red triangle with a jagged bolt inside it, flickering over a black chrome plate',
        SPACE_OPERA: 'a red hazard triangle of light with a white radar arc behind it',
      },
    },
  ],
};
