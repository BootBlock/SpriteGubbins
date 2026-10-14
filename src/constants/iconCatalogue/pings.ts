import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The callouts a squad’s ping wheel places on the world: a plain marker, an enemy, a danger, loot, a
 * player on the way, a place to attack or defend, a call for help, ammunition or healing, and a call to
 * regroup. The overlay library already offers the acknowledged ping, so it is not repeated here.
 *
 * **Each ping is told apart by its outline alone,** because an engine usually draws them as a grey
 * tint mask coloured by team and shows them at about 20 px. So no two callouts in one world share an
 * object: a spike, a diamond, a triangle, a chest, a row of chevrons, a reticle, a shield, a beacon, a
 * magazine, an injector and a set of converging arrows each keep a shape of their own.
 */
export const PINGS: IconCatalogueGroup = {
  id: 'pings',
  label: 'Pings and callouts',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'ping-look-here',
      role: 'Look here ping',
      looks: {
        FANTASY: 'a slender iron spike topped with a round gemstone glowing soft gold',
        AGE_OF_STEAM: 'a brass surveyor’s marker stake with a round red lamp at its tip',
        MODERN: 'a plain teardrop location pin with a hollow ring at its centre',
        CYBERPUNK: 'a gunmetal teardrop marker with a hollow core, ringed by a neon-cyan holographic halo',
        SPACE_OPERA: 'a slim white beacon spire with a ring of soft blue light pulsing at its tip',
      },
    },
    {
      id: 'ping-enemy-spotted',
      role: 'Enemy spotted ping',
      looks: {
        FANTASY: 'a jagged red crystal shard with a sharp spike at each end',
        AGE_OF_STEAM: 'a round brass-rimmed spyglass lens with a red crosshair across it',
        MODERN: 'a red hollow diamond with a dark dot at its centre',
        CYBERPUNK: 'a neon-red hollow diamond with a spike at each point, flickering with glitch static',
        SPACE_OPERA:
          'a red hostile-contact delta with a sharp notch in its base, glowing over a white sensor ring',
      },
    },
    {
      id: 'ping-danger',
      role: 'Danger ping',
      looks: {
        FANTASY: 'a red triangular iron warding plate with a jagged crack down its centre',
        AGE_OF_STEAM: 'a triangular brass hazard lantern glaring with red light',
        MODERN: 'a yellow warning triangle with a black lightning bolt inside it',
        CYBERPUNK:
          'a neon-amber hazard triangle with a jagged bolt inside it, pulsing over a matte black plate',
        SPACE_OPERA: 'a red hazard triangle of light with a trio of pulsing arcs above it',
      },
    },
    {
      id: 'ping-loot-here',
      role: 'Loot here ping',
      looks: {
        FANTASY: 'a small iron-bound wooden chest with gold glinting at its lid',
        AGE_OF_STEAM: 'a brass-cornered strongbox with its lid ajar and gold light within',
        MODERN: 'a hard-shell supply box with a carry handle and a downward arrow above it',
        CYBERPUNK:
          'a matte black loot case with gold light leaking from its seams and a neon-cyan lock diode',
        SPACE_OPERA: 'a white alloy salvage cube with gold light pulsing at its seams',
      },
    },
    {
      id: 'ping-on-my-way',
      role: 'On my way ping',
      looks: {
        FANTASY: 'a pair of winged leather boots in mid-stride',
        AGE_OF_STEAM: 'a riveted brass weathervane arrow with a fletched tail swung forwards',
        MODERN: 'a row of three bold forward chevrons',
        CYBERPUNK: 'a row of three neon-cyan forward chevrons streaking with a glitching gunmetal trail',
        SPACE_OPERA: 'a white comet with a long tail of blue light streaming behind it',
      },
    },
    {
      id: 'ping-attack-here',
      role: 'Attack here ping',
      looks: {
        FANTASY: 'a pair of crossed iron swords with gold hilts',
        AGE_OF_STEAM: 'a pair of crossed cavalry sabres over a brass cog',
        MODERN: 'a bold crosshair reticle with a solid dot at its centre',
        CYBERPUNK: 'a neon-red targeting reticle locked over a downward strike arrow of gunmetal',
        SPACE_OPERA: 'a red targeting lance of light striking down into a white impact ring',
      },
    },
    {
      id: 'ping-defend-here',
      role: 'Defend here ping',
      looks: {
        FANTASY: 'a kite-shaped iron shield with a gold boss',
        AGE_OF_STEAM: 'a riveted brass heater shield with a cog at its centre',
        MODERN: 'a solid blue shield with a thick upward chevron on it',
        CYBERPUNK: 'a hexagonal gunmetal riot shield with a glowing neon-blue edge light',
        SPACE_OPERA: 'a dome-shaped blue energy barrier over a small white plinth',
      },
    },
    {
      id: 'ping-need-help',
      role: 'Need help ping',
      looks: {
        FANTASY: 'a curved war horn with three rings of sound spreading from its bell',
        AGE_OF_STEAM: 'a brass ship’s bell ringing with arcs of sound',
        MODERN: 'a lit red emergency flare with a plume of sparks',
        CYBERPUNK: 'a neon-red distress beacon flashing with a pulsing ring of static over a carbon base',
        SPACE_OPERA: 'a white distress buoy with three red rings of light expanding from it',
      },
    },
    {
      id: 'ping-need-ammunition',
      role: 'Need ammunition ping',
      looks: {
        FANTASY: 'a half-empty leather quiver with three arrows',
        AGE_OF_STEAM: 'a stack of three brass cartridges with lead tips',
        MODERN: 'a trio of upright rifle bullets with copper tips',
        CYBERPUNK: 'a curved gunmetal magazine with a neon-amber round glowing at its lip',
        SPACE_OPERA: 'a white energy cell with a single blue charge bar',
      },
    },
    {
      id: 'ping-need-healing',
      role: 'Need healing ping',
      looks: {
        FANTASY: 'a round red potion flask with a cork stopper',
        AGE_OF_STEAM: 'a black leather doctor’s bag with a brass clasp',
        MODERN: 'a plain green medical cross with rounded ends',
        CYBERPUNK: 'a slim gunmetal auto-injector with a neon-green fluid core and a capped needle',
        SPACE_OPERA: 'a white medical capsule glowing with soft green light',
      },
    },
    {
      id: 'ping-regroup',
      role: 'Regroup ping',
      looks: {
        FANTASY: 'a plain gold rallying banner on a tall spear',
        AGE_OF_STEAM: 'a brass bugle with a tasselled cord',
        MODERN: 'a set of four arrows converging on a central dot',
        CYBERPUNK: 'a set of four neon-cyan arrows converging on a gunmetal hub',
        SPACE_OPERA: 'a set of four white arrows converging on a point of blue light',
      },
    },
  ],
};
