import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The services a town offers a player: buying and selling, repair, storage, travel, rest and a change
 * of appearance, as they appear on a vendor's gossip options and above a service provider.
 *
 * **Each service is the tool of its trade, never the trader.** A repair is an anvil and a bank is a
 * strongbox, so none of these entries draws a figure.
 */
export const SERVICES: IconCatalogueGroup = {
  id: 'services',
  kind: 'SYSTEM',
  entries: [
    {
      id: 'service-auction-house',
      role: 'Auction house',
      looks: {
        FANTASY: 'a carved wooden gavel resting across a small round sounding block',
        AGE_OF_STEAM: 'a brass auctioneer bell with a polished mahogany gavel beside it',
        MODERN: 'a dark wooden gavel striking its block',
        CYBERPUNK:
          'a chrome gavel with a neon-cyan striking end hovering over a black bidding pad that flares hot-pink',
        SPACE_OPERA: 'a white exchange pylon with gold light streaming between two floating cargo cubes',
      },
    },
    {
      id: 'service-vendor',
      role: 'Vendor',
      looks: {
        FANTASY: 'a fat leather coin purse tied with a drawstring, gold coins spilling out of it',
        AGE_OF_STEAM: 'a brass cash register with a crank and an open coin drawer',
        MODERN: 'a brown paper shopping bag with twin cord grips',
        CYBERPUNK: 'a chrome credit chip on a neon-yellow lanyard, its contact strip glowing gold',
        SPACE_OPERA: 'a white trade pod with a stack of glowing gold credit wafers on top',
      },
    },
    {
      id: 'service-repair',
      role: 'Repair',
      looks: {
        FANTASY: 'an iron anvil with a smithing hammer resting on its horn',
        AGE_OF_STEAM: 'a brass adjustable spanner crossed with a riveting hammer',
        MODERN: 'a steel spanner crossed with a screwdriver',
        CYBERPUNK: 'a chrome multitool spanner with a glowing orange weld tip throwing a spray of sparks',
        SPACE_OPERA: 'a white repair drone with a blue welding beam reaching down from it',
      },
    },
    {
      id: 'service-bank',
      role: 'Bank',
      looks: {
        FANTASY: 'an iron-bound oak strongbox with a heavy padlock and gold coins at its lid',
        AGE_OF_STEAM: 'a round brass vault door with a spoked wheel at its centre',
        MODERN: 'a grey steel safe with a dial and a lever',
        CYBERPUNK:
          'a black armoured vault cube with a glowing cyan keypad grid and a hot-pink seal running round its door',
        SPACE_OPERA: 'a white vault pod held shut by a ring of blue energy clamps',
      },
    },
    {
      id: 'service-trade',
      role: 'Trade with a player',
      looks: {
        FANTASY: 'a pair of brass merchant scales with a gold coin in one pan and a gem in the other',
        AGE_OF_STEAM: 'a pair of brass balance scales on a mahogany base',
        MODERN: 'a pair of curved arrows chasing each other in a circle, one green and one blue',
        CYBERPUNK:
          'a pair of chrome data shards swapping places along curved neon-cyan and hot-pink arrows of light',
        SPACE_OPERA: 'a pair of white cargo cubes passing each other along a pale-blue beam',
      },
    },
    {
      id: 'service-crafting-orders',
      role: 'Crafting orders',
      looks: {
        FANTASY: 'a sealed parchment commission crossed with a small smithing hammer',
        AGE_OF_STEAM: 'a brass pneumatic tube canister with a work order rolled inside and a cog on its cap',
        MODERN: 'a clipboard with a blank work order and a spanner clipped to it',
        CYBERPUNK:
          'a black fabricator cartridge with a glowing orange progress bar and a chrome gear on its end cap',
        SPACE_OPERA: 'a white fabrication cube with a blue blueprint grid glowing on its top',
      },
    },
    {
      id: 'service-buyback',
      role: 'Buyback',
      looks: {
        FANTASY: 'a leather coin purse with a curved arrow sweeping back towards it',
        AGE_OF_STEAM: 'a brass pawnbroker hook holding a string-tied parcel',
        MODERN: 'a brown shopping bag with a curved return arrow over it',
        CYBERPUNK:
          'a chrome credit chip circled by a glowing amber return arrow that loops back to its start',
        SPACE_OPERA: 'a white cargo cube drawn back towards a pad by a curved blue tractor beam',
      },
    },
    {
      id: 'service-flight-master',
      role: 'Flight master',
      looks: {
        FANTASY: 'a single outspread feathered wing in white and gold',
        AGE_OF_STEAM: 'a small brass dirigible with a striped canvas envelope',
        MODERN: 'a white passenger plane banking upwards',
        CYBERPUNK:
          'a matte black air-taxi drone with four rotors and neon-cyan underlights cutting through rain',
        SPACE_OPERA: 'a sleek white shuttle with blue engine glow trailing behind it',
      },
    },
    {
      id: 'service-innkeeper',
      role: 'Innkeeper',
      looks: {
        FANTASY: 'a foaming wooden tankard bound with iron hoops',
        AGE_OF_STEAM: 'a brass oil lamp beside a turned-down bed with a patchwork quilt',
        MODERN: 'a single bed with a white pillow and a folded blue blanket',
        CYBERPUNK: 'a stacked capsule-hotel pod with its hatch open and a warm amber glow inside',
        SPACE_OPERA: 'a white cryo-rest pod with a soft blue light behind its frosted lid',
      },
    },
    {
      id: 'service-appearance',
      role: 'Appearance change',
      looks: {
        FANTASY: 'a tall gilded dressing mirror on a stand with a silk cloak draped over its corner',
        AGE_OF_STEAM: 'a wooden coat hanger holding a tailored waistcoat',
        MODERN: 'a wire coat hanger holding a folded shirt',
        CYBERPUNK:
          'a chrome coat hanger holding a jacket whose panels shift between neon-pink and cyan in a glitching shimmer',
        SPACE_OPERA: 'a white garment pod projecting a rotating blue holographic tunic',
      },
    },
  ],
};
