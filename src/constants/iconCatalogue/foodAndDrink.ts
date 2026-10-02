import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * Things a character eats and drinks: rations, cooked dishes, drink, a shared feast and a spiced dish
 * that leaves a well-fed buff.
 *
 * **Each look is one serving, never a table.** A dish is drawn on its own plate, bowl or wrapper, so it
 * reads as a single item at icon size; even the feast is one platter or one pot rather than a spread.
 */
export const FOOD_AND_DRINK: IconCatalogueGroup = {
  id: 'food-and-drink',
  label: 'Food and drink',
  kind: 'ITEM',
  entries: [
    {
      id: 'food-bread-ration',
      role: 'Bread ration',
      looks: {
        FANTASY: 'a round crusty loaf of brown bread with a scored top',
        AGE_OF_STEAM: 'a stack of hard ship biscuits tied with string',
        MODERN: 'a foil-wrapped military ration pack with a tear notch',
        CYBERPUNK: 'a vacuum-sealed protein brick in silver foil with a glowing green freshness strip',
        SPACE_OPERA: 'a white nutrient cube in a clear hexagonal blister with a soft blue glow',
      },
    },
    {
      id: 'food-cooked-meat',
      role: 'Cooked meat',
      looks: {
        FANTASY: 'a roasted leg of meat on the bone, browned and glistening',
        AGE_OF_STEAM: 'an opened tin of corned beef with its wind-off key curled at the side',
        MODERN: 'a grilled burger in a sesame bun',
        CYBERPUNK: 'a skewer of glazed vat-grown meat cubes with a drizzle of neon-orange sauce',
        SPACE_OPERA:
          'a seared slab of synthesised steak on a white ceramic tray with a faint blue heat shimmer',
      },
    },
    {
      id: 'food-fish-dish',
      role: 'Fish dish',
      looks: {
        FANTASY: 'a grilled fish fillet on a wooden plank with a sprig of herbs',
        AGE_OF_STEAM: 'a flat oval tin of sardines with its lid peeled back',
        MODERN: 'a paper cone of battered fish and chips',
        CYBERPUNK: 'a black bento tray of glowing amber vat-grown sashimi with a chrome dipping dish',
        SPACE_OPERA: 'a fillet of teal-glowing algae protein on a sleek white tray',
      },
    },
    {
      id: 'food-fruit',
      role: 'Fresh fruit',
      looks: {
        FANTASY: 'a shiny red apple with a green leaf on its stalk',
        AGE_OF_STEAM: 'a bright orange in a twist of waxed paper',
        MODERN: 'a ripe yellow banana',
        CYBERPUNK: 'a gene-spliced neon-purple fruit glowing through a clear plastic clamshell pack',
        SPACE_OPERA: 'a pearl-blue hydroponic melon with faintly luminous ridges',
      },
    },
    {
      id: 'food-stew',
      role: 'Hearty stew',
      looks: {
        FANTASY: 'a wooden bowl of thick brown stew with a wooden spoon',
        AGE_OF_STEAM: 'a dented enamel mess tin of beef stew with a steel spoon',
        MODERN: 'a white ceramic bowl of steaming soup with a bread roll on its rim',
        CYBERPUNK: 'a steaming noodle cup with chopsticks and a neon-amber lid',
        SPACE_OPERA: 'a white self-heating meal pouch with a steam vent and a glowing orange heat seam',
      },
    },
    {
      id: 'drink-water',
      role: 'Water ration',
      looks: {
        FANTASY: 'a leather waterskin with a wooden stopper',
        AGE_OF_STEAM: 'a riveted tin canteen with a cork stopper and a canvas strap',
        MODERN: 'a clear plastic water bottle with a blue cap',
        CYBERPUNK: 'a chrome-capped hydration pouch of filtered water with a glowing blue purity strip',
        SPACE_OPERA: 'a white water-reclamation flask with a glowing blue purifier core',
      },
    },
    {
      id: 'drink-ale',
      role: 'Ale',
      looks: {
        FANTASY: 'an iron-banded wooden tankard of foaming ale',
        AGE_OF_STEAM: 'a pewter beer stein with a hinged lid',
        MODERN: 'a brown glass beer bottle with a crown cap',
        CYBERPUNK: 'a can of synth-lager in a holographic sleeve shimmering violet and cyan',
        SPACE_OPERA: 'a slender crystal flute of fizzing amber nebula wine',
      },
    },
    {
      id: 'food-feast',
      role: 'Shared feast',
      looks: {
        FANTASY: 'a large wooden platter heaped with roast meat, bread and fruit',
        AGE_OF_STEAM: 'a silver cloche-covered serving tray with steam curling from under its rim',
        MODERN: 'a large pizza in an open cardboard box',
        CYBERPUNK:
          'a steaming hotpot on a glowing induction base, heaped with noodles, meat and greens around its rim',
        SPACE_OPERA:
          'a white banquet pod with its domed lid raised over a spread of glowing colourful dishes',
      },
    },
    {
      id: 'food-sweet-treat',
      role: 'Sweet treat',
      looks: {
        FANTASY: 'a round honey cake topped with red berries',
        AGE_OF_STEAM: 'a glass jar of striped boiled sweets with a brass lid',
        MODERN: 'a chocolate-frosted doughnut with sprinkles',
        CYBERPUNK: 'a skewer of neon-glazed mochi balls in crimson, cyan and yellow',
        SPACE_OPERA: 'a translucent jelly sphere with a swirl of glowing stardust inside',
      },
    },
    {
      id: 'drink-hot',
      role: 'Hot drink',
      looks: {
        FANTASY: 'a clay mug of steaming herbal tea with a sprig of mint',
        AGE_OF_STEAM: 'a porcelain teacup on its saucer with a curl of steam',
        MODERN: 'a paper takeaway coffee cup with a plastic lid and a card sleeve',
        CYBERPUNK:
          'a matte-black self-heating coffee can with a glowing red heat indicator and a curl of steam',
        SPACE_OPERA: 'a white thermal mug with a floating sphere of hot tea above its rim',
      },
    },
    {
      id: 'food-spiced-buff',
      role: 'Well-fed spiced dish',
      looks: {
        FANTASY: 'a steaming clay bowl of fiery red spiced stew with chillies on its rim',
        AGE_OF_STEAM: 'a covered brass tiffin pot of curry with steam escaping from its lid',
        MODERN: 'a takeaway box of spicy noodles with a red chilli on the lid',
        CYBERPUNK: 'a paper tray of spiced street-food dumplings glistening with glowing orange chilli oil',
        SPACE_OPERA: 'a red flavour-burst capsule of xeno-spice flecked with glowing orange specks',
      },
    },
  ],
};
