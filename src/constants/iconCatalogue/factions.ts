import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * Faction archetype emblems: the megacorporation, the street gang, the nomad clan, the netrunner
 * collective, the city enforcers, the fixers, the techno-cult, the mercenary company, the rebel militia
 * and the crime syndicate. In a fantasy world each is a guild, an order or a clan.
 *
 * **Each emblem is a drawn picture of one object, never lettering, and never the logo of a real company
 * or the insignia of a real force,** so it stands for the archetype in any setting, and no two factions
 * share an object, so a tower and a fang stay apart at icon size.
 */
export const FACTIONS: IconCatalogueGroup = {
  id: 'factions',
  label: 'Faction archetypes',
  kind: 'SOCIAL',
  entries: [
    {
      id: 'faction-megacorporation',
      role: 'Megacorporation faction',
      looks: {
        FANTASY: 'a gold counting-house tower with a coin on its spire, the crest of a merchant guild',
        AGE_OF_STEAM: 'a brass factory with three tall smoking chimneys',
        MODERN: 'a glass skyscraper with a sharp angled roof',
        CYBERPUNK: 'a black glass arcology tower with a crown of neon-cyan light at its peak',
        SPACE_OPERA: 'a white orbital spire with gold light along its edges',
      },
    },
    {
      id: 'faction-street-gang',
      role: 'Street gang faction',
      looks: {
        FANTASY: 'a black dagger through a cut coin purse, the crest of a thieves’ guild',
        AGE_OF_STEAM: 'a brass knuckleduster with spiked rings',
        MODERN: 'a spray-paint can with a red drip running down it',
        CYBERPUNK: 'a jagged neon-green fang with gunmetal plating',
        SPACE_OPERA: 'a red hull-scrap blade with a white grip',
      },
    },
    {
      id: 'faction-nomad-clan',
      role: 'Nomad clan faction',
      looks: {
        FANTASY: 'a wooden wagon wheel with a red ribbon, the crest of a wandering clan',
        AGE_OF_STEAM: 'a riveted iron traction-engine wheel with a brass hub',
        MODERN: 'an off-road tyre with deep tread',
        CYBERPUNK: 'a spiked gunmetal wheel with an orange neon hub',
        SPACE_OPERA: 'a white caravan ship with a blue engine trail',
      },
    },
    {
      id: 'faction-netrunner-collective',
      role: 'Netrunner collective faction',
      looks: {
        FANTASY: 'a crystal orb gripped in iron claws, the crest of an order of mages',
        AGE_OF_STEAM: 'a brass difference engine with a crank',
        MODERN: 'a black router with three antennae',
        CYBERPUNK: 'a neon-cyan web of glowing data lines over a gunmetal hexagon',
        SPACE_OPERA: 'a white lattice of blue light nodes',
      },
    },
    {
      id: 'faction-city-enforcers',
      role: 'City enforcers faction',
      looks: {
        FANTASY: 'a steel halberd with a blue tassel, the crest of a city watch',
        AGE_OF_STEAM: 'a black wooden truncheon with a brass band',
        MODERN: 'a black riot helmet with a clear visor',
        CYBERPUNK: 'a gunmetal stun baton with a blue neon tip',
        SPACE_OPERA: 'a white patrol cruiser with blue and red lights',
      },
    },
    {
      id: 'faction-fixers',
      role: 'Fixers and brokers faction',
      looks: {
        FANTASY: 'a set of gold balance scales, the crest of a brokers’ guild',
        AGE_OF_STEAM: 'a leather valise with brass clasps',
        MODERN: 'a black briefcase with steel corners',
        CYBERPUNK: 'a matte black hardcase with a neon-amber lock strip',
        SPACE_OPERA: 'a gold balance beam floating over a white plinth',
      },
    },
    {
      id: 'faction-techno-cult',
      role: 'Techno-cult faction',
      looks: {
        FANTASY: 'a bronze censer swinging on a chain, the crest of a clockwork order',
        AGE_OF_STEAM: 'a brass gear haloed by rays of gaslight',
        MODERN: 'a green circuit-board cross with copper traces',
        CYBERPUNK: 'a gunmetal cog with a violet neon halo',
        SPACE_OPERA: 'a white reliquary with a glowing gold processor core',
      },
    },
    {
      id: 'faction-mercenary-company',
      role: 'Mercenary company faction',
      looks: {
        FANTASY: 'a pair of crossed steel swords over a gold coin, the crest of a free company',
        AGE_OF_STEAM: 'a pair of crossed muskets with a brass powder horn',
        MODERN: 'a pair of crossed combat rifles',
        CYBERPUNK: 'a pair of crossed gunmetal carbines with orange neon sights',
        SPACE_OPERA: 'a white drop-pod with a red stripe',
      },
    },
    {
      id: 'faction-rebel-militia',
      role: 'Rebel militia faction',
      looks: {
        FANTASY: 'a pitchfork crossed with a burning torch, the crest of a peasant uprising',
        AGE_OF_STEAM: 'a broken iron chain with a burst link',
        MODERN: 'a torn red flag on a splintered pole',
        CYBERPUNK: 'a snapped gunmetal chain with a red neon spark at the break',
        SPACE_OPERA: 'a red starburst breaking through a white hull plate',
      },
    },
    {
      id: 'faction-crime-syndicate',
      role: 'Crime syndicate faction',
      looks: {
        FANTASY: 'a black raven with a gold ring in its beak, the crest of a smugglers’ guild',
        AGE_OF_STEAM: 'a black top hat with a red band',
        MODERN: 'a gold signet ring with a black stone',
        CYBERPUNK: 'a gunmetal serpent coiled around a neon-gold coin',
        SPACE_OPERA: 'a dark kraken coiled around a white planet',
      },
    },
  ],
};
