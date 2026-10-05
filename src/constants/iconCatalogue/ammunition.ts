import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * What a ranged weapon fires: standard and heavy rounds, the special loads, a power cell and shot.
 *
 * **Each load is its own object, and its tip says what it does.** A player swaps ammunition mid-fight,
 * often by outline alone, so no two loads of a family share an object — a quiver against a bandolier
 * against a drum — and each states what sets it apart at the point: a burning tip, a hardened one, a
 * warhead.
 */
export const AMMUNITION: IconCatalogueGroup = {
  id: 'ammunition',
  label: 'Ammunition',
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
          'a matte-black smart magazine with brushed-steel feed lips and a glowing cyan fill bar down its side',
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
        CYBERPUNK: 'a chunky ammo drum of heavy slugs with brushed-steel bands and an amber status light',
        SPACE_OPERA: 'a white railgun slug cartridge wound with copper coils and a faint blue glow',
      },
    },
    {
      id: 'ammo-incendiary',
      role: 'Incendiary ammunition',
      looks: {
        FANTASY: 'an arrow with a pitch-soaked rag burning at its tip',
        AGE_OF_STEAM: 'a canvas bandolier of brass cartridges with glowing red phosphorus tips',
        MODERN: 'a short row of red-tipped tracer rounds',
        CYBERPUNK: 'a coiled ammo belt of thermite-tipped rounds with molten orange tips glowing along it',
        SPACE_OPERA: 'a white plasma-charge pack with an orange molten core showing through its vents',
      },
    },
    {
      id: 'ammo-armour-piercing',
      role: 'Armour-piercing ammunition',
      looks: {
        FANTASY: 'a heavy ballista spear with a narrow steel bodkin point and dark fletching',
        AGE_OF_STEAM: 'a brass stripper clip of steel-cored rifle cartridges with black pointed tips',
        MODERN: 'a single black-tipped armour-piercing rifle cartridge',
        CYBERPUNK:
          'a slim tungsten-core penetrator round with a glowing violet tip and a brushed-steel casing',
        SPACE_OPERA: 'a white mass-driver dart with a diamond-hard crystal tip',
      },
    },
    {
      id: 'ammo-energy-cell',
      role: 'Energy cell ammunition',
      looks: {
        FANTASY: 'a faceted blue mana crystal in a bronze cradle, glowing with stored light',
        AGE_OF_STEAM: 'a glass galvanic battery jar with copper terminals and crackling arcs',
        MODERN: 'a heavy rechargeable battery pack with a green charge light',
        CYBERPUNK: 'a yellow capacitor cell with brushed-steel contacts and a crackling yellow charge core',
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
        SPACE_OPERA: 'a white scatter-pulse cone with a fan of blue emitter ports',
      },
    },
    {
      id: 'ammo-explosive',
      role: 'Explosive ammunition',
      looks: {
        FANTASY: 'a small black-powder keg lashed to an arrow shaft behind its tip',
        AGE_OF_STEAM: 'a black iron cannonball with a brass fuse cap',
        MODERN: 'a finned olive rocket with a gold warhead',
        CYBERPUNK: 'a fat micro-missile with a red warhead and a glowing red seeker tip',
        SPACE_OPERA: 'a white torpedo-shaped smart warhead with a blinking orange arming light',
      },
    },
  ],
};
