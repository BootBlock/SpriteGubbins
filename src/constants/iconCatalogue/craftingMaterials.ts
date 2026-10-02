import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The raw stuff a crafting profession gathers and spends: ore, ingots, hide, cloth, timber, herbs,
 * gems, essence, reagents and salvage.
 *
 * **Each material is one stock object, not a finished thing.** A bag full of these sits in neat rows,
 * so every look draws the material in a lump, a bolt, a bundle or a stack rather than as the item it
 * will become.
 */
export const CRAFTING_MATERIALS: IconCatalogueGroup = {
  id: 'crafting-materials',
  label: 'Crafting Materials',
  kind: 'ITEM',
  entries: [
    {
      id: 'material-ore',
      role: 'Raw ore',
      looks: {
        FANTASY: 'a jagged lump of grey rock veined with glinting copper ore',
        AGE_OF_STEAM: 'a rough chunk of dark iron ore with rust-red seams and flecks of coal',
        MODERN: 'a pale grey chunk of bauxite ore with a reddish-brown crust',
        CYBERPUNK: 'a cracked chunk of black rare-earth ore split by glowing hot-pink crystal veins',
        SPACE_OPERA: 'a drifting asteroid fragment of dark ore with luminous blue mineral seams',
      },
    },
    {
      id: 'material-ingot',
      role: 'Refined ingot',
      looks: {
        FANTASY: 'a pair of stacked silver-grey iron bars with a hammered finish',
        AGE_OF_STEAM: 'a cast brass ingot with bevelled edges and a foundry star moulded on its top',
        MODERN: 'a polished aluminium billet with clean machined edges',
        CYBERPUNK: 'a brushed titanium ingot with a cyan glowing strip along its bevelled edge',
        SPACE_OPERA: 'a translucent violet alloy bar with a lattice of light trapped inside',
      },
    },
    {
      id: 'material-hide',
      role: 'Hide and leather',
      looks: {
        FANTASY: 'a rolled tan hide tied with a rawhide thong',
        AGE_OF_STEAM: 'a folded square of oxblood tanned leather bound with a brass-buckled strap',
        MODERN: 'a folded black leather offcut with a neat stitched edge',
        CYBERPUNK: 'a folded sheet of glossy black synth-leather with a faint neon-pink circuit sheen',
        SPACE_OPERA: 'a rolled sheet of grey scaled bio-hide with an iridescent shimmer',
      },
    },
    {
      id: 'material-cloth',
      role: 'Cloth',
      looks: {
        FANTASY: 'a folded bolt of undyed linen cloth tied with string',
        AGE_OF_STEAM: 'a bolt of dark-green tweed wound on a flat wooden board',
        MODERN: 'a folded stack of navy cotton fabric squares',
        CYBERPUNK: 'a spool of black smart-fibre fabric with glowing cyan threads woven through it',
        SPACE_OPERA: 'a folded length of silvery shimmer-silk with a faint holographic ripple',
      },
    },
    {
      id: 'material-timber',
      role: 'Timber',
      looks: {
        FANTASY: 'a pair of rough-cut oak logs bound with rope',
        AGE_OF_STEAM: 'a stack of three sawn mahogany planks with clean squared ends',
        MODERN: 'a stack of pale plywood sheets',
        CYBERPUNK: 'a vacuum-sealed plank of lab-grown bamboo composite with a green glowing seal strip',
        SPACE_OPERA: 'a length of pale crystalline xeno-timber with softly glowing growth rings',
      },
    },
    {
      id: 'material-herb',
      role: 'Herb',
      looks: {
        FANTASY: 'a bundle of green healing herbs tied with twine',
        AGE_OF_STEAM: 'a sprig of dried lavender in a twist of brown paper',
        MODERN: 'a small potted basil plant in a terracotta pot',
        CYBERPUNK: 'a hydroponic grow-pod of bioluminescent green leaves under a clear dome',
        SPACE_OPERA: 'a sealed glass specimen tube holding a curled violet frond that glows faintly',
      },
    },
    {
      id: 'material-gemstone',
      role: 'Gemstone',
      looks: {
        FANTASY: 'a faceted red ruby with a bright sparkle',
        AGE_OF_STEAM: 'a cushion-cut emerald gripped in brass tweezers',
        MODERN: 'a brilliant-cut clear diamond',
        CYBERPUNK: 'a hexagonal synthetic sapphire with a cyan light pulsing at its centre',
        SPACE_OPERA: 'a floating teardrop of golden star-crystal with light refracting through it',
      },
    },
    {
      id: 'material-essence',
      role: 'Magical essence',
      looks: {
        FANTASY: 'a small heap of shimmering violet arcane dust with sparkling motes above it',
        AGE_OF_STEAM: 'a stoppered glass ampoule of swirling luminous aether vapour',
        MODERN: 'a small zip bag of fine glittering silver powder',
        CYBERPUNK: 'a clear chrome-capped capsule of shimmering hot-pink nano-dust',
        SPACE_OPERA: 'a small glass sphere of swirling blue and gold stardust',
      },
    },
    {
      id: 'material-reagent',
      role: 'Alchemical reagent',
      looks: {
        FANTASY: 'a small stone mortar of crushed glowing green crystals with a pestle',
        AGE_OF_STEAM: 'a stoppered test tube of bubbling orange liquid in a brass clamp stand',
        MODERN: 'a brown glass reagent jar with a white screw cap',
        CYBERPUNK: 'a hazard-yellow chem canister with a viewing slot of bubbling acid-green fluid',
        SPACE_OPERA: 'a hexagonal containment cell of slowly churning silver liquid',
      },
    },
    {
      id: 'material-salvage',
      role: 'Salvaged components',
      looks: {
        FANTASY: 'a small heap of broken iron armour scraps and bent rivets',
        AGE_OF_STEAM: 'a small heap of brass cogs, coiled springs and screws',
        MODERN: 'a tangle of scrap copper pipe and loose bolts',
        CYBERPUNK: 'a coil of salvaged copper wiring wrapped round a cracked circuit board',
        SPACE_OPERA: 'a chunk of scorched hull plating with a sparking power conduit',
      },
    },
  ],
};
