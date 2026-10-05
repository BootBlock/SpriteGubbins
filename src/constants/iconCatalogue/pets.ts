import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The small companions a character keeps at their side: a hovering pet, a cat, a hound, a bird, a
 * crawler, a little dragon, a construct and an ooze.
 *
 * **Each pet is drawn whole and alone, with no owner beside it.** A pet bar and a collection panel
 * both show the animal itself, so every look gives the full creature or machine at a size that reads
 * in one slot, with at most a collar or a light to tell it apart.
 */
export const PETS: IconCatalogueGroup = {
  id: 'pets',
  label: 'Pets',
  kind: 'COMPANION',
  entries: [
    {
      id: 'pet-drone',
      role: 'Hovering companion pet',
      looks: {
        FANTASY: 'a floating wisp of pale light with a pair of gossamer wings',
        AGE_OF_STEAM: 'a clockwork brass bumblebee with whirring glass wings',
        MODERN: 'a small white camera quadcopter with four spinning propellers',
        CYBERPUNK:
          'a palm-sized quad-rotor drone of scuffed black carbon with a single glowing red camera lens and a bent antenna',
        SPACE_OPERA: 'a white spherical companion droid with a single blue optic and a hovering ring',
      },
    },
    {
      id: 'pet-feline',
      role: 'Feline companion pet',
      looks: {
        FANTASY: 'a sleek black cat with a tiny silver crescent charm on its collar',
        AGE_OF_STEAM: 'a clockwork brass cat with a wind-up key in its side',
        MODERN: 'a ginger tabby cat sitting with its tail curled round its paws',
        CYBERPUNK:
          'a robo-cat with a matte-black alloy body, exposed brushed-steel joints and glowing cyan eyes',
        SPACE_OPERA: 'a white alien feline with long ears and soft glowing blue spots',
      },
    },
    {
      id: 'pet-hound',
      role: 'Hound companion pet',
      looks: {
        FANTASY: 'a grey wolfhound pup in a studded leather collar',
        AGE_OF_STEAM: 'a clockwork brass bulldog with riveted plating and a tiny steam vent',
        MODERN: 'a tan-and-black shepherd dog in a black tactical harness',
        CYBERPUNK:
          'a lean cyber-hound with a brushed-steel spine, exposed hydraulic legs and a glowing red visor slit',
        SPACE_OPERA: 'a white robotic hound with smooth ceramic panels and a blue light strip along its back',
      },
    },
    {
      id: 'pet-bird',
      role: 'Bird companion pet',
      looks: {
        FANTASY: 'a phoenix chick with flickering flame feathers',
        AGE_OF_STEAM: 'a clockwork brass owl with round glass lens eyes',
        MODERN: 'a scarlet macaw with long tail feathers',
        CYBERPUNK:
          'a cyber-raven with matte-black feathers, a brushed-steel beak and one glowing red optic implant',
        SPACE_OPERA: 'a white alien songbird with translucent crest plumes glowing soft blue',
      },
    },
    {
      id: 'pet-crawler',
      role: 'Crawling companion pet',
      looks: {
        FANTASY: 'a black spiderling the size of a cat with glowing violet eyes',
        AGE_OF_STEAM: 'a clockwork brass crab with riveted pincers and a tiny chimney puffing steam',
        MODERN: 'a hermit crab peeking out of a spiral seashell',
        CYBERPUNK:
          'a brushed-steel robot spider with eight jointed needle legs and a cluster of glowing red sensor eyes',
        SPACE_OPERA: 'a white six-legged scuttler bot with a domed shell and a blue scanning light',
      },
    },
    {
      id: 'pet-dragon',
      role: 'Small dragon companion pet',
      looks: {
        FANTASY: 'a small green dragon whelp with leathery wings and tiny horns',
        AGE_OF_STEAM: 'a clockwork brass dragon with copper scales and steam curling from its snout',
        MODERN: 'a bearded dragon lizard with its spiny beard puffed out',
        CYBERPUNK:
          'a small mechanical dragon of brushed-steel scales with neon-violet wing membranes and glowing exhaust nostrils',
        SPACE_OPERA: 'a white crystalline star-dragon hatchling with glowing blue wing veins',
      },
    },
    {
      id: 'pet-construct',
      role: 'Construct companion pet',
      looks: {
        FANTASY: 'a small stone golem with glowing cracks running across its body',
        AGE_OF_STEAM: 'a brass automaton with a round boiler belly and a wind-up key in its back',
        MODERN: 'a small white consumer robot on two wheels with a round blank display visor',
        CYBERPUNK:
          'a stubby scrap-built security bot of welded brushed-steel plates on caterpillar treads with a single glowing red optic',
        SPACE_OPERA: 'a white astromech drone with a domed top and a blue holo-emitter',
      },
    },
    {
      id: 'pet-ooze',
      role: 'Amorphous companion pet',
      looks: {
        FANTASY: 'a green gelatinous slime with a tiny rusted key suspended inside it',
        AGE_OF_STEAM: 'a blob of glowing aether gel quivering inside a brass-caged bell jar',
        MODERN: 'a wobbling blob of glossy blue toy slime',
        CYBERPUNK:
          'a quivering blob of brushed-steel nanite gel with circuit-like ripples across its surface and a pair of glowing cyan eyes',
        SPACE_OPERA: 'a translucent violet plasma jelly with a softly glowing core',
      },
    },
  ],
};
