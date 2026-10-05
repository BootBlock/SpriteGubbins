import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The trades that turn materials into gear: augmentation, weapons, chemicals, armour, electronics,
 * code, clothing and food.
 *
 * **Each trade is an emblem: its tool at work on its product.** An anvil alone is a tool, and a blade
 * alone is loot, so every look draws the two together, a half-forged blade on the anvil. That keeps
 * the shelf apart from the tools and the raw materials the item shelves already hold.
 */
export const CRAFTING_PROFESSIONS: IconCatalogueGroup = {
  id: 'crafting-professions',
  label: 'Crafting professions',
  kind: 'PROFESSION',
  entries: [
    {
      id: 'craft-cybernetics',
      role: 'Augmentation crafting',
      looks: {
        FANTASY: 'a silver enchanting rod tracing a glowing spiral of light onto a steel ring',
        AGE_OF_STEAM: 'a brass clockwork prosthetic joint clamped in a vice beside a small screwdriver',
        MODERN: 'a carbon-fibre running-blade prosthesis with a hex key resting against it',
        CYBERPUNK:
          'a gleaming brushed-steel optic implant held in a surgical clamp, a ripperdoc laser welding a glowing neural port into its open housing',
        SPACE_OPERA: 'a white nano-fabricator ring printing a sleek implant in blue light',
      },
    },
    {
      id: 'craft-weaponsmithing',
      role: 'Weaponsmithing',
      looks: {
        FANTASY: 'an iron anvil with a half-forged glowing sword blade and a hammer resting on it',
        AGE_OF_STEAM: 'a steam drop hammer pounding a red-hot sabre blade on a riveted anvil',
        MODERN: 'a gunsmith’s bench vice holding a stripped pistol slide beside a brass cleaning rod',
        CYBERPUNK:
          'a computer-controlled mill carving a glowing red-hot mono-katana blade, brushed-steel shavings spraying from its cutter',
        SPACE_OPERA: 'a white forge cradle holding a plasma rifle as its barrel takes shape in blue light',
      },
    },
    {
      id: 'craft-chem-synthesis',
      role: 'Chemical synthesis',
      looks: {
        FANTASY: 'a bubbling glass alembic over a small flame, dripping into a corked potion vial',
        AGE_OF_STEAM: 'a brass and glass still with a coiled copper condenser dripping into a flask',
        MODERN: 'a conical lab flask spinning on a magnetic stirrer beside a rack of filled test tubes',
        CYBERPUNK:
          'a brushed-steel centrifuge with a single glowing green synth vial spinning in its open drum',
        SPACE_OPERA:
          'a white molecular synthesiser pod assembling a glowing vial from a lattice of blue particles',
      },
    },
    {
      id: 'craft-armourcraft',
      role: 'Armourcraft',
      looks: {
        FANTASY: 'a steel breastplate on a wooden stand with a riveting hammer resting against it',
        AGE_OF_STEAM: 'a riveted brass pauldron clamped in a vice beside a pneumatic rivet gun',
        MODERN: 'an olive plate-carrier vest with a ceramic armour plate half slotted into its pouch',
        CYBERPUNK:
          'a matte-black ballistic chest rig on a fabrication rack, a plasma welder fusing a glowing seam into its brushed-steel trauma plates',
        SPACE_OPERA: 'a white power-armour chest piece floating in a blue fabrication beam',
      },
    },
    {
      id: 'craft-electronics',
      role: 'Electronics and engineering',
      looks: {
        FANTASY: 'a tinker’s wrench beside a half-built clockwork songbird with its gears exposed',
        AGE_OF_STEAM:
          'a half-wound brass galvanic coil with insulated pliers resting across its copper windings',
        MODERN: 'a green circuit board with a soldering iron touching one joint and a thin curl of smoke',
        CYBERPUNK:
          'a jury-rigged black circuit board bristling with salvaged chips and amber diodes, a hot soldering iron trailing a wisp of smoke above it',
        SPACE_OPERA: 'a white engineering drone welding a glowing blue circuit lattice',
      },
    },
    {
      id: 'craft-netcrafting',
      role: 'Code and inscription crafting',
      looks: {
        FANTASY: 'a quill dipped in glowing ink resting across a rolled spell scroll tied with ribbon',
        AGE_OF_STEAM: 'a brass card-punch press pressing holes into a stiff paper punch card',
        MODERN: 'a black thumb-drive plugged into a small circuit board, its activity light pulsing',
        CYBERPUNK:
          'a translucent data shard slotted into a battered cyberdeck, its circuit traces flaring cyan as a quickhack burns in',
        SPACE_OPERA: 'a white holo-stylus etching a glowing blue crystal data wafer',
      },
    },
    {
      id: 'craft-tailoring',
      role: 'Tailoring',
      looks: {
        FANTASY: 'a steel needle and a spool of thread stitching the hem of a folded green cloak',
        AGE_OF_STEAM: 'a black-and-gold treadle sewing machine stitching a tweed waistcoat',
        MODERN: 'a half-sewn denim jacket with tailor’s shears and a coiled tape measure',
        CYBERPUNK:
          'a robotic sewing rig needling glowing cyan smart-fibre into the seam of a black armoured trench coat',
        SPACE_OPERA: 'a white robotic loom weaving a shimmering silvery flight suit from threads of light',
      },
    },
    {
      id: 'craft-cooking',
      role: 'Cooking',
      looks: {
        FANTASY: 'a wooden spoon resting across a bubbling iron cooking pot hung from a tripod',
        AGE_OF_STEAM: 'a copper saucepan steaming on a small cast-iron coal stove',
        MODERN: 'a chef’s knife on a wooden chopping board beside a heap of sliced vegetables',
        CYBERPUNK:
          'a battered steel wok flaring over a portable plasma burner, glowing synth-noodles leaping from it',
        SPACE_OPERA: 'a white food-replicator alcove materialising a steaming bowl in blue light',
      },
    },
  ],
};
