import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The pins the minimap and the world map scatter over terrain: quests, waypoints, the player and the
 * party, travel, shelter, treasure and danger.
 *
 * **A pin is drawn smaller than any other icon,** so each is one bold shape with one colour that says
 * what it is. A party member is a coloured pip rather than a figure, and a quest is a star or a seal
 * rather than a punctuation mark.
 */
export const MAP_PINS: IconCatalogueGroup = {
  id: 'map-pins',
  label: 'Map Pins',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'pin-quest-available',
      role: 'Quest available',
      looks: {
        FANTASY: 'a rolled parchment scroll with a bright gold star seal',
        AGE_OF_STEAM: 'a brass message cylinder with a gold star stamped on its cap',
        MODERN: 'a yellow map pin with a white star in its round top',
        CYBERPUNK: 'a neon-gold diamond hovering above a black chrome pin, pulsing with a bright amber glow',
        SPACE_OPERA: 'a gold holographic star turning slowly above a white beacon pylon',
      },
    },
    {
      id: 'pin-quest-turn-in',
      role: 'Quest ready to turn in',
      looks: {
        FANTASY: 'a rolled parchment scroll with a gold tick on its wax seal',
        AGE_OF_STEAM: 'a brass message cylinder with its cap open and a gold tick stamped on its side',
        MODERN: 'a yellow map pin with a white tick in its round top',
        CYBERPUNK:
          'a neon-gold chevron pointing downwards over a black chrome pin, flashing with an amber pulse',
        SPACE_OPERA: 'a gold holographic tick turning slowly above a white beacon pylon',
      },
    },
    {
      id: 'pin-quest-area',
      role: 'Quest objective area',
      looks: {
        FANTASY: 'a soft golden circle of light with a dotted border, like a patch of enchanted ground',
        AGE_OF_STEAM: 'a sepia-shaded circle with a dashed brass border on survey paper',
        MODERN: 'a translucent yellow circle with a dashed outline',
        CYBERPUNK:
          'a translucent amber hex zone with a flickering neon-gold dashed border and scan lines across it',
        SPACE_OPERA: 'a translucent gold sensor bubble with a fine white grid across it',
      },
    },
    {
      id: 'pin-waypoint',
      role: 'Waypoint',
      looks: {
        FANTASY: 'a small stone cairn topped with a fluttering blue pennant',
        AGE_OF_STEAM: 'a brass survey peg with a red-and-white striped flag',
        MODERN: 'a red teardrop map pin with a white dot at its centre',
        CYBERPUNK: 'a slim neon-cyan light beam rising from a glowing chrome ground disc',
        SPACE_OPERA: 'a white nav buoy with a blue light pulsing at its tip',
      },
    },
    {
      id: 'pin-player',
      role: 'Player position',
      looks: {
        FANTASY: 'a gold spearpoint-shaped pointer with a dark outline',
        AGE_OF_STEAM: 'a brass compass needle pointer with a riveted pivot',
        MODERN: 'a white dart-shaped navigation pointer with a blue outline',
        CYBERPUNK: 'a neon-yellow chevron pointer with a glowing trail and a bright white tip',
        SPACE_OPERA: 'a white delta-wing pointer with a blue engine glow behind it',
      },
    },
    {
      id: 'pin-party-member',
      role: 'Party member',
      looks: {
        FANTASY: 'a round blue enamel pip with a thin gold rim',
        AGE_OF_STEAM: 'a round blue glass bead set in a brass bezel',
        MODERN: 'a solid blue dot with a white outline',
        CYBERPUNK: 'a glowing neon-blue pip with a soft pulsing bloom and a chrome bezel',
        SPACE_OPERA: 'a blue light pip inside a thin white orbit',
      },
    },
    {
      id: 'pin-flight-point',
      role: 'Flight point',
      looks: {
        FANTASY: 'a pair of outspread feathered wings in white and gold',
        AGE_OF_STEAM: 'a brass mooring mast topped with a small tethered dirigible',
        MODERN: 'a white aeroplane on a blue rounded square',
        CYBERPUNK: 'a neon-cyan rotor emblem spinning above a black drone landing pad',
        SPACE_OPERA: 'a white shuttle docking clamp with blue guidance lights',
      },
    },
    {
      id: 'pin-dungeon',
      role: 'Dungeon entrance',
      looks: {
        FANTASY: 'a dark stone archway with a portcullis half raised and a swirl of purple mist inside',
        AGE_OF_STEAM: 'a riveted iron mine entrance with a lantern hung above it',
        MODERN: 'a concrete bunker doorway with a yellow hazard stripe',
        CYBERPUNK: 'a sewer-grate hatch prised open, hot-pink light spilling up from below',
        SPACE_OPERA: 'a dark alien gateway framed in white, a violet energy field shimmering inside',
      },
    },
    {
      id: 'pin-mailbox',
      role: 'Mailbox',
      looks: {
        FANTASY: 'a wooden post box on a pole with a hinged lid and a red flag',
        AGE_OF_STEAM: 'a red cast-iron pillar box with a domed cap',
        MODERN: 'a blue street mailbox with a curved top',
        CYBERPUNK: 'a black drone-drop locker with a glowing cyan slot and a blinking hot-pink diode',
        SPACE_OPERA: 'a white courier pod with a blue light along its hatch',
      },
    },
    {
      id: 'pin-inn',
      role: 'Inn',
      looks: {
        FANTASY: 'a wooden tankard brimming with foaming ale',
        AGE_OF_STEAM: 'a brass carriage lamp burning over a red door',
        MODERN: 'a white bed on a blue rounded square',
        CYBERPUNK: 'a capsule-hotel hatch framed by a warm pink neon tube',
        SPACE_OPERA: 'a white rest pod with a soft amber light inside',
      },
    },
    {
      id: 'pin-treasure',
      role: 'Treasure',
      looks: {
        FANTASY: 'a small wooden treasure chest bound in iron, gold glinting at its lid',
        AGE_OF_STEAM: 'a brass-bound sea trunk with a heavy padlock',
        MODERN: 'a gold bar resting on a small pile of coins',
        CYBERPUNK:
          'a black hard-shell loot case with gold light leaking from its seams and a cyan lock diode',
        SPACE_OPERA: 'a white salvage cache with a gold light pulsing at its seam',
      },
    },
    {
      id: 'pin-dangerous-foe',
      role: 'Dangerous foe',
      looks: {
        FANTASY: 'a jagged red dragon fang dripping with venom',
        AGE_OF_STEAM: 'a black iron bomb with a lit fuse',
        MODERN: 'a red diamond hazard plate with a black lightning bolt',
        CYBERPUNK: 'a jagged crimson claw-slash emblem crackling with neon-red static',
        SPACE_OPERA: 'a red spiked hostile-contact chevron pulsing inside a white targeting bracket',
      },
    },
    {
      id: 'pin-respawn',
      role: 'Respawn point',
      looks: {
        FANTASY: 'a white stone obelisk with a pale wisp of spirit light rising from its tip',
        AGE_OF_STEAM: 'a brass resurrection engine with a crackling copper coil on top',
        MODERN: 'a green medical cross on a white circle',
        CYBERPUNK: 'a chrome clone-vat cylinder with green fluid glowing inside and a cyan scan line',
        SPACE_OPERA: 'a white reconstitution pad with a column of blue light rising from it',
      },
    },
  ],
};
