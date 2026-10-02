import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import {
  ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
  HEX_CODE_PINS_THE_HUE,
  SUBJECT_TYPE_ADDS_NO_COMPONENTS,
} from '../guidanceSentences.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Icon sets — the action bars, bags, spellbooks, micro-menus and map pins a game reads at a glance.
 *
 * **It is not INTERFACE, and it is not ITEM.** INTERFACE draws the *chrome*: the plate an icon sits
 * in, the frame round it, the bar beside it — its own `Inventory Slot & Icon Plate` option is
 * exactly that plate and deliberately not what goes on it. ITEM draws the object as an object, in
 * the world, at whatever scale its parts call for. An icon is neither: it has to survive being drawn
 * at 32 px in a grid of forty others, which is a different discipline from drawing the thing it
 * depicts.
 *
 * **The icons are the reader's list, and these fields describe the set.** Which icons a sheet draws is
 * the roster (`SubjectDefinition.icons`), ticked from the catalogue in `constants/iconCatalogue/`, and
 * each is drawn as the look its world's family writes for it. So a field here can no longer say what
 * one icon *is* — a roster mixing a potion, a map pin and a settings cog has no single family, signal or
 * focal motif — and each is a rule the whole set follows instead: where it is shown, the smallest size
 * it must survive, how its subjects sit in their squares, and the discipline its outlines keep.
 *
 * **Lettering is banned here twice over**, and the second ban is this category's own. Section 0
 * forbids text anywhere on the sheet; an icon set has to be told again, because a stack count, a
 * cooldown number and a keybind letter are all things a real icon appears to carry — and every one
 * of them is drawn by the engine at runtime over the top of the sprite.
 *
 * **The camera is left open, which is the one place this category is looser than INTERFACE.** A flat
 * front-on mark, a three-quarter potion bottle and an isometric building pin are all shipped icon
 * styles, so the angle the depicted object is drawn at is a genuine art-direction choice rather than
 * a property of the deliverable. `categoryProjections.ts` therefore offers the whole list; the facings
 * are bound, and so is the canvas, which `categoryAspectRatios.ts` holds square for the four-by-four
 * grid.
 */
export const ICON: CategoryDefinition = {
  label: 'Icon / Symbol Set',
  article: 'an',
  // Sixteen icons, so a fresh set fills exactly one icon sheet: the restoratives, boosts and tools an
  // action bar carries, and the system panels a micro-menu opens.
  iconRoster: {
    look: 'ISOLATED_MARK',
    picks: [
      'heal-minor',
      'heal-major',
      'mana-minor',
      'stamina-restore',
      'cure-poison',
      'boost-strength',
      'food-bread-ration',
      'throw-frag-grenade',
      'tool-key-common',
      'currency-common-coin',
      'system-character',
      'system-bags',
      'system-abilities',
      'system-quest-log',
      'system-world-map',
      'system-settings',
    ],
  },
  fields: [
    {
      key: 'species',
      label: 'Where The Set Is Shown',
      tooltip:
        'Where the game shows these icons, which decides how hard each one has to work. An action bar icon is found mid-fight at a glance, a bag icon is told apart from the neighbours it sits among, and a map pin sits over busy terrain.\n\n' +
        SUBJECT_TYPE_ADDS_NO_COMPONENTS,
      options: [
        'Action Bar',
        'Bags & Inventory',
        'Spellbook & Ability List',
        'Buff & Debuff Row',
        'Unit Frame & Status Row',
        'System Button Bar',
        'World Map & Minimap',
        'Character Sheet',
        'Social Panels',
        'Vendor & Trade Windows',
        'Achievements & Collections',
      ],
    },
    {
      key: 'gender',
      label: 'Rarity Tier',
      tooltip:
        'How valuable or how loud the icons should read. Rarity is the emphasis axis an icon set has, and stating it apart from the colours keeps a common tier from arriving as bright as the legendary beside it, a difference the player should catch without reading.',
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
        'How much of a life the depicted things have had. It gives a tier ladder from one design, since the same blade drawn chipped, serviceable and pristine is three icons. Without it, the world pulls everything towards factory-new.',
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
        'Factory-Fresh Chrome',
        'Scuffed Street-Worn Kit',
        'Jury-Rigged & Patched',
        'Glitching & Flickering',
      ],
    },
    {
      key: 'role',
      label: 'Smallest Display Size',
      tooltip:
        'The smallest size the game draws these icons at. The sheet is drawn larger, so this is what every outline and accent has to survive: at 24 px only the silhouette and one bright colour are left, and any finer detail arrives as noise.',
      options: ['24 × 24 Pixels', '32 × 32 Pixels', '48 × 48 Pixels', '64 × 64 Pixels'],
    },
    {
      key: 'setting',
      label: 'World & Era',
      tooltip:
        'The world the icons belong to. It decides what every icon is drawn as, since each catalogue icon has a look written for each family of world, and it aligns the trim and the marks across the whole set.\n\n' +
        'A world you type that is not in this list draws each icon from its role, as that world would make it.',
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
      label: 'Subject Framing',
      tooltip:
        'How each icon’s subject sits in its square: how much of it the subject fills, and how much margin it keeps. Stating it once for the whole set stops one icon arriving with twice the visual weight of the next, the failure that makes a generated grid look like four different packs.',
      options: [
        'Tightly Filling The Square',
        'Standard Padded Margin',
        'Generously Padded Margin',
        'Small Centred Subject',
        'Diagonal, Corner To Corner',
        'Upright And Centred',
        'Off-Centre Weighted Composition',
        'Cropped Close On The Detail',
      ],
    },
    {
      key: 'silhouette',
      label: 'Silhouette Discipline',
      tooltip:
        'The rule every icon’s outline follows, so the set reads as one family while each member stays distinct. At the smallest display size the outline is all that is left of an icon, so choose this before anything about the surface.',
      options: [
        'One Bold Readable Shape Each',
        'Distinct Outline For Every Icon',
        'Shared Diagonal Thrust',
        'Compact Centred Masses',
        'Strong Negative Space',
        'Chunky Low-Detail Forms',
        'Fine Elegant Linework',
        'Upright Vertical Masses',
        'Radial & Symmetrical Forms',
      ],
    },
    {
      key: 'face_head',
      label: 'Motif Treatment',
      tooltip:
        'How each icon carries its one focal detail, the thing that tells apart two icons sharing a silhouette.\n\n' +
        'It is a drawn motif, never a letter or a numeral. The prompt forbids text anywhere on the sheet, because the engine draws a count or a key name over the sprite at runtime.',
      options: [
        'Plain Object, No Added Motif',
        'One Bright Focal Accent',
        'Emissive Core Glow',
        'Engraved Emblem On The Object',
        'Carved Rune & Sigil Accent',
        'Elemental Wisps Around The Subject',
        'Neon Edge Light',
        'Gem Inset At The Centre',
        'Holographic Accent Layer',
      ],
    },
    {
      key: 'anatomy',
      label: 'Set Assembly Base',
      tooltip:
        'How the set is cut so the engine can build every state. Each icon is drawn once, and the state and overlay pieces are drawn on a sheet of their own for the engine to lay over any icon.\n\n' +
        'There is one value because every set is cut this way. A layered backing and a swappable motif are a different deliverable, and neither is drawn.\n\n' +
        ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
      options: ['Icons With Engine-Applied Overlays'],
    },
    {
      key: 'clothing',
      label: 'Applied Overlay',
      tooltip:
        'The overlay the set is built around, whose weight, colour and margin the other overlay pieces are matched to.\n\n' +
        'The overlay sheet draws the whole overlay library, so this steers how those pieces look, not which you get. That is why there is no “none”: the prompt would tell the generator the set has no overlays and still order thirteen of them.',
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
        'Neon Scanline Flicker',
      ],
    },
    {
      key: 'worn_details',
      label: 'Interior Detail',
      tooltip:
        'How much detail the inside of each outline carries. Icons are read at a glance in a full grid, so restraint is usually right: every extra line costs contrast the silhouette and the accent need, and detail lost in downscaling shows only as noise.',
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
        'Neon Rim Lighting',
        'Circuit-Trace Panel Lines',
        'Scanline Hologram Shimmer',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant colours of the icons, by which the set is recognised across a grid. Two colours with a clear value gap keep an icon readable against every plate the interface might put behind it.',
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
        'Gunmetal #2B2F36 & Chrome',
        'Midnight Navy #0F172A & Neon Cyan',
        'Carbon Black & Hazard Yellow',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The one bright colour that carries the motif and the rarity glow: the smallest area on an icon and the first thing the eye finds. A colour an icon’s own entry names outranks it for that icon. ' +
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
        'Electric Cyan #00E5FF',
        'Hazard Orange #FF7A00',
        'Toxic Lime #A3E635',
      ],
    },
    {
      key: 'materials',
      label: 'Surface Materials',
      tooltip:
        'What the depicted things are made of and how light reads off them: polished metal takes a hard specular edge, cloth stays matte, glass shows the background through it. At icon size this often separates two objects of the same shape.',
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
        'Carbon Fibre & Neon Tubing',
        'Scratched Chrome & Rubber Grip',
        'Moulded Polymer & LED Strip',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules that keep the interface’s job off the icon sheets. Lettering matters most: the engine draws stack counts, cooldown timers and keybinds at runtime, so an icon with one baked in serves one quantity, in one language, on one keyboard.\n\n' +
        'A hand or a figure is excluded unless an icon’s own entry names one, so a wave emote keeps its hand.',
      options: [
        'No lettering, numerals, stack counts or keybinds',
        'No slot plate, frame or border behind the icon',
        'No drop shadow outside the icon’s own outline',
        'No hand or figure an icon’s entry does not name',
        'No background scene, tabletop or ground plane',
        'No tooltip, panel or interface chrome around it',
        'No motion lines or sparkle trail',
        'No perspective floor under the subject',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Extra Overlay Pieces',
      tooltip:
        'Further overlay pieces beyond those the overlay sheet already lists, each isolated in its own sprite slot on that sheet.\n\n' +
        'List them with commas and `×N` for how many of each: “Equipped Corner Tick ×1, Tier Pip ×3” adds four components to the overlay sheet and to its stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Equipped Corner Tick ×1',
        'Tier Pip ×3',
        'Element Corner Badge ×4',
        'Set Completion Pip ×1',
        'Favourite Star ×1',
        'Stack Corner Plate ×1',
        'Upgrade Arrow ×1',
        'Seasonal Ribbon ×1',
      ],
    },
  ],
};
