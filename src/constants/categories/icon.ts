import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Icon and symbol sets — the inventory marks, ability glyphs, status badges and map pins a game
 * reads at a glance.
 *
 * **It is not INTERFACE, and it is not ITEM.** INTERFACE draws the *chrome*: the plate an icon sits
 * in, the frame round it, the bar beside it — its own `Inventory Slot & Icon Plate` option is
 * exactly that plate and deliberately not what goes on it. ITEM draws the object as an object, in
 * the world, at whatever scale its parts call for. An icon is neither: it is a **mark** that has to
 * survive being drawn at 32 px in a grid of forty others, which is a different discipline from
 * drawing the thing it depicts. Every asset library that sells 2D art lists icons as a top-level
 * category beside GUI for the same reason.
 *
 * **The constraint that governs everything here is the cell.** Every icon in a set is drawn into the
 * same box, filled to the same margin, with the same weight of outline and the same light — because
 * a player picks one out of a grid by its silhouette long before they read what is inside it. That
 * is why `Silhouette Read` is the field this category cannot do without, and why `Cell Fill &
 * Padding` is stated as a rule for the whole set rather than per icon.
 *
 * **Lettering is banned here twice over**, and the second ban is this category's own. Section 0
 * forbids text anywhere on the sheet; an icon set has to be told again, because a stack count, a
 * cooldown number and a keybind letter are all things a real icon appears to carry — and every one
 * of them is drawn by the engine at runtime over the top of the sprite. An icon with `x99` painted
 * into it is an icon for one quantity.
 *
 * **The camera is left open, which is the one place this category is looser than INTERFACE.** A flat
 * front-on mark, a three-quarter potion bottle, an oblique chest and an isometric building pin are
 * all shipped icon styles, so the angle the depicted object is drawn at is a genuine art-direction
 * choice rather than a property of the deliverable. `categoryProjections.ts` therefore offers the
 * whole list, and only the facings are bound.
 */
export const ICON: CategoryDefinition = {
  label: 'Icon / Symbol Set',
  article: 'an',
  fields: [
    {
      key: 'species',
      label: 'Icon Family',
      tooltip:
        'What kind of icon this is. It decides the set’s shape before any styling does, because what an icon has to communicate fixes how it is built — an inventory icon depicts an object, a status badge depicts a condition, and a damage-type symbol is an abstract mark with no object behind it at all.',
      options: [
        'Inventory & Item Icon',
        'Ability & Spell Icon',
        'Status Effect Badge',
        'Currency & Resource Mark',
        'Map & Waypoint Marker',
        'Skill Tree Node',
        'Achievement & Medal',
        'Damage & Element Symbol',
        'Faction & Guild Emblem',
        'Input Prompt & Button Cap',
        'Quest & Objective Mark',
        'Cooking & Recipe Icon',
        'Mount & Companion Icon',
        'Seasonal & Event Badge',
      ],
    },
    {
      key: 'gender',
      label: 'Rarity Tier',
      tooltip:
        'How valuable or how loud the icon is meant to read. Rarity is the emphasis axis an icon set actually has, and stating it separately from the colours is what keeps a common tier from arriving as bright as the legendary beside it — the distinction the player is meant to catch without reading anything.',
      options: [
        'Common',
        'Uncommon',
        'Rare',
        'Epic',
        'Legendary',
        'Cursed & Corrupted',
        'Unidentified & Unknown',
        'Set & Matched Piece',
        'Unique & One Of A Kind',
        'Upgraded & Reforged',
      ],
    },
    {
      key: 'age',
      label: 'Condition & Finish',
      tooltip:
        'How much of a life the depicted thing has had. It is the cheapest way to get a tier ladder out of one design — the same blade drawn chipped, serviceable and pristine is three icons — and it is stated apart from the world, which otherwise pulls everything towards factory-new.',
      options: [
        'Pristine & Newly Made',
        'Serviceable & Lightly Used',
        'Chipped & Well Worn',
        'Rusted & Neglected',
        'Cracked & Failing',
        'Ancient & Excavated',
        'Enchanted & Unblemished',
        'Freshly Dropped & Glossy',
        'Sun-Faded & Bleached',
      ],
    },
    {
      key: 'role',
      label: 'What It Signals',
      tooltip:
        'What the player is meant to understand from it. This is what governs the focal mark and the accent more than the object does — a healing potion and a poison flask are the same bottle in two colours with two different marks, which is the cheapest way to get a whole set out of one design.',
      options: [
        'Restores & Heals',
        'Damages & Attacks',
        'Buffs & Empowers',
        'Debuffs & Hinders',
        'Protects & Shields',
        'Unlocks & Opens',
        'Crafts & Upgrades',
        'Counts A Resource',
        'Marks A Place',
        'Warns & Forbids',
        'Identifies A Faction',
        'Tracks Progress',
        'Grants Movement',
        'Summons An Ally',
      ],
    },
    {
      key: 'setting',
      label: 'World & Era',
      tooltip:
        'The world the icons belong to. It aligns the objects, the marks and the trim across the whole set at once — a rune and a circuit trace rarely share a grid without looking like two games bolted together.',
      options: [
        'High Fantasy',
        'Grim Dark Fantasy',
        'Medieval Historical',
        'Age Of Sail',
        'Victorian Gaslamp',
        'Wild West Frontier',
        'Modern Day',
        'Near-Future Cyberpunk',
        'Far-Future Space Opera',
        'Post-Apocalyptic Salvage',
        'Mythic Antiquity',
        'Cosy Storybook',
        'Feudal East Asia',
        'Mesoamerican Jungle',
        'Deep Ocean Voyage',
      ],
    },
    {
      key: 'build',
      label: 'Cell Fill & Padding',
      tooltip:
        'How much of its box each icon fills, and how much clear margin it keeps. Stating it for the whole set is what stops one icon arriving twice the visual weight of the next — the failure that makes a generated grid look like icons from four different packs.',
      options: [
        'Tightly Filling The Cell',
        'Standard Padded Margin',
        'Generously Padded Margin',
        'Small Centred Mark',
        'Filling A Wide Landscape Cell',
        'Filling A Tall Portrait Cell',
        'Off-Centre Weighted Composition',
        'Filling A Diamond Cell',
      ],
    },
    {
      key: 'silhouette',
      label: 'Silhouette Read',
      tooltip:
        'The outline the icon is recognised by with every internal detail removed. At icon size this is the whole identity — it is what survives at 32 px when the trim, the texture and the shading are long gone — so it is worth choosing before anything about the surface.',
      options: [
        'Bold Compact Blob',
        'Long Diagonal Sweep',
        'Upright Vertical Mass',
        'Wide Horizontal Mass',
        'Radial & Symmetrical',
        'Angular & Faceted',
        'Open & Skeletal Outline',
        'Rounded Organic Lobe',
        'Cluster Of Small Parts',
        'Interlocking Ring Pair',
        'Tapered Spearhead Wedge',
        'Nested Concentric Shells',
      ],
    },
    {
      key: 'face_head',
      label: 'Focal Motif',
      tooltip:
        'The mark at the icon’s centre, and the only thing distinguishing two icons that share a silhouette. A drawn motif, never a letter or a numeral: section 0 forbids text anywhere on the sheet, because a count or a key name is drawn by the engine at runtime over the top of the sprite.',
      options: [
        'No Motif — Plain Object',
        'Flame & Ember',
        'Droplet & Wave',
        'Bolt & Spark',
        'Leaf & Vine',
        'Skull & Hazard Mark',
        'Star & Burst',
        'Eye & Watching Sigil',
        'Gear & Cog',
        'Crescent & Orb',
        'Rune & Sigil Carving',
        'Chevron & Directional Wedge',
        'Feather & Quill',
        'Anvil & Hammer',
        'Key & Lock Ward',
        'Wave & Anchor',
        'Paw Print & Claw',
        'Hourglass & Sand',
      ],
    },
    {
      key: 'anatomy',
      label: 'Set Assembly Base',
      tooltip:
        'How the set is cut so the engine can build a variant. Choose by what the game needs to change at runtime — a shared plate with a swappable motif gives one drawing per new ability, where a standalone icon has to be redrawn whole every time.',
      options: [
        'Single Standalone Icon',
        'Base Icon With State Overlays',
        'Base Icon In Rarity Tiers',
        'Shared Backing With Swappable Motif',
        'Layered Motif Over Backing Shape',
        'Matched Pair, Enabled And Disabled',
        'Base Icon With Element Variants',
        'Icon Plus Its Dimmed Silhouette',
        'Set Of Four Tier Steps',
      ],
    },
    {
      key: 'clothing',
      label: 'Applied Overlay',
      tooltip:
        'What is laid over the finished icon as its own separate piece — a rarity glow, a lock, a cooldown veil, a new-item flare. Kept apart from the icon itself so the engine can draw it over any icon in the set, which is the whole reason to draw it separately.',
      options: [
        'No Overlay',
        'Rarity Glow & Aura',
        'Locked Padlock Mark',
        'Cooldown Dimming Veil',
        'New Item Flare & Sparkle',
        'Equipped Corner Tick',
        'Broken Crack Overlay',
        'Enchanted Shimmer',
        'Quantity Corner Plate',
        'Set Bonus Ring',
        'Cursed Shadow Bleed',
        'Seasonal Frost Rime',
      ],
    },
    {
      key: 'worn_details',
      label: 'Interior Detail',
      tooltip:
        'How much detail the inside of the outline carries. Icons are read at a glance in a full grid, so restraint is usually right — every extra line costs contrast that the silhouette and the accent need more, and detail that does not survive downscaling is detail that only shows up as noise.',
      options: [
        'Flat Fill, No Interior Detail',
        'Two-Tone Block Shading',
        'Single Rim Highlight',
        'Soft Painterly Modelling',
        'Hatched Line Shading',
        'Etched Engraved Lines',
        'Faceted Gem Cuts',
        'Dithered Two-Colour Shading',
        'Bold Outline & Flat Fill',
        'Woodcut Line Engraving',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant colours of the icon body — what it is identified by across a grid. Two colours with a clear value gap keep an icon readable against every plate the interface might put behind it.',
      options: [
        'Steel Grey & Cool Shadow',
        'Warm Leather Brown & Tan',
        'Aged Bronze & Verdigris',
        'Deep Oxblood #7F1D1D & Bone',
        'Slate #1E293B & Pale Ice',
        'Forest Green & Bark Brown',
        'Bleached Sand & Rust',
        'Matte Black & Bone White',
        'Fresh Herb Green & Clay',
        'Ocean Blue & Rope Cream',
        'Ember Red & Soot Black',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The one bright colour the motif and the rarity glow are carried in — the smallest area on the icon and the first thing the eye finds. A hex code pins it far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
      options: [
        'Health Red #EF4444',
        'Mana Blue #3B82F6',
        'Poison Green #4ADE80',
        'Arcane Violet #8B5CF6',
        'Legendary Gold #D4AF37',
        'Warning Amber #F59E0B',
        'Frost Cyan #22D3EE',
        'Void Magenta #E879F9',
        'Stamina Yellow #FACC15',
        'Shadow Indigo #4338CA',
        'Bleached Bone White',
      ],
    },
    {
      key: 'materials',
      label: 'Surface Materials',
      tooltip:
        'What the depicted thing is made of and how light reads off it: polished metal takes a hard specular edge, cloth stays matte, and glass carries the background through it. At icon size the material read is often what separates two objects of the same shape.',
      options: [
        'Forged Steel & Oiled Leather',
        'Carved Wood & Woven Cord',
        'Cut Gemstone & Filigree Gold',
        'Blown Glass & Cork',
        'Cast Iron & Riveted Plate',
        'Bone, Horn & Sinew',
        'Brushed Alloy & Backlit Panel',
        'Parchment, Wax & Ink',
        'Fired Clay & Straw Binding',
        'Lacquered Wood & Gold Leaf',
        'Rough Iron & Charcoal Soot',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping the interface’s job off the icon sheet. Lettering is the one that matters most: a stack count, a cooldown timer and a keybind are all drawn by the engine at runtime, so an icon with one baked in serves one quantity, in one language, on one keyboard.',
      options: [
        'No lettering, numerals, stack counts or keybinds',
        'No slot plate, frame or border behind the icon',
        'No drop shadow outside the icon’s own outline',
        'No hand, character or creature holding the object',
        'No background scene, tabletop or ground plane',
        'No tooltip, panel or interface chrome around it',
        'No motion lines or sparkle trail',
        'No perspective floor under the mark',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Extra Icons',
      tooltip:
        'Further icons or overlays beyond the ones the sheet already lists, each isolated into its own sprite slot. Comma-separated, with ×N for how many of each: “Empty Slot Mark ×1, Tier Pip ×3” adds four components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Empty Slot Mark ×1',
        'Tier Pip ×3',
        'Element Corner Badge ×4',
        'Set Completion Mark ×1',
        'Favourite Star ×1, Locked Mark ×1',
        'Stack Corner Plate ×1',
        'Upgrade Arrow ×1',
        'Seasonal Ribbon ×1',
      ],
    },
  ],
};
