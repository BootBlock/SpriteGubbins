import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * What a ranged weapon fires: standard and heavy rounds, the special loads, a power cell and shot.
 *
 * **A special load is the standard round with its tip changed.** A player swaps ammunition mid-fight, so
 * each load keeps the family’s round, arrow or cartridge and states what sets it apart at the point: a
 * burning tip, a hardened one, a warhead.
 */
export const AMMUNITION: IconCatalogueGroup = {
  id: 'ammunition',
  kind: 'ITEM',
  entries: [
    {
      id: 'ammo-standard',
      role: 'Standard ammunition',
      looks: {
        FANTASY: 'a leather quiver of grey-fletched arrows',
        AGE_OF_STEAM: 'an open cardboard box of brass rifle cartridges',
        MODERN: 'a black pistol magazine loaded with brass rounds',
        CYBERPUNK:
          'a matte-black smart magazine with chrome feed lips and a glowing cyan fill bar down its side',
        SPACE_OPERA: 'a white flechette cassette with a row of silver needles behind a clear window',
      },
    },
    {
      id: 'ammo-heavy',
      role: 'Heavy ammunition',
      looks: {
        FANTASY: 'a bundle of thick iron-tipped crossbow bolts tied with cord',
        AGE_OF_STEAM: 'a heavy brass express-rifle cartridge with a blunt lead bullet',
        MODERN: 'a linked belt of large-calibre machine-gun rounds',
        CYBERPUNK: 'a chunky drum magazine of heavy slugs with chrome bands and an amber status light',
        SPACE_OPERA: 'a white railgun slug cartridge wound with copper coils and a faint blue glow',
      },
    },
    {
      id: 'ammo-incendiary',
      role: 'Incendiary ammunition',
      looks: {
        FANTASY: 'an arrow with a pitch-soaked rag burning at its tip',
        AGE_OF_STEAM: 'a brass cartridge with a glowing red phosphorus tip',
        MODERN: 'a short row of red-tipped tracer rounds',
        CYBERPUNK: 'a magazine of thermite-tipped rounds with molten orange tips glowing at the top',
        SPACE_OPERA: 'a white plasma-charge pack with an orange molten core showing through its vents',
      },
    },
    {
      id: 'ammo-armour-piercing',
      role: 'Armour-piercing ammunition',
      looks: {
        FANTASY: 'a slim steel-tipped bodkin arrow with dark fletching',
        AGE_OF_STEAM: 'a long steel-cored rifle cartridge with a black pointed tip',
        MODERN: 'a rifle magazine of black-tipped armour-piercing rounds',
        CYBERPUNK: 'a slim tungsten-core penetrator round with a glowing violet tip and a chrome casing',
        SPACE_OPERA: 'a white mass-driver dart with a diamond-hard crystal tip',
      },
    },
    {
      id: 'ammo-energy-cell',
      role: 'Energy cell ammunition',
      looks: {
        FANTASY: 'a quiver of arrows with glowing blue crystal arrowheads',
        AGE_OF_STEAM: 'a glass galvanic battery jar with copper terminals and crackling arcs',
        MODERN: 'a heavy rechargeable battery pack with a green charge light',
        CYBERPUNK: 'a yellow capacitor cell with chrome contacts and a crackling yellow charge core',
        SPACE_OPERA: 'a white plasma cell with a glowing blue core and gold contacts',
      },
    },
    {
      id: 'ammo-scatter',
      role: 'Scatter ammunition',
      looks: {
        FANTASY: 'a leather pouch of round lead sling shot',
        AGE_OF_STEAM: 'a paper shotgun shell with a brass base and a crimped end',
        MODERN: 'a red plastic shotgun shell with a brass base',
        CYBERPUNK: 'a clear-cased neon-green shotgun shell packed with glowing flechettes',
        SPACE_OPERA: 'a white scatter-pulse cartridge with a fan of blue emitter ports',
      },
    },
    {
      id: 'ammo-explosive',
      role: 'Explosive ammunition',
      looks: {
        FANTASY: 'an arrow with a small black-powder keg lashed behind its tip',
        AGE_OF_STEAM: 'a black iron cannon shell with a brass fuse cap',
        MODERN: 'an olive grenade-launcher round with a gold nose',
        CYBERPUNK: 'a fat micro-missile round with a red warhead and a glowing red seeker tip',
        SPACE_OPERA: 'a white torpedo-shaped smart warhead with a blinking orange arming light',
      },
    },
  ],
};
