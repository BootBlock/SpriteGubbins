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
  fields: [
    {
      key: 'species',
      label: 'Item Type',
      tooltip: 'Defines weapon, potion, armor, or artifact item type.',
      options: [
        'Melee Weapon (Sword/Axe)',
        'Ranged Weapon (Rifle/Bow)',
        'Magical Artefact / Orb',
        'Consumable Potion/Cell',
        'Armor Piece (Helmet/Shield)',
        'Keycard / Quest Item',
        'Energy Shield Unit',
      ],
    },
    {
      key: 'gender',
      label: 'Rarity / Tier',
      tooltip: 'Guides visual prestige (gold trim, rune glows, artifact energy).',
      options: [
        'Legendary / Artifact',
        'Epic Enchanted',
        'Standard Issue / Common',
        'Relic of Lost Era',
        'Mythic God-Tier',
        'Cursed Prototype',
        'Crafted Masterwork',
      ],
    },
    {
      key: 'age',
      label: 'Condition State',
      tooltip: 'Sets surface wear, scratches, or power overcharge state.',
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
      tooltip: 'Defines functional combat or utility role in game design.',
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
      tooltip: 'Aligns item style with world theme (magic fantasy vs sci-fi plasma).',
      options: [
        'High Fantasy Magic',
        'Cyberpunk Plasma Tech',
        'Steampunk Clockwork',
        'Eldritch Void',
        'Sci-Fi Energy Weapon',
        'Gothic Vampire',
        'Post-Apocalyptic',
      ],
    },
    {
      key: 'build',
      label: 'Weight & Size',
      tooltip: 'Establishes item scale within inventory grid slots.',
      options: [
        'Heavy Two-Handed',
        'Compact One-Handed',
        'Slender Delicate',
        'Over-sized Colossal',
        'Pocket-Sized Device',
        'Medium Dual-Wield',
      ],
    },
    {
      key: 'silhouette',
      label: 'Blade / Shape Profile',
      tooltip: 'Focuses sharp blade contours, shield silhouettes, or potion shapes.',
      options: [
        'Aggressive Serrated Edge',
        'Symmetrical Elegant Blade',
        'Intricate Geometric Core',
        'Ornate Crested Shield',
        'Double-Headed Axe Blade',
        'Curved Katana Edge',
      ],
    },
    {
      key: 'face_head',
      label: 'Grip & Pommel',
      tooltip: 'Defines hilt, grip texture, or crystal core pommel.',
      options: [
        'Leather Wrapped Hilt & Gem Pommel',
        'Ergonomic Synthetic Grip',
        'Dragon-Head Crossguard',
        'Floating Crystal Core',
        'Gold Embossed Trigger Guard',
      ],
    },
    {
      key: 'anatomy',
      label: 'Item Assembly Base',
      tooltip: 'Controls component isolation (e.g., weapon + detachable magazine).',
      options: [
        'SINGLE WEAPON ITEM',
        'WEAPON WITH DETACHABLE MAG',
        'SHIELD WITH EMBLEM',
        'POTION BOTTLE & CORK',
        'ORB WITH FLOATING RINGS',
      ],
    },
    {
      key: 'clothing',
      label: 'Scabbard / Holster',
      tooltip: 'Optionally includes matching sheath or holster component.',
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
      tooltip: 'Adds etched runes, serial numbers, or energy conduits.',
      options: [
        'Etched Luminous Runes',
        'Serial Numbers & Barcode',
        'Filigree Gold Inlay',
        'Energy Conduits',
        'Blood Groove & Notch Marks',
        'Circuit Traces',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip: 'Dominant body and blade colors that establish the item at a glance in a loot list.',
      options: [
        'Damascus Steel & Obsidian',
        'Polished Silver & Gold #F59E0B',
        'Titanium Grey & Black',
        'Deep Ruby Glass #EF4444',
        'Emerald Crystal #10B981 & Platinum',
        'Matte Black & Cyan #06B6D4',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip: 'High-contrast enchantment glow and energy colors that signal the item is magical or powered.',
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
      tooltip: 'Defines what the item is forged from and how light reads off it (metal, crystal, polymer).',
      options: [
        'Mithril & Dragon Scale',
        'Plasma Conduit & Polymer',
        'Enchanted Crystal & Platinum',
        'Valyrian Steel',
        'Obsidian Glass & Brass',
        'Carbon Fibre & Titanium',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Strict negative rules keeping hands, stands, and effect flourishes out of an isolated inventory icon.',
      options: [
        'No holding hand or character',
        'No pedestal or stand',
        'No magic smoke trails',
        'No floor shadow',
        'No text or stats box',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Attached Attachments',
      tooltip:
        'Requests extra detachable parts — scopes, ribbons, cells — isolated into their own sprite slots.',
      options: [
        'NONE',
        'Attachable Scope & Laser',
        'Elemental Effect Aura',
        'Tassel & Charm Ribbons',
        'Bayonet Blade Tip',
        'Secondary Energy Cell',
      ],
    },
  ],
};
