import type { IconCatalogueGroup } from '../../types/iconCatalogue.ts';

/**
 * The placeholders a character panel shows in each equipment slot before anything is worn there.
 *
 * **Each slot is one plain piece, drawn empty.** The panel greys the drawing out behind a worn item,
 * so a look names the most typical piece for its slot with nothing inside it: a glove with no hand,
 * a helmet with nobody under it.
 */
export const EQUIPMENT_SLOTS: IconCatalogueGroup = {
  id: 'equipment-slots',
  kind: 'ITEM',
  entries: [
    {
      id: 'gear-head',
      role: 'Head slot',
      looks: {
        FANTASY: 'a steel great helm with a narrow visor slit',
        AGE_OF_STEAM: 'a leather aviator helmet with brass goggles',
        MODERN: 'a black motorcycle helmet with a tinted visor',
        CYBERPUNK: 'a smart-visor helmet with a wraparound cyan HUD strip',
        SPACE_OPERA: 'a white sealed space helmet with a gold reflective dome',
      },
    },
    {
      id: 'gear-neck',
      role: 'Neck slot',
      looks: {
        FANTASY: 'a silver amulet with a blue gem on a fine chain',
        AGE_OF_STEAM: 'a brass locket with a cog inlay on a watch chain',
        MODERN: 'a gold chain with a small round pendant',
        CYBERPUNK: 'a chrome neural collar with a glowing cyan data port',
        SPACE_OPERA: 'a crystal pendant floating within a ring of light on a silver cord',
      },
    },
    {
      id: 'gear-shoulders',
      role: 'Shoulder slot',
      looks: {
        FANTASY: 'a pair of steel pauldrons with gold trim',
        AGE_OF_STEAM: 'a pair of riveted brass shoulder plates with leather straps',
        MODERN: 'a pair of padded tactical shoulder guards',
        CYBERPUNK: 'a pair of angular carbon pauldrons with hot-pink neon edging',
        SPACE_OPERA: 'a pair of white armour pauldrons with blue glowing vents',
      },
    },
    {
      id: 'gear-back',
      role: 'Back slot',
      looks: {
        FANTASY: 'a flowing crimson cloak with a gold clasp',
        AGE_OF_STEAM: 'a brown oilskin cape with brass buttons',
        MODERN: 'a black hooded rain cape',
        CYBERPUNK: 'a long black data-cloak with a glowing cyan circuit hem',
        SPACE_OPERA: 'a white jet-pack with twin blue thrusters',
      },
    },
    {
      id: 'gear-chest',
      role: 'Chest slot',
      looks: {
        FANTASY: 'a steel breastplate with a gold sunburst crest',
        AGE_OF_STEAM: 'a riveted leather brigandine with brass buttons',
        MODERN: 'a black ballistic tactical vest with pouches',
        CYBERPUNK: 'a matte black armoured chest rig with glowing cyan seams',
        SPACE_OPERA: 'a white sculpted armour cuirass with a glowing blue reactor disc',
      },
    },
    {
      id: 'gear-wrist',
      role: 'Wrist slot',
      looks: {
        FANTASY: 'a pair of tooled leather bracers',
        AGE_OF_STEAM: 'a brass vambrace with a tiny pressure gauge',
        MODERN: 'a black rubber fitness band',
        CYBERPUNK: 'a chrome wrist-deck cuff with a glowing holo-panel',
        SPACE_OPERA: 'a sleek silver wrist cuff ringed with blue light',
      },
    },
    {
      id: 'gear-hands',
      role: 'Hands slot',
      looks: {
        FANTASY: 'an empty steel gauntlet with articulated plates',
        AGE_OF_STEAM: 'an empty brown leather driving glove with a brass snap',
        MODERN: 'an empty black padded work glove',
        CYBERPUNK: 'an empty black synth-leather glove with glowing cyan knuckle lines',
        SPACE_OPERA: 'an empty white pressure glove with a metal wrist ring',
      },
    },
    {
      id: 'gear-waist',
      role: 'Waist slot',
      looks: {
        FANTASY: 'a broad leather belt with an iron buckle',
        AGE_OF_STEAM: 'a wide leather belt with a brass buckle and a hanging spanner',
        MODERN: 'a black webbing utility belt with a quick-release buckle',
        CYBERPUNK: 'a segmented chrome belt with a glowing hot-pink power buckle',
        SPACE_OPERA: 'a white utility belt with small blue glowing capsules',
      },
    },
    {
      id: 'gear-legs',
      role: 'Legs slot',
      looks: {
        FANTASY: 'a pair of chainmail leggings',
        AGE_OF_STEAM: 'a pair of tweed trousers with brass knee plates',
        MODERN: 'a pair of grey cargo trousers',
        CYBERPUNK: 'a pair of armoured black leggings with neon-cyan knee pads',
        SPACE_OPERA: 'a pair of white armoured leg plates with blue light seams',
      },
    },
    {
      id: 'gear-feet',
      role: 'Feet slot',
      looks: {
        FANTASY: 'a pair of leather boots with iron toe caps',
        AGE_OF_STEAM: 'a pair of hobnailed boots with brass buckles',
        MODERN: 'a pair of white running trainers',
        CYBERPUNK: 'a pair of chunky black combat boots with glowing hot-pink soles',
        SPACE_OPERA: 'a pair of white mag-lock boots with blue thruster heels',
      },
    },
    {
      id: 'gear-finger',
      role: 'Ring slot',
      looks: {
        FANTASY: 'a gold ring set with a red gem',
        AGE_OF_STEAM: 'a brass signet ring with a cog crest',
        MODERN: 'a plain platinum band',
        CYBERPUNK: 'a black smart-ring with a thin pulsing cyan line',
        SPACE_OPERA: 'a silver ring round a floating blue crystal',
      },
    },
    {
      id: 'gear-trinket',
      role: 'Trinket slot',
      looks: {
        FANTASY: 'a carved bone charm hanging from a cord',
        AGE_OF_STEAM: 'a closed brass pocket watch engraved with a cog',
        MODERN: 'a pair of ivory dice with black pips',
        CYBERPUNK: 'a cracked neon-green data-chip charm on a chain',
        SPACE_OPERA: 'a small glowing crystal shard in a gold cage',
      },
    },
    {
      id: 'gear-main-hand',
      role: 'Main-hand slot',
      looks: {
        FANTASY: 'a steel arming blade with a leather-wrapped hilt',
        AGE_OF_STEAM: 'a brass-hilted cavalry sabre',
        MODERN: 'a black combat knife with a serrated spine',
        CYBERPUNK: 'a glowing hot-pink mono-katana with a chrome hilt',
        SPACE_OPERA: 'a plasma blade hilt with a blazing blue beam',
      },
    },
    {
      id: 'gear-off-hand',
      role: 'Off-hand slot',
      looks: {
        FANTASY: 'a round wooden shield with an iron boss',
        AGE_OF_STEAM: 'a riveted brass buckler with a gear-shaped boss',
        MODERN: 'a black polycarbonate riot shield',
        CYBERPUNK: 'a chrome emitter projecting a hexagonal cyan hard-light shield',
        SPACE_OPERA: 'a curved white energy shield with a golden edge',
      },
    },
    {
      id: 'gear-ranged',
      role: 'Ranged slot',
      looks: {
        FANTASY: 'a recurve longbow of yew with a taut string',
        AGE_OF_STEAM: 'a long brass-barrelled rifle with a telescopic sight',
        MODERN: 'a black compound bow with pulley cams',
        CYBERPUNK: 'a chrome smart-pistol with a red laser sight and a glowing magazine',
        SPACE_OPERA: 'a sleek white blaster rifle with a blue glowing power cell',
      },
    },
    {
      id: 'gear-tabard',
      role: 'Tabard slot',
      looks: {
        FANTASY: 'a red heraldic tabard bearing a gold crown',
        AGE_OF_STEAM: 'a felt regimental pennant with a cog crest',
        MODERN: 'a fabric team pennant with a white star',
        CYBERPUNK: 'a holographic gang-emblem patch with a flickering hot-pink wing crest',
        SPACE_OPERA: 'a white faction banner with a gold star crest',
      },
    },
  ],
};
