import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The things that hold other things: bags and backpacks for the inventory, and the chests, boxes,
 * crates and caches a player opens for loot.
 *
 * **Every container is drawn closed.** An open one would have to show what is inside, and the
 * contents are other entries' business, so each look tells its container apart by its size, its
 * material and its fastening.
 */
export const CONTAINERS: IconCatalogueGroup = {
  id: 'containers',
  label: 'Containers',
  kind: 'ITEM',
  entries: [
    {
      id: 'container-small-bag',
      role: 'Small bag',
      looks: {
        FANTASY: 'a small brown leather satchel with a flap and a buckle',
        AGE_OF_STEAM: 'a canvas haversack with brass buckles',
        MODERN: 'a black nylon sling bag with a zip',
        CYBERPUNK: 'a compact black sling bag of ballistic weave with a glowing cyan zip seam',
        SPACE_OPERA: 'a small white utility pack with a soft blue status light',
      },
    },
    {
      id: 'container-backpack',
      role: 'Large backpack',
      looks: {
        FANTASY: 'a large canvas rucksack with a rolled blanket strapped on top',
        AGE_OF_STEAM: 'a large leather backpack on a brass frame with a coiled rope',
        MODERN: 'a large hiking backpack with side pockets and compression straps',
        CYBERPUNK: 'a bulky carbon-fibre backpack with neon-green strap trim and a heat-sink fin',
        SPACE_OPERA: 'a large white exo-pack with glowing blue seams and anti-grav pods',
      },
    },
    {
      id: 'container-treasure-chest',
      role: 'Treasure chest',
      looks: {
        FANTASY: 'a closed wooden treasure chest bound in iron with a gold trim',
        AGE_OF_STEAM: 'a domed wooden steamer trunk with brass corners and leather straps',
        MODERN: 'a dark-green metal footlocker with steel latches',
        CYBERPUNK: 'a matte black armoured chest with a neon-amber light strip along its lid seam',
        SPACE_OPERA: 'a white hexagonal treasure pod with gold trim and a glowing seam',
      },
    },
    {
      id: 'container-lockbox',
      role: 'Lockbox',
      looks: {
        FANTASY: 'a small iron-bound box with a heavy padlock',
        AGE_OF_STEAM: 'a small brass strongbox with an ornate keyhole plate',
        MODERN: 'a grey steel cash box with a recessed lock',
        CYBERPUNK: 'a compact chrome lockbox with a glowing red maglock bar',
        SPACE_OPERA: 'a smooth silver cube with a blue lit seal ring',
      },
    },
    {
      id: 'container-pouch',
      role: 'Pouch',
      looks: {
        FANTASY: 'a small drawstring cloth pouch tied at the neck',
        AGE_OF_STEAM: 'a brown leather coin purse with a brass clasp',
        MODERN: 'a zip-up canvas belt pouch',
        CYBERPUNK: 'a padded black belt pouch with a magnetic clasp glowing faint cyan',
        SPACE_OPERA: 'a small silver mesh pouch with a blue glowing drawstring',
      },
    },
    {
      id: 'container-supply-crate',
      role: 'Supply crate',
      looks: {
        FANTASY: 'a nailed wooden crate bound with rope',
        AGE_OF_STEAM: 'a slatted wooden packing crate with iron straps',
        MODERN: 'a green plastic military supply crate with latches',
        CYBERPUNK: 'a hazard-striped polymer drop crate with a blinking orange locator light',
        SPACE_OPERA: 'a white cargo crate with blue glowing corner lights',
      },
    },
    {
      id: 'container-ammunition',
      role: 'Ammunition carrier',
      looks: {
        FANTASY: 'a leather quiver full of fletched arrows',
        AGE_OF_STEAM: 'a riveted brass cartridge box with a hinged lid',
        MODERN: 'an olive-drab steel ammunition can with a clamp lid',
        CYBERPUNK: 'a matte black mag-carrier with a glowing cyan charge strip down its side',
        SPACE_OPERA: 'a white bandolier of glowing blue power cells',
      },
    },
    {
      id: 'container-reagent-case',
      role: 'Reagent case',
      looks: {
        FANTASY: 'a wooden apothecary box with rows of tiny stoppered vials',
        AGE_OF_STEAM: 'a velvet-lined leather case of glass phials with brass clasps',
        MODERN: 'a hard-shell plastic case with foam cut-outs for test tubes',
        CYBERPUNK: 'a chrome chem-case with backlit slots of glowing coloured vials',
        SPACE_OPERA: 'a white sample case with a frosted lid and glowing vials beneath',
      },
    },
    {
      id: 'container-loot-cache',
      role: 'Loot cache',
      looks: {
        FANTASY: 'a mossy stone urn with a cracked lid',
        AGE_OF_STEAM: 'an iron floor safe with a brass spoked wheel',
        MODERN: 'a weatherproof yellow dry bag rolled shut',
        CYBERPUNK: 'a dented data-cache server box with a flickering green unlock light',
        SPACE_OPERA: 'a glowing violet loot capsule with a split shell',
      },
    },
  ],
};
