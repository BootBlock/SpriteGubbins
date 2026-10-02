import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * Things a character carries to open, gather, mend and light: keys, lockpicks, gathering tools, a repair
 * kit, a light, a grapple and the means to break into a system.
 *
 * **The common key and the master key are one object at two grades.** A player tells them apart at a
 * glance, so the master key keeps the common key’s form and adds the precious metal and ornament.
 */
export const TOOLS_AND_KEYS: IconCatalogueGroup = {
  id: 'tools-and-keys',
  kind: 'ITEM',
  entries: [
    {
      id: 'tool-key-common',
      role: 'Common key',
      looks: {
        FANTASY: 'a plain iron key with a round bow',
        AGE_OF_STEAM: 'a brass key with a toothed bit and an oval bow',
        MODERN: 'a single silver door key',
        CYBERPUNK: 'a chrome magnetic key fob with a blinking cyan light',
        SPACE_OPERA: 'a white cylindrical code-key with a soft blue tip',
      },
    },
    {
      id: 'tool-key-master',
      role: 'Master key',
      looks: {
        FANTASY: 'an ornate gold key with a jewelled bow and filigree',
        AGE_OF_STEAM: 'a heavy brass skeleton key with a cogwheel bow',
        MODERN: 'a steel master key on a split ring with a red rubber cap',
        CYBERPUNK: 'a gold override key fob with glowing gold circuit traces and a chrome plug',
        SPACE_OPERA: 'a gold crystalline key-shard humming with white light',
      },
    },
    {
      id: 'tool-lockpicks',
      role: 'Lockpicks',
      looks: {
        FANTASY: 'a rolled leather pouch of thin iron lockpicks',
        AGE_OF_STEAM: 'a fan of brass picks and a tension wrench on a wire loop',
        MODERN: 'a black zip case of steel lock picks',
        CYBERPUNK: 'a slim chrome pick gun with a vibrating tip and a glowing green feedback light',
        SPACE_OPERA: 'a white nano-pick wand dissolving into a fine blue mist at its tip',
      },
    },
    {
      id: 'tool-mining-pick',
      role: 'Mining pick',
      looks: {
        FANTASY: 'an iron pickaxe with a worn wooden haft',
        AGE_OF_STEAM: 'a pneumatic rock drill with a brass pressure tank',
        MODERN: 'a steel pickaxe with a yellow fibreglass handle',
        CYBERPUNK: 'a hydraulic plasma pickaxe with a glowing orange heated tip and a hazard-striped haft',
        SPACE_OPERA: 'a white mining laser with an angled emitter and a red beam',
      },
    },
    {
      id: 'tool-wood-axe',
      role: 'Woodcutting axe',
      looks: {
        FANTASY: 'a bearded iron woodcutting axe with a wooden haft',
        AGE_OF_STEAM: 'a long-handled felling axe with a riveted steel blade',
        MODERN: 'a red-handled splitting axe with a steel blade',
        CYBERPUNK: 'a compact chainsaw with a chrome bar and glowing red cutting teeth',
        SPACE_OPERA: 'a white laser cutter projecting a fan-shaped green beam',
      },
    },
    {
      id: 'tool-skinning-knife',
      role: 'Skinning knife',
      looks: {
        FANTASY: 'a curved skinning knife with a bone grip',
        AGE_OF_STEAM: 'a horn-gripped hunting knife in a stitched leather sheath',
        MODERN: 'a black folding hunting knife with a hooked blade',
        CYBERPUNK: 'a short chrome vibro-knife with a pulsing pink edge',
        SPACE_OPERA: 'a white bio-sampling scalpel with a glowing blue cutting line',
      },
    },
    {
      id: 'tool-fishing-rod',
      role: 'Fishing rod',
      looks: {
        FANTASY: 'a bent willow fishing rod with a line and a cork float',
        AGE_OF_STEAM: 'a split-cane fishing rod with a brass reel',
        MODERN: 'a carbon spinning rod with a black reel and a red lure',
        CYBERPUNK: 'a telescoping chrome fishing rod with a glowing neon lure',
        SPACE_OPERA: 'a white extendable rod casting a blue energy line',
      },
    },
    {
      id: 'tool-repair-kit',
      role: 'Repair kit',
      looks: {
        FANTASY: 'a leather tool roll holding a hammer and tongs',
        AGE_OF_STEAM: 'a riveted brass tool case with a spanner and an oil can strapped to its lid',
        MODERN: 'a red metal toolbox with a fold-down handle',
        CYBERPUNK: 'a yellow multitool with fold-out drivers and a glowing soldering tip',
        SPACE_OPERA: 'a white repair drone pod with a glowing nanite spray nozzle',
      },
    },
    {
      id: 'tool-light-source',
      role: 'Light source',
      looks: {
        FANTASY: 'a burning wooden torch wrapped in oiled cloth',
        AGE_OF_STEAM: 'a brass oil lantern with a glass chimney',
        MODERN: 'a black aluminium torch with a bright beam',
        CYBERPUNK: 'a pink neon glowstick with a chrome clip cap',
        SPACE_OPERA: 'a white floating light orb with a glowing core and three stabiliser fins',
      },
    },
    {
      id: 'tool-grapple',
      role: 'Grappling hook',
      looks: {
        FANTASY: 'a coil of hemp rope with a three-pronged iron grappling hook',
        AGE_OF_STEAM: 'a brass harpoon-gun grapnel with a coiled cable',
        MODERN: 'a coiled black climbing rope with a steel carabiner',
        CYBERPUNK: 'a pistol-grip grapple launcher with a three-pronged chrome hook and a glowing cyan cable',
        SPACE_OPERA: 'a white tether projector firing a beam of blue light',
      },
    },
    {
      id: 'tool-hacking-device',
      role: 'Hacking device',
      looks: {
        FANTASY: 'a silver ward-breaking amulet with a glowing blue crystal',
        AGE_OF_STEAM: 'a brass cipher wheel of interlocking cogs',
        MODERN: 'a compact black signal-intercept box with a short antenna',
        CYBERPUNK:
          'a slim matte-black cyberdeck with a glowing green circuit-trace lid and a coiled neural cable',
        SPACE_OPERA: 'a white intrusion spike with a glowing blue crystalline tip',
      },
    },
    {
      id: 'tool-access-card',
      role: 'Access card',
      looks: {
        FANTASY: 'a carved silver seal token with a gemstone centre',
        AGE_OF_STEAM: 'a punched brass pass-plate on a chain',
        MODERN: 'a plain white swipe card with a blue stripe on a lanyard clip',
        CYBERPUNK: 'a translucent keycard with a glowing hot-pink chip and circuit traces',
        SPACE_OPERA: 'a white crystal access wafer with a pulsing blue core',
      },
    },
  ],
};
