import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Loot and equipment — weapons, potions, artefacts. Inventory-scale objects with rarity.
 *
 * The source application left the last five fields without tooltips; they are written here in
 * the same voice, because a field with no tooltip renders no ⓘ at all and the specification
 * calls for guidance on every field.
 */
export const ITEM: CategoryDefinition = {
  label: 'Loot Item / Equipment',
  article: 'an',
  fields: [
    {
      key: 'species',
      label: 'Item Type',
      tooltip:
        'What the item actually is: weapon, potion, armour, artefact. It decides the whole shape language and the component split — a rifle with a detachable magazine breaks down very differently from a single-piece potion.',
      options: [
        'Melee Weapon (Sword/Axe)',
        'Ranged Weapon (Rifle/Bow)',
        'Magical Artefact / Orb',
        'Consumable Potion/Cell',
        'Armor Piece (Helmet/Shield)',
        'Keycard / Quest Item',
        'Energy Shield Unit',
        // Nine-slice frames and buttons are inventory-scale flat art with rarity-free rules, so they
        // belong to the icon category rather than to props: the field labels here are the right ones.
        'Interface Frame & Button Kit',
        'Crafting Material / Salvage',
        'Map / Chart Scroll',
        'Musical Instrument',
        'Cooking Ingredient',
        'Fishing Rod & Tackle',
        'Currency & Coin Pile',
      ],
    },
    {
      key: 'gender',
      label: 'Rarity / Tier',
      tooltip:
        'The prestige tier, expressed visually rather than as a label. Gold trim, rune glow and artefact energy are what let a player rank a drop at a glance, before reading a word of its description.',
      options: [
        'Legendary / Artifact',
        'Epic Enchanted',
        'Standard Issue / Common',
        'Relic Of Lost Era',
        'Mythic God-Tier',
        'Cursed Prototype',
        'Crafted Masterwork',
      ],
    },
    {
      key: 'age',
      label: 'Condition State',
      tooltip:
        'Surface wear, scratching or overcharge. It is what separates a battlefield pickup from a shop item built to the same design, and it is worth varying across a set that shares one silhouette.',
      options: [
        'Pristine Forge Condition',
        'Battle-Scarred Veteran',
        'Corroded / Ruined',
        'Overcharged Energy',
        'Ancient Sunken Relic',
        'Freshly Synthesized',
      ],
    },
    {
      key: 'role',
      label: 'Item Purpose',
      tooltip:
        'The functional role the item plays in the game. It steers proportion and affordance — a duelling blade and a siege weapon obey different rules about grip length and blade mass, however similar the art style is.',
      options: [
        'Primary Offensive Weapon',
        'Defensive Barrier Shield',
        'Resource / Mana Refill',
        'Quest Essential Key',
        'Buff Emitter Stat Boost',
        'Crafting Material',
      ],
    },
    {
      key: 'setting',
      label: 'Art Style Theme',
      tooltip:
        'The world vocabulary the item is drawn in. It aligns the whole inventory set: fantasy filigree and sci-fi plasma housing rarely coexist in one loot list without looking like an accident.',
      options: [
        'High Fantasy Magic',
        'Cyberpunk Plasma Tech',
        'Steampunk Clockwork',
        'Eldritch Void',
        'Sci-Fi Energy Weapon',
        'Gothic Vampire',
        'Post-Apocalyptic',
        'Nautical Age Of Sail',
        'Cosy Farm Life',
      ],
    },
    {
      key: 'build',
      label: 'Weight & Size',
      tooltip:
        'The item’s scale inside an inventory grid. Stating it explicitly is what stops a dagger and a greatsword being drawn at the same size — the most common failure in a generated icon set.',
      options: [
        'Heavy Two-Handed',
        'Compact One-Handed',
        'Slender Delicate',
        'Over-Sized Colossal',
        'Pocket-Sized Device',
        'Medium Dual-Wield',
      ],
    },
    {
      key: 'silhouette',
      label: 'Blade / Shape Profile',
      tooltip:
        'The outline the item is recognised by. An inventory icon is often seen at 32 px or smaller, where the profile is all that survives and interior engraving does not.',
      options: [
        'Aggressive Serrated Edge',
        'Symmetrical Elegant Blade',
        'Intricate Geometric Core',
        'Ornate Crested Shield',
        'Double-Headed Axe Blade',
        'Curved Katana Edge',
        'Rounded Flask & Stopper',
        'Nine-Slice Panel Corners',
        'Irregular Salvage Bundle',
        'Stacked Coin Column',
      ],
    },
    {
      key: 'face_head',
      label: 'Grip & Pommel',
      tooltip:
        'The hilt, grip texture and pommel — the end a character actually holds. It sets where the item meets a hand socket, so it matters even when the icon itself is never rigged.',
      options: [
        'Leather Wrapped Hilt & Gem Pommel',
        'Ergonomic Synthetic Grip',
        'Dragon-Head Crossguard',
        'Floating Crystal Core',
        'Gold Embossed Trigger Guard',
        'Wax-Sealed Cork & Twine',
        'Riveted Brass Bezel',
        'Frayed Binding Twine',
        'Carved Bone Handle',
      ],
    },
    {
      key: 'anatomy',
      label: 'Item Assembly Base',
      tooltip:
        'How the item splits into components. Choose by what has to detach or animate — a magazine, a blade, a lid — rather than by how detailed the item looks; a rigid icon needs no split at all.',
      options: [
        'Single Weapon Item',
        'Weapon With Detachable Mag',
        'Shield With Emblem',
        'Potion Bottle & Cork',
        'Orb With Floating Rings',
      ],
    },
    {
      key: 'clothing',
      label: 'Scabbard / Holster',
      tooltip:
        'An optional matching sheath or holster, emitted as its own component. Worth asking for when the item has to appear worn on a character as well as sitting in an inventory slot.',
      options: [
        'Matched Scabbard / Sheath',
        'Magnetic Back Sling',
        'Velvet Lined Display Case',
        'NONE',
        'Leather Holster Belt',
        'Runic Power Harness',
      ],
    },
    {
      key: 'worn_details',
      label: 'Runes & Engravings',
      tooltip:
        'Etched runes, serial numbers or energy conduits across the item’s surface. They read as provenance and power, and at inventory scale one bold motif carries much further than a fine repeated pattern.',
      options: [
        'Etched Luminous Runes',
        'Serial Numbers & Barcode',
        'Filigree Gold Inlay',
        'Energy Conduits',
        'Blood Groove & Notch Marks',
        'Circuit Traces',
        'Handwritten Apothecary Label',
        'Tally Notches & Wear Marks',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant body and blade colours — how the item is identified at a glance in a loot list. A clear value gap between the two keeps the icon readable against any inventory background.',
      options: [
        'Damascus Steel & Obsidian',
        'Polished Silver & Gold #F59E0B',
        'Titanium Grey & Black',
        'Deep Ruby Glass #EF4444',
        'Emerald Crystal #10B981 & Platinum',
        'Matte Black & Cyan #06B6D4',
        'Smoked Glass & Aged Brass',
        'Salt-Bleached Driftwood & Rope',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The enchantment glow and energy colours that signal an item is magical or powered. A hex code pins the hue far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
      options: [
        'Ethereal Arcane Purple #8B5CF6',
        'Plasma Blue Glow #22D3EE',
        'Golden Sunburst #F59E0B',
        'Toxic Poison Green #84CC16',
        'Crimson Fire #EF4444',
        'Solar Gold',
        'Void Black',
      ],
    },
    {
      key: 'materials',
      label: 'Core Material',
      tooltip:
        'What the item is forged from, and how light reads off it: polished metal takes a hard specular, crystal transmits, polymer stays flat. It is the strongest cue for how heavy the item is meant to feel.',
      options: [
        'Mithril & Dragon Scale',
        'Plasma Conduit & Polymer',
        'Enchanted Crystal & Platinum',
        'Valyrian Steel',
        'Obsidian Glass & Brass',
        'Carbon Fibre & Titanium',
        'Blown Glass, Cork & Wax',
        'Salt-Cured Rope & Driftwood',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping hands, stands and effect flourishes out of an isolated inventory icon. Drop shadows and glow trails are worth naming explicitly: both extend past the item’s own bounds and break grid alignment.',
      options: [
        'No holding hand or character',
        'No pedestal or stand',
        'No magic smoke trails',
        'No floor shadow',
        'No text or stats box',
        'No holding hand or character, no pedestal or stand, no text or stats box',
        'No holding hand or character, no magic smoke trails, no floor shadow',
        'No text or stats box, no drop shadow, no placeholder lorem text',
      ],
    },
    {
      key: 'additional_anatomy',
      // Not "Attached Attachments", which said the same word twice and said nothing: this label is
      // now what section 1 and section 4 of the prompt call these pieces, so a tautology is an
      // instruction that carries no information in the two places it is read hardest.
      label: 'Detachable Parts',
      tooltip:
        'Extra detachable parts — scopes, ribbons, power cells — each isolated into its own sprite slot so it can be swapped or animated. Comma-separated, with ×N for how many of each: “Scope ×1, Charm Ribbon ×2” names three pieces, each drawn at every facing the sheet covers — fifteen components on a five-view directional core, three on a single-facing sheet.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Attachable Scope ×1, Laser Sight ×1',
        'Elemental Effect Aura ×1',
        'Tassel ×2, Charm Ribbon ×2',
        'Bayonet Blade Tip ×1',
        'Secondary Energy Cell ×1',
        'Filled Variant ×3, Empty Variant ×1, Cork Stopper ×1',
        'Scabbard ×1, Loose Pommel Gem ×1',
        'Panel Corner ×4, Panel Edge ×4, Button State ×3, Slider Track ×1, Slider Knob ×1',
      ],
    },
  ],
};
