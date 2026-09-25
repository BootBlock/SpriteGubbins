import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import {
  ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
  HEX_CODE_PINS_THE_HUE,
  SUBJECT_TYPE_ADDS_NO_COMPONENTS,
} from '../guidanceSentences.ts';
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
        'What kind of icon this is. What it has to communicate decides how it is drawn: an inventory icon depicts an object, a status badge a condition, and a damage-type symbol is an abstract mark with no object behind it.\n\n' +
        SUBJECT_TYPE_ADDS_NO_COMPONENTS,
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
        'How valuable or how loud the icon should read. Rarity is the emphasis axis an icon set has, and stating it apart from the colours keeps a common tier from arriving as bright as the legendary beside it, a difference the player should catch without reading.',
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
        'How much of a life the depicted thing has had. It gives a tier ladder from one design, since the same blade drawn chipped, serviceable and pristine is three icons. Without it, the world pulls everything towards factory-new.',
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
        'What the player should understand from the icon. It governs the focal mark and the accent more than the object does: a healing potion and a poison flask are one bottle in two colours with two marks, which gets a whole set out of one design.',
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
        'The world the icons belong to. It aligns the objects, the marks and the trim across the whole set at once, so the icons read as one set.',
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
        'How much of its box each icon fills, and how much clear margin it keeps. Stating it for the whole set stops one icon arriving with twice the visual weight of the next, the failure that makes a generated grid look like four different packs.',
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
        'The outline the icon is recognised by with every internal detail removed. At icon size it is the whole identity, surviving at 32 px when trim, texture and shading are gone, so choose it before anything about the surface.',
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
        'The mark at the icon’s centre, and all that tells apart two icons sharing a silhouette.\n\n' +
        'It is a drawn motif, never a letter or a numeral. The prompt forbids text anywhere on the sheet, because the engine draws a count or a key name over the sprite at runtime.',
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
        'How the set is cut so the engine can build a variant. Choose by what the game changes at runtime: a standalone icon is replaced whole, where a state overlay or a tier mark is laid over an icon the set already has.\n\n' +
        'Every value names a cut this one sheet draws. A layered backing and a swappable motif are a different deliverable, and neither is on it.\n\n' +
        ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
      options: [
        'Single Standalone Icon',
        'Base Icon With State Overlays',
        'Base Icon In Rarity Tiers',
        'Matched Pair, Enabled And Disabled',
        'Set Of Four Tier Steps',
      ],
    },
    {
      key: 'clothing',
      label: 'Applied Overlay',
      tooltip:
        'The overlay the set is built around, whose weight, colour and margin the rest are matched to.\n\n' +
        'Every icon sheet draws the whole overlay library, so this steers how those pieces look, not which you get. That is why there is no “none”: the prompt would tell the generator the set has no overlays and still order thirteen of them.',
      options: [
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
        'How much detail the inside of the outline carries. Icons are read at a glance in a full grid, so restraint is usually right: every extra line costs contrast the silhouette and the accent need, and detail lost in downscaling shows only as noise.',
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
        'The dominant colours of the icon body, by which it is identified across a grid. Two colours with a clear value gap keep an icon readable against every plate the interface might put behind it.',
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
        'The one bright colour that carries the motif and the rarity glow: the smallest area on the icon and the first thing the eye finds. ' +
        HEX_CODE_PINS_THE_HUE,
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
        'What the depicted thing is made of and how light reads off it: polished metal takes a hard specular edge, cloth stays matte, glass shows the background through it. At icon size this often separates two objects of the same shape.',
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
        'Negative rules that keep the interface’s job off the icon sheet. Lettering matters most: the engine draws stack counts, cooldown timers and keybinds at runtime, so an icon with one baked in serves one quantity, in one language, on one keyboard.',
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
        'Further icons or overlays beyond those the sheet already lists, each isolated in its own sprite slot.\n\n' +
        'List them with commas and `×N` for how many of each: “Empty Slot Mark ×1, Tier Pip ×3” adds four components to the inventory and to the sheet’s stated count.',
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
