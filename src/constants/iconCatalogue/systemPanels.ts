import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The buttons of the main system bar: the panels a player opens between fights, from the character
 * sheet and the bags to the world map, the store and the way back to the login.
 *
 * **Every entry is a metaphor made into one object.** Help is a lifebuoy or a lantern rather than a
 * symbol a reader must decode, and logging off is a door left ajar, so each reads at action-bar size.
 */
export const SYSTEM_PANELS: IconCatalogueGroup = {
  id: 'system-panels',
  label: 'System panels',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'system-main-options',
      role: 'Main options',
      looks: {
        FANTASY: 'a bundle of three stacked gilded oak bars bound by a studded leather strap',
        AGE_OF_STEAM: 'a brass switchboard plate with three stacked copper levers and a riveted rim',
        MODERN: 'a rounded white tile with three stacked grey bars',
        CYBERPUNK:
          'a black glass control deck with three stacked neon-cyan bars and a pulsing hot-pink power diode in one corner',
        SPACE_OPERA: 'a white command disc with three stacked pale-blue light bars floating above it',
      },
    },
    {
      id: 'system-settings',
      role: 'Settings',
      looks: {
        FANTASY: 'an iron cogwheel wrapped in a twist of blue enchanted light',
        AGE_OF_STEAM: 'a pair of interlocking brass cogs with a small steam valve between them',
        MODERN: 'a flat grey gear wheel with a hollow centre',
        CYBERPUNK: 'a chrome cog with a glowing cyan hub and a ring of tiny status diodes',
        SPACE_OPERA: 'a white ceramic gear with a soft blue light pulsing from its hub',
      },
    },
    {
      id: 'system-character',
      role: 'Character',
      figure: true,
      looks: {
        FANTASY: 'a head-and-shoulders bust silhouette inside a gilded oval frame',
        AGE_OF_STEAM: 'an umber cameo of a head-and-shoulders bust silhouette in a brass locket',
        MODERN: 'a plain grey head-and-shoulders bust silhouette in a round white badge',
        CYBERPUNK:
          'a head-and-shoulders bust silhouette traced in glowing cyan wireframe over a dark chrome dog tag',
        SPACE_OPERA:
          'a pale-blue holographic head-and-shoulders bust silhouette rising from a white emitter disc',
      },
    },
    {
      id: 'system-bags',
      role: 'Bags',
      looks: {
        FANTASY: 'a bulging brown leather satchel with a buckled flap and a looped drawstring',
        AGE_OF_STEAM: 'a canvas rucksack with brass buckles and a rolled blanket strapped on top',
        MODERN: 'a dark blue backpack with a zipped front pocket',
        CYBERPUNK:
          'a matte black tactical sling pack with neon-orange zip pulls and a glowing cyan clasp diode',
        SPACE_OPERA: 'a white cargo pod with rounded corners and a blue light seam around its lid',
      },
    },
    {
      id: 'system-abilities',
      role: 'Abilities',
      looks: {
        FANTASY: 'a closed leather spellbook with a glowing blue star set into its cover',
        AGE_OF_STEAM: 'a brass-cornered engineering manual bound with a leather strap and a cog clasp',
        MODERN: 'a spiral-bound field notebook with a red elastic band',
        CYBERPUNK: 'a chrome data shard etched with a glowing cyan circuit trace and a bright hot-pink core',
        SPACE_OPERA: 'a thin white holo-tablet projecting a slowly turning blue star',
      },
    },
    {
      id: 'system-talents',
      role: 'Talents',
      looks: {
        FANTASY: 'a small gnarled tree whose branches end in glowing golden buds',
        AGE_OF_STEAM: 'a brass pipework tree branching into three glass pressure bulbs',
        MODERN: 'a branching diagram of grey dots joined by straight lines',
        CYBERPUNK: 'a branching neon-green circuit tree whose nodes glow brighter towards its top',
        SPACE_OPERA: 'a branching constellation of white stars joined by pale-blue light',
      },
    },
    {
      id: 'system-quest-log',
      role: 'Quest log',
      looks: {
        FANTASY: 'a rolled parchment scroll tied with a red ribbon, a quill tucked beneath it',
        AGE_OF_STEAM: 'a leather-bound journal with a brass clasp and a ribbon bookmark',
        MODERN: 'a clipboard holding a blank sheet and a clipped pen',
        CYBERPUNK: 'a cracked black datapad showing three glowing cyan bars beside a hot-pink chevron',
        SPACE_OPERA: 'a white mission slate with a pale-blue holographic star hovering above it',
      },
    },
    {
      id: 'system-achievements',
      role: 'Achievements',
      looks: {
        FANTASY: 'a gold shield-shaped medal hanging from a red ribbon',
        AGE_OF_STEAM: 'a brass medal of honour with a starburst rim on a striped ribbon',
        MODERN: 'a gold trophy cup with two looped grips on a black plinth',
        CYBERPUNK: 'a chrome star-shaped medal with a glowing gold core, hanging from a neon-pink lanyard',
        SPACE_OPERA: 'a white starburst decoration with a gold light pulsing at its centre',
      },
    },
    {
      id: 'system-collections',
      role: 'Collections',
      looks: {
        FANTASY: 'a small wooden curio cabinet with three trinkets behind its glass door',
        AGE_OF_STEAM: 'a glass bell jar over a mounted brass butterfly',
        MODERN: 'a glass display case holding three small keepsakes on a white shelf',
        CYBERPUNK: 'a black wall rack of three glowing cyan specimen tubes, each holding a tiny trinket',
        SPACE_OPERA: 'a white display pod with three small relics floating in blue stasis light',
      },
    },
    {
      id: 'system-world-map',
      role: 'World map',
      looks: {
        FANTASY: 'a curling parchment map with a red dotted trail and a compass rose',
        AGE_OF_STEAM: 'a brass-framed globe on a tilted axis',
        MODERN: 'a folded paper road map with a red pin in it',
        CYBERPUNK:
          'a glowing cyan wireframe city grid projected above a black chrome holo-puck, one hot-pink pin rising from it',
        SPACE_OPERA: 'a pale-blue holographic planet with a white orbital track around it',
      },
    },
    {
      id: 'system-calendar',
      role: 'Calendar',
      looks: {
        FANTASY: 'a ring of twelve plain carved stone blocks around a gold sun disc',
        AGE_OF_STEAM: 'a brass page-flip almanac with a riveted spine and a grid of plain square day blocks',
        MODERN: 'a desk calendar with two binder rings and a grid of plain grey squares, one square red',
        CYBERPUNK:
          'a black glass calendar slab with a grid of plain dim cyan day blocks, one block glowing hot-pink',
        SPACE_OPERA: 'a white orbital dial ringed by plain pale-blue day blocks, one lit gold',
      },
    },
    {
      id: 'system-store',
      role: 'Store',
      looks: {
        FANTASY: 'a wicker basket heaped with a loaf, a red apple and a small gold coin',
        AGE_OF_STEAM: 'a wooden shipping crate with brass corners and straw spilling from its lid',
        MODERN: 'a red wire shopping basket with two folding grips',
        CYBERPUNK:
          'a translucent black shopping crate with neon-pink edge lights and glowing boxed goods inside',
        SPACE_OPERA: 'a white cargo crate with a blue glowing lid seam and a gold star on its side',
      },
    },
    {
      id: 'system-help',
      role: 'Help',
      looks: {
        FANTASY: 'a lit iron lantern with a warm golden flame behind its glass',
        AGE_OF_STEAM: 'a red-and-white cork lifebuoy hung from a coil of rope',
        MODERN: 'a red-and-white striped lifebuoy',
        CYBERPUNK:
          'a red-and-white lifebuoy of moulded polymer with a band of glowing cyan strip lights around it',
        SPACE_OPERA: 'a white rescue beacon with a pulsing blue lamp on top',
      },
    },
    {
      id: 'system-log-off',
      role: 'Log off',
      looks: {
        FANTASY: 'an arched oak door standing ajar, golden light spilling from the gap',
        AGE_OF_STEAM: 'a riveted iron ship door ajar, steam curling from the gap',
        MODERN: 'a plain grey door ajar with a bold arrow pointing through the gap',
        CYBERPUNK: 'a sliding chrome blast door half open, a hot-pink light bleeding from the gap',
        SPACE_OPERA: 'a round white airlock hatch swung open on a thick hinge, blue light inside',
      },
    },
    {
      id: 'system-sound',
      role: 'Sound',
      states: ['unmuted', 'muted'],
      looks: {
        FANTASY:
          'a small brass bell ringing with three curved sound waves, and silenced with a cloth wrapped round it for the second state',
        AGE_OF_STEAM:
          'a brass gramophone horn with curved sound waves leaving its bell, and plugged with a cork for the second state',
        MODERN:
          'a grey speaker cone with three curved sound waves, and the waves replaced by a red cross for the second state',
        CYBERPUNK:
          'a chrome speaker grille pulsing three neon-cyan sound waves, and dark with a glowing red slash across it for the second state',
        SPACE_OPERA:
          'a white sound emitter disc rippling with pale-blue rings, and dimmed with a red bar across it for the second state',
      },
    },
    {
      id: 'system-layout-lock',
      role: 'Layout lock',
      states: ['unlocked', 'locked'],
      looks: {
        FANTASY: 'an iron padlock with its shackle swung open, and snapped shut for the second state',
        AGE_OF_STEAM:
          'a brass padlock with its shackle raised and a key in it, and closed with the key gone for the second state',
        MODERN: 'a grey padlock with an open shackle, and shut for the second state',
        CYBERPUNK:
          'a chrome maglock with its bolt retracted and a green diode lit, and the bolt thrown with a red diode lit for the second state',
        SPACE_OPERA:
          'a white force-lock seal with an open blue arc, and closed into a full glowing circle for the second state',
      },
    },
  ],
};
