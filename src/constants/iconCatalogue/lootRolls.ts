import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The four buttons of a group loot roll: need, greed, pass and salvage.
 *
 * **Four answers a player must tell apart in a second.** Need is a die, greed is coin, pass is a cross
 * and salvage is an item breaking into its parts, and every family keeps that split while redrawing
 * the objects in its own materials.
 */
export const LOOT_ROLLS: IconCatalogueGroup = {
  id: 'loot-rolls',
  label: 'Loot Rolls',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'loot-need',
      role: 'Need roll',
      looks: {
        FANTASY: 'a carved bone die showing three black pips, tumbling mid-roll',
        AGE_OF_STEAM: 'a brass-cornered ivory die with red pips, resting on a green baize square',
        MODERN: 'a white plastic die with black pips, tilted on one corner',
        CYBERPUNK:
          'a translucent black acrylic die with neon-cyan pips and a hot-pink edge light, mid-tumble',
        SPACE_OPERA: 'a white holographic die with blue glowing pips spinning above a small emitter',
      },
    },
    {
      id: 'loot-greed',
      role: 'Greed roll',
      looks: {
        FANTASY: 'a small stack of gold coins with one coin tipped on its edge',
        AGE_OF_STEAM: 'a fat brass sovereign coin with a milled rim and a crowned star on it',
        MODERN: 'a pair of stacked gold coins catching the light',
        CYBERPUNK:
          'a hexagonal chrome crypto-token with a glowing gold core and circuit traces round its rim',
        SPACE_OPERA: 'a gold credit wafer with a soft white light shining through its centre',
      },
    },
    {
      id: 'loot-pass',
      role: 'Pass',
      looks: {
        FANTASY: 'a red cross of two crossed wooden staves bound with cord',
        AGE_OF_STEAM: 'a cross of two riveted iron bars painted signal red',
        MODERN: 'a bold red cross with rounded ends',
        CYBERPUNK: 'a neon-red cross of two glowing tubes with a faint flicker and a dark chrome backplate',
        SPACE_OPERA: 'a red cross of light hovering over a white disc',
      },
    },
    {
      id: 'loot-salvage',
      role: 'Salvage',
      looks: {
        FANTASY: 'a cracked violet crystal crumbling into a puff of glittering arcane dust',
        AGE_OF_STEAM: 'a brass clockwork movement splitting apart into springs and tiny cogs',
        MODERN: 'a circuit board snapped in two with screws scattering from the break',
        CYBERPUNK: 'a chrome cyberware module bursting apart into glowing cyan microchips and sparking wire',
        SPACE_OPERA: 'a white tech module dissolving into a swirl of blue glowing particles',
      },
    },
  ],
};
