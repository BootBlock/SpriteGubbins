import { DEFAULT_ICON_COLOUR_MODE } from '../iconCatalogue/defaultIconColourMode.ts';
import { DEFAULT_ICON_LOOK } from '../iconCatalogue/defaultIconLook.ts';
import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { ICONS_PER_SHEET } from '../iconCatalogue/iconSheetLimits.ts';
import {
  ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
  HEX_CODE_PINS_THE_HUE,
  SUBJECT_TYPE_ADDS_NO_COMPONENTS,
} from '../guidanceSentences.ts';
import type { CategoryDefinition } from '../../types/subject.ts';
import { cataloguePicks } from '../iconCatalogue/cataloguePicks.ts';

/**
 * Icon sets — the action bars, bags, spellbooks, micro-menus and map pins a game reads at a glance.
 *
 * **It is not INTERFACE, and it is not ITEM.** INTERFACE draws the *chrome*: the plate an icon sits
 * in, the frame round it, the bar beside it — its own `Inventory Slot & Icon Plate` option is
 * exactly that plate and deliberately not what goes on it. ITEM draws the object as an object, in
 * the world, at whatever scale its parts call for. An icon is neither: it has to survive being shown
 * at its smallest display size in a grid of forty others, whether it is a square painted edge to edge
 * or a mark alone, which is a different discipline from drawing the thing it depicts.
 *
 * **The icons are the reader's list, and these fields describe the set.** Which icons a sheet draws is
 * the roster (`SubjectDefinition.icons`), ticked from the catalogue in `constants/iconCatalogue/` or
 * written by the reader, and each is drawn as the look its world's family writes for it, or as the
 * reader's own look. So a field here can no longer say what
 * one icon *is* — a roster mixing a potion, a map pin and a settings cog has no single family, signal or
 * focal motif — and each is a rule the whole set follows instead: where it is shown, the smallest size
 * it must survive, how its subjects sit in their squares, and the discipline its outlines keep.
 *
 * **Every option holds under both looks** (`IconRoster.look`). A full-bleed square paints its backdrop
 * behind the subject, so *Subject Framing* places the subject inside its square and the backdrop fills
 * the rest; the sheet's own prose says so. That is why no option crops the subject, weights it off
 * centre or sets wisps loose round it (audit finding O7): a mark alone has no square to crop it, sits
 * where the interface puts its cell, and comes back with each wisp cut out as a sprite of its own.
 *
 * **Each field states one concern, and only this field states it** (audit findings O4 and O11).
 * *Subject Framing* says which way a subject stands and *Silhouette Discipline* only the outline's rule;
 * *Interior Detail* names the lines inside a form and never the outline or the light, which the outline
 * system and the lighting model state; and a neon or hologram value sits in the one field it describes.
 *
 * **Lettering is banned here twice over**, and the second ban is this category's own. Section 0
 * forbids text anywhere on the sheet; an icon set has to be told again, because a stack count, a
 * cooldown number and a keybind letter are all things a real icon appears to carry — and every one
 * of them is drawn by the engine at runtime over the top of the sprite. That ban, and the others the
 * category's own exclusion line states, are why *Explicit Exclusions* offers none of them (audit
 * finding O6): its pool holds the rules a game adds, which no sheet states unless the reader asks. No
 * option names an object that brings letterforms with it (`LETTERING_OBJECTS`, audit finding O13).
 *
 * **Every light colour names its hex** (audit finding O2), because a word cannot be measured against a
 * key: `iconSetKeys.test.ts` reads each one and holds it out of the full-bleed key's reach.
 *
 * ***Overlay Style* is how the overlay library is drawn, never a piece of it** (audit finding O1). The
 * overlay sheets draw one fixed library, so a value naming a piece the library lacks promised a piece
 * nobody drew; the pieces a game adds are *Extra Overlay Pieces*, and each piece is offered once.
 *
 * **The camera is left open, which is the one place this category is looser than INTERFACE.** A flat
 * front-on mark, a three-quarter potion bottle and an isometric building pin are all shipped icon
 * styles, so the angle the depicted object is drawn at is a genuine art-direction choice rather than
 * a property of the deliverable. `categoryProjections.ts` therefore offers the whole list; the facings
 * are bound, and so is the canvas, which `categoryAspectRatios.ts` holds square for the four-by-four
 * grid. **The camera is shared and the yaw is not**: an icon sheet declares `OWN_POSE`, so the prompt
 * states one projection, elevation, light and scale for the set and poses each subject as its entry and
 * *Subject Framing* say — upright, turned or corner to corner — rather than holding every icon at one
 * object yaw. A full-bleed square lies flat on screen whatever the camera, which governs only the
 * subject inside it, and the overlay sheet declares `PICTURE_PLANE`: its pieces are flat shapes under no
 * camera at all, so a square ring never comes back an isometric diamond.
 */
export const ICON: CategoryDefinition = {
  label: 'Icon / Symbol Set',
  article: 'an',
  // Sixteen icons, so a fresh set fills exactly one icon sheet: the restoratives, boosts and tools an
  // action bar carries, and the system panels a micro-menu opens. Drawn as full-bleed squares, the look
  // of the action bar the catalogue was built for — see `DEFAULT_ICON_LOOK`. Declared in shelving
  // order, as every roster is kept (`iconRosterShelving.test.ts`).
  iconRoster: {
    look: DEFAULT_ICON_LOOK,
    colourMode: DEFAULT_ICON_COLOUR_MODE,
    picks: cataloguePicks([
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
      'system-settings',
      'system-character',
      'system-bags',
      'system-abilities',
      'system-quest-log',
      'system-world-map',
    ]),
  },
  fields: [
    {
      key: 'species',
      label: 'Where The Set Is Shown',
      tooltip:
        'Where the game shows these icons, which decides how hard each one has to work. An action bar icon is found mid-fight at a glance, a bag icon is told apart from the neighbours it sits among, and a map pin or a HUD marker sits over a moving scene.\n\n' +
        SUBJECT_TYPE_ADDS_NO_COMPONENTS,
      options: [
        'Action Bar',
        'Bags & Inventory',
        'Spellbook & Ability List',
        'Buff & Debuff Row',
        'Unit Frame & Status Row',
        'Party & Squad Frames',
        'System Button Bar',
        'World Map & Minimap',
        'HUD & Compass',
        'Ping & Emote Wheel',
        'Killfeed & Scoreboard',
        'Quickhack Bar',
        'Cyberware Slots',
        'Lobby & Loadout',
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
        'How loud the whole set reads, from a plain common set to a rich, bright legendary one. One value holds for every icon on the set.\n\n' +
        'A set that mixes tiers takes `Neutral, Tier Shown By Overlay Marks`: every icon is drawn at one even emphasis, and the tier marks the overlay sheet draws tell the tiers apart in your game.',
      options: ['Neutral, Tier Shown By Overlay Marks', 'Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'],
    },
    {
      key: 'age',
      label: 'Condition & Finish',
      tooltip:
        'How much of a life the depicted things have had. Without it, the world pulls everything towards factory-new.\n\n' +
        'Every value is drawn as a still: `Glitch-Sliced & Offset` cuts each subject into horizontal slices nudged sideways, never a flicker or a blur.',
      options: [
        'Pristine & Newly Made',
        'Serviceable & Lightly Used',
        'Chipped & Well Worn',
        'Scuffed Street-Worn Kit',
        'Jury-Rigged & Patched',
        'Rusted & Neglected',
        'Cracked & Failing',
        'Sun-Faded & Bleached',
        'Ancient & Excavated',
        'Glitch-Sliced & Offset',
      ],
    },
    {
      key: 'role',
      label: 'Smallest Display Size',
      tooltip:
        'The smallest size the game draws these icons at. The sheet is drawn larger, so this is what every outline and accent has to survive: at 16 or 20 px, the size of a HUD marker, only the silhouette is left, and any finer detail arrives as noise.\n\n' +
        'The prompt states how far each icon is reduced to reach this size, and the narrowest stroke, gap and outline that survive it. A size you type, such as `28 × 28 Pixels` or `28 px`, is read the same way; a value with no size in it states no reduction.',
      options: [
        '16 × 16 Pixels',
        '20 × 20 Pixels',
        '24 × 24 Pixels',
        '32 × 32 Pixels',
        '48 × 48 Pixels',
        '64 × 64 Pixels',
      ],
      // Section 2 states the reduction from the drawn size to this one (audit finding P6).
      rendering: 'DISPLAY_SIZE',
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
        'How each icon’s subject sits in its square: how much of it the subject fills, the margin it keeps, and whether it stands upright or lies corner to corner. Stating it once stops one icon arriving with twice the visual weight of the next, which makes a grid look like four different packs.\n\n' +
        'On a full-bleed set the margin is backdrop, so the square stays painted to its edge whatever you choose.',
      options: [
        'Tightly Filling The Square',
        'Standard Padded Margin',
        'Generously Padded Margin',
        'Small Centred Subject',
        'Diagonal, Corner To Corner',
        'Upright And Centred',
      ],
    },
    {
      key: 'silhouette',
      label: 'Silhouette Discipline',
      tooltip:
        'The rule every icon’s outline follows, so the set reads as one family while each member stays distinct. At the smallest display size the outline is all that is left of an icon, so choose this before anything about the surface.\n\n' +
        '`Told Apart By Shape, Never By Colour` keeps every icon readable to a colour-blind player and under a tint your engine lays over it. Which way a subject stands is set by _Subject Framing_.',
      options: [
        'One Bold Readable Shape Each',
        'Distinct Outline For Every Icon',
        'Told Apart By Shape, Never By Colour',
        'Compact Rounded Masses',
        'Strong Negative Space',
        'Chunky Low-Detail Forms',
        'Fine Elegant Linework',
        'Radial & Symmetrical Forms',
      ],
    },
    {
      key: 'face_head',
      label: 'Motif Treatment',
      tooltip:
        'How each icon carries its one focal detail, the thing that tells apart two icons sharing a silhouette. The motif stays inside the subject’s own silhouette.\n\n' +
        'It is a drawn motif, never a letter or a numeral. The prompt forbids text anywhere on the sheet, because the engine draws a count or a key name over the sprite at runtime.',
      options: [
        'Plain Object, No Added Motif',
        'One Bright Focal Accent',
        'Emissive Core Glow',
        'Engraved Emblem On The Object',
        'Carved Knotwork Inlay',
        'Gem Inset At The Centre',
        'Holographic Accent Layer',
      ],
    },
    {
      key: 'anatomy',
      label: 'Set Assembly Base',
      tooltip:
        'How the set is cut so the engine can build every state. Each icon is drawn once, and the state and overlay pieces are drawn on overlay sheets of their own for the engine to lay over any icon.\n\n' +
        'There is one value because every set is cut this way. A layered backing and a swappable motif are a different deliverable, and neither is drawn.\n\n' +
        ASSEMBLY_BASE_ADDS_NO_COMPONENTS,
      options: ['Icons With Engine-Applied Overlays'],
    },
    {
      key: 'clothing',
      label: 'Overlay Style',
      tooltip:
        'The style the overlay sheets draw every piece in: the disabled veil, the highlight and selection rings, the cooldown sweep, the tier marks, the rest of the library and any **Extra Overlay Pieces**. It sets their line, finish and edge, never which pieces you get, and no icon is drawn in it.\n\n' +
        'Each piece is drawn opaque with hard edges, and your engine applies its transparency. A piece the library does not draw, such as an equipped tick, goes in **Extra Overlay Pieces**.',
      options: [
        'Clean Flat Shapes',
        'Bold Outlined Shapes',
        'Stepped Glow Bands',
        'Filigree Scrollwork Trim',
        'Arcane Shimmer Facets',
        'Writhing Tendril Edges',
        'Faceted Crystal Shards',
        'Neon Tube Strokes',
      ],
    },
    {
      key: 'worn_details',
      label: 'Interior Detail',
      tooltip:
        'Which lines the inside of each outline carries. Icons are read at a glance in a full grid, so restraint is usually right: every extra line costs contrast the silhouette and the accent need, and detail lost in downscaling shows only as noise. The outline system and the lighting model state the outline and the light.\n\n' +
        'The prompt’s surface-detail level defers to it inside each icon. On a pixel-art sheet, `Hatched Line Shading` and `Etched Engraved Lines` are drawn as deliberate pixel lines rather than banned as microtexture.',
      options: [
        'Flat Fill, No Interior Detail',
        'One Or Two Defining Lines',
        'Panel & Seam Lines',
        'Stitched Seams & Grain',
        'Faceted Gem Cuts',
        'Circuit-Trace Panel Lines',
        'Hatched Line Shading',
        'Etched Engraved Lines',
      ],
      // Section 2's surface-detail level defers to it, and a line technique it names is excepted from the
      // pixel discipline's microtexture ban (audit finding P11).
      rendering: 'INTERIOR_DETAIL',
      lineTechniques: ['Hatched Line Shading', 'Etched Engraved Lines'],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant colours of the icons, by which the set is recognised across a grid. Two colours with a clear value gap keep an icon readable against whatever sits behind its subject: the plate the interface puts there, or the square’s own backdrop.\n\n' +
        'None of these sits close enough to white for a white background key to cut it out.',
      options: [
        'Steel Grey & Cool Shadow',
        'Warm Leather Brown & Tan',
        'Aged Bronze & Verdigris',
        'Deep Oxblood #7F1D1D & Bone #D9D4C7',
        'Slate #1E293B & Pale Ice #BFD7E6',
        'Forest Green & Bark Brown',
        'Bleached Sand #D9C9A3 & Rust',
        'Matte Black & Bone #D9D4C7',
        'Fresh Herb Green & Clay',
        'Ocean Blue & Rope Cream #DCD3BF',
        'Ember Red & Soot Black',
        'Gunmetal #2B2F36 & Brushed Steel #A8B0BA',
        'Midnight Navy #0F172A & Neon Cyan',
        'Carbon Black & Hazard Yellow',
        'Asphalt Grey #374151 & Signal Teal #14B8A6',
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
        'Neon Rose #FB7185',
        'Stamina Yellow #FACC15',
        'Shadow Indigo #4338CA',
        'Bleached Bone #CFC6B0',
        'Electric Cyan #00E5FF',
        'Signal Teal #14B8A6',
        'Hazard Orange #FF7A00',
        'Toxic Lime #A3E635',
      ],
    },
    {
      key: 'materials',
      label: 'Surface Materials',
      tooltip:
        'What the depicted things are made of and how light reads off them: polished metal takes a hard specular edge, cloth stays matte, glass shows what is behind it. At icon size this often separates two objects of the same shape.\n\n' +
        '`Pure Emissive Light, No Material` draws each subject as light alone, as a HUD glyph or a hologram is, with no surface for a material to show.',
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
        'Moulded Polymer & Light Strip',
        'Pure Emissive Light, No Material',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'A rule every icon keeps beyond those the prompt already states. Every icon sheet already bans lettering, a slot plate or frame, a scene behind the subject, a hand or figure an icon’s entry does not name, and any shadow outside the icon, so this list offers none of them.\n\n' +
        '`No baked team or faction colour` suits a set your engine tints, and `No two icons told apart by hue alone` keeps the set readable to a colour-blind player.',
      options: [
        'No real-world logo, brand or trademark',
        'No real-world flag or insignia',
        'No gore, blood or open wound',
        'No baked team or faction colour',
        'No two icons told apart by hue alone',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Extra Overlay Pieces',
      tooltip:
        'Further overlay pieces beyond the library the overlay sheets already draw, each in a cell and sprite slot of its own and drawn in the **Overlay Style**.\n\n' +
        `List them with commas and \`×N\` for how many of each: “Equipped Corner Tick ×1, Above & Below Height Arrows ×2” adds three components. An overlay sheet holds ${String(ICONS_PER_SHEET)} pieces, so pieces past the cells the library leaves add overlay sheets to the series, and the note under this field says when they do.`,
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Equipped Corner Tick ×1',
        'Quantity Corner Plate ×1',
        'Set Bonus Ring ×1',
        'Element Corner Badge ×4',
        'Favourite Star ×1',
        'Upgrade Arrow ×1',
        'Seasonal Ribbon ×1',
        'Edge-Of-View Pointer ×1',
        'Above & Below Height Arrows ×2',
        'Ping Acknowledged Tick ×1',
        'Hostile Chevron ×1',
      ],
    },
  ],
};
