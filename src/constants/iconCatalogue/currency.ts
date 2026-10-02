import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The money of the world: everyday and precious coin, the premium currency, event and honour tokens,
 * crafting vouchers and paper money.
 *
 * **A coin carries a shape, never a denomination.** A generator asked for a value draws a garbled one,
 * so each coin is told apart by its metal, its size and the emblem struck on it: a crown, a sunburst,
 * a star.
 */
export const CURRENCY: IconCatalogueGroup = {
  id: 'currency',
  kind: 'ITEM',
  entries: [
    {
      id: 'currency-common-coin',
      role: 'Common currency',
      looks: {
        FANTASY: 'a small stack of copper coins, each struck with a crown',
        AGE_OF_STEAM: 'a stack of bronze coins with milled edges and a cogwheel emblem',
        MODERN: 'a small stack of silver coins with ridged edges',
        CYBERPUNK: 'a stack of grey polymer scrip chips with glowing cyan rims',
        SPACE_OPERA: 'a stack of hexagonal white credit chits with softly glowing blue cores',
      },
    },
    {
      id: 'currency-precious-coin',
      role: 'Precious currency',
      looks: {
        FANTASY: 'a tall stack of gold coins, each struck with a sunburst',
        AGE_OF_STEAM: 'a stack of thick gold coins struck with a winged-wheel crest',
        MODERN: 'a gold bullion coin in a clear round capsule',
        CYBERPUNK: 'a stack of gold-plated crypto chips with glowing amber diamond inlays',
        SPACE_OPERA: 'a stack of iridescent violet crystal credits with gold edging',
      },
    },
    {
      id: 'currency-premium',
      role: 'Premium currency',
      looks: {
        FANTASY: 'a small cluster of cut blue crystals sparkling with light',
        AGE_OF_STEAM: 'a cluster of polished black pearls in a shallow brass dish',
        MODERN: 'a shiny platinum card with a holographic star panel',
        CYBERPUNK: 'a faceted neon-pink data-crystal in a chrome mount with a pulsing core',
        SPACE_OPERA: 'a radiant gold-white star-shard crystal throwing spikes of light',
      },
    },
    {
      id: 'currency-event-token',
      role: 'Event token',
      looks: {
        FANTASY: 'a carved wooden token painted with a red and gold star',
        AGE_OF_STEAM: 'a brass fairground token with a punched star cut-out',
        MODERN: 'a bright red plastic arcade token with a ridged rim',
        CYBERPUNK: 'a translucent holo-token disc with a spinning hot-pink star inside',
        SPACE_OPERA: 'a thin blue light-disc with a gold comet emblem at its centre',
      },
    },
    {
      id: 'currency-honour',
      role: 'Honour currency',
      looks: {
        FANTASY: 'a bronze medal on a red ribbon, struck with crossed blades',
        AGE_OF_STEAM: 'a silver campaign medal on a striped ribbon with a laurel wreath',
        MODERN: 'a gold military challenge coin with a shield crest',
        CYBERPUNK: 'a black arena chip with a chrome rim and a glowing red crossed-blades emblem',
        SPACE_OPERA: 'a polished star-shaped valour insignia in silver and blue',
      },
    },
    {
      id: 'currency-crafting-voucher',
      role: 'Crafting voucher',
      looks: {
        FANTASY: 'a rolled plain parchment scroll tied with a ribbon and a wax seal bearing an anvil',
        AGE_OF_STEAM: 'a brass guild chit stamped with a crossed spanner and hammer',
        MODERN: 'a green plastic voucher card with a wrench emblem',
        CYBERPUNK: 'a slim orange fabricator chip with a glowing gear emblem and gold contact pins',
        SPACE_OPERA: 'a white schematic cartridge with a blue glowing cog emblem',
      },
    },
    {
      id: 'currency-banknote',
      role: 'Banknote',
      looks: {
        FANTASY: 'a thin bundle of folded vellum notes tied with gold cord',
        AGE_OF_STEAM: 'a crisp folded banknote in green and cream with an engraved rosette',
        MODERN: 'a folded wad of green paper banknotes in a silver money clip',
        CYBERPUNK: 'a slim chrome credstick with a glowing green charge bar along its side',
        SPACE_OPERA: 'a thin translucent credit wafer with a shimmering gold hologram seal',
      },
    },
  ],
};
