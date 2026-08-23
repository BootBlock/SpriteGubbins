import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import type { CategoryDefinition } from '../../types/subject.ts';

/**
 * Bitmap fonts and glyph sets — the sheet of characters an engine renders text from.
 *
 * **It is the one category whose components are lettering**, and that is a change to the prompt
 * contract rather than another entry in a table. Section 0, section 8 and section 9 each ban text on
 * the sheet, and every one of those bans was written as a global rule; a glyph set requires in
 * section 4 exactly what they forbid, which is the §4-requires/§8-forbids contradiction the
 * per-category records exist to remove. `LETTERING_IS_A_COMPONENT` in `promptText/exclusions.ts` is
 * what makes the three bans conditional, and this is the only category that answers `true`.
 *
 * **What the ban still covers here is worth stating, because it is most of it.** A watermark, a
 * signature, a caption naming a component, a legend, an arrow and a grid line are annotation on a
 * font sheet exactly as they are on every other sheet — the exemption is for the *inventory's own
 * entries*, which are single characters drawn as isolated components, and for nothing else. A font
 * sheet that comes back with `ABCDEF` set as a word has failed the contract, not satisfied it: the
 * components have been merged, which is the same failure as a torso arriving with its arms attached.
 *
 * **The constraint that governs everything here is the cell, as it is for ICON — but a font's cell
 * has a *baseline*.** Every glyph in a set sits on one baseline, holds one cap height, one x-height
 * and one stroke weight, because text is read as a run and a single letter that sits 2 px high or 1
 * px heavy is visible in every word the engine ever draws with it. That is why `Vertical Metrics` is
 * the field this category cannot do without, and why `Stroke Construction` is stated for the whole
 * set rather than per glyph.
 *
 * **The `build` pool states heights and never contents, and that is a constraint rather than a
 * preference.** The sheet series is a function of the category alone — four sheets covering printable
 * ASCII, whatever section 1 says — so an option claiming the set holds no lower case would put
 * section 1 in contradiction with the twenty-six letters section 4 requires on sheet two, which is
 * the §1-states/§4-requires failure the per-category records exist to remove. A first draft offered
 * `Caps Only, One Height` and did exactly that; `Unicase, One Height Throughout` is the metric that
 * option was reaching for, and it is compatible with every sheet. **A new `Vertical Metrics` option
 * has to pass the same test**: it may fix a height, and it may not say which characters exist.
 *
 * **The camera is fixed and the facings are fixed, and both for the same reason.** A glyph is a flat
 * mark with no far side: `categoryProjections.ts` pins `ORTHOGRAPHIC_FRONT` and
 * `categoryDirectionSets.ts` pins `SINGLE_FRONT`, because turning a letter to three quarters returns
 * a drawing no engine can render text from. This is the one place it is *tighter* than ICON, which
 * leaves the camera open because an icon depicts an object that has an angle.
 *
 * **Whether a target can deliver a usable set is a separate question, and it is not gated here.**
 * Diffusion targets render glyphs unreliably and the autoregressive ones do better, but that is a
 * claim about output nobody in this repository has measured against all eleven — so the category is
 * offered to every target and the risk is stated in `Font Family`’s own guidance, where a reader
 * choosing the category will read it. A capability gate written on an assumption would hide the
 * category from targets that can do it and vouch for ones that cannot.
 */
export const FONT: CategoryDefinition = {
  label: 'Bitmap Font / Glyph Set',
  article: 'a',
  fields: [
    {
      key: 'species',
      label: 'Font Family',
      tooltip:
        'What kind of typeface this is. It fixes the whole set’s construction before any styling does, because what a font has to do decides how its letters are built — a display face carries weight a body face cannot afford, and a pixel face is drawn on a grid rather than described by curves. Be aware that image generators render lettering unreliably: the targets that reason over a prompt do better than the diffusion ones, and any set is worth checking glyph by glyph before it reaches an engine.',
      options: [
        'Blocky Display Face',
        'Narrow Condensed Face',
        'Rounded Soft Face',
        'Square Grid Pixel Face',
        'Serif Storybook Face',
        'Slab Serif Signage Face',
        'Hand Lettered Brush Face',
        'Angular Runic Face',
        'Stencil & Military Face',
        'Terminal & Monospace Face',
        'Gothic Blackletter Face',
        'Numeric & Damage Face',
        'Geometric Sans Face',
        'Humanist Sans Face',
        'Typewriter & Mechanical Face',
        'Comic & Speech Balloon Face',
        'Art Deco Display Face',
      ],
    },
    {
      key: 'gender',
      label: 'Weight',
      tooltip:
        'How heavy the strokes are across the whole set. It is stated once for every glyph because weight is what a run of text is read by — a set whose letters disagree about it reads as two fonts mixed in one word, which is the failure this sheet has most often.',
      options: [
        'Light',
        'Regular',
        'Medium',
        'Semi Bold',
        'Bold',
        'Extra Bold',
        'Heavy Poster Weight',
        'Hairline Outline Only',
      ],
    },
    {
      key: 'age',
      label: 'Wear & Finish',
      tooltip:
        'How much of a life the lettering has had. It is the cheapest way to place a font in a world without changing its construction — the same skeleton drawn clean, chipped and eaten away is three fonts — and it is stated apart from the world, which otherwise pulls everything towards freshly printed.',
      options: [
        'Clean & Newly Cut',
        'Lightly Inked & Even',
        'Chipped & Worn Edges',
        'Rough Stamped & Uneven',
        'Corroded & Eaten Away',
        'Ancient & Weathered Carving',
        'Glowing & Unblemished',
        'Screen-Printed & Slightly Bled',
        'Photocopied & Degraded',
        'Freshly Painted & Glossy',
      ],
    },
    {
      key: 'role',
      label: 'What It Is For',
      tooltip:
        'Where in the game the text is drawn. It governs the metrics more than the styling does — a dialogue face is read in long runs and wants even colour, where a damage face is read at a glance in ones and twos and wants weight.',
      options: [
        'Interface Labels & Buttons',
        'Dialogue & Narration',
        'Headings & Title Cards',
        'Damage & Score Numerals',
        'Menu & Option Lists',
        'Subtitles & Captions',
        'Signage Drawn In The World',
        'Credits & Long Body Text',
        'Tutorial & Hint Text',
        'Item & Ability Names',
        'Logo & Wordmark Lettering',
        'Chat & Player Names',
      ],
    },
    {
      key: 'setting',
      label: 'World & Era',
      tooltip:
        'The world the lettering belongs to. It aligns the construction, the finish and the trim across every glyph at once — a carved rune and a backlit terminal glyph rarely share a baseline without looking like two games bolted together.',
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
        'Mesoamerican Antiquity',
        'Retro 80s Arcade',
        'Nordic Rune Age',
      ],
    },
    {
      key: 'build',
      label: 'Vertical Metrics',
      tooltip:
        'Where the glyphs sit against each other — the baseline they all stand on, and how far the capitals rise above the lower-case letters. Stating it for the whole set is what stops one glyph arriving a pixel taller than the next, which is invisible on the sheet and visible in every word the engine draws. It decides the heights, never which characters the set holds: the sheets always cover printable ASCII, so a value here that withheld the lower case would be asking for a sheet the inventory still lists.',
      options: [
        'Unicase, One Height Throughout',
        'Short X-Height, Tall Caps',
        'Tall X-Height, Short Caps',
        'Equal Caps And Ascenders',
        'Deep Descenders Below Baseline',
        'No Descenders, Flat Baseline',
        'Small Caps Throughout',
        'Very Tall Ascenders, Short Body',
        'Uniform Cap Height, No Overshoot',
      ],
    },
    {
      key: 'silhouette',
      label: 'Stroke Construction',
      tooltip:
        'How each letter’s skeleton is built, with every surface treatment removed. At the size a game renders text this is the whole identity — it is what survives when the fill, the outline and the texture are gone — so it is worth choosing before anything about the surface.',
      options: [
        'Straight Segments, Sharp Corners',
        'Straight Segments, Cut Corners',
        'Circular Bowls, Straight Stems',
        'Uniform Stroke Throughout',
        'Thick Stems, Thin Crossbars',
        'Brush Stroke With Varying Width',
        'Broken & Segmented Strokes',
        'Open Counters, No Closed Bowls',
        'Geometric Circles & Straight Lines',
        'Flared Stems With Waisted Middles',
        'Split Strokes With A Central Gap',
        'Overlapping Strokes At The Joints',
      ],
    },
    {
      key: 'face_head',
      label: 'Terminal Treatment',
      tooltip:
        'How each stroke ends — the detail at the tip of every stem and arm, and the thing two fonts sharing a skeleton are told apart by. It is the smallest decision on the sheet and the one repeated most, because every glyph carries several of them.',
      options: [
        'Flat Cut Terminals',
        'Rounded Terminals',
        'Angled Cut Terminals',
        'Bracketed Serif Terminals',
        'Slab Serif Terminals',
        'Flared & Splayed Terminals',
        'Tapered To A Point',
        'Notched & Chiselled Terminals',
        'Ball Terminals',
        'Wedge Terminals',
        'Hooked & Curled Terminals',
        'Squared Pixel Step Terminals',
      ],
    },
    {
      key: 'anatomy',
      label: 'Set Assembly Base',
      tooltip:
        'How the sheet is cut so an engine can lay the glyphs out. Choose by how the game measures text — a fixed cell lets a renderer index straight into the sheet by codepoint, where a proportional set needs a width recorded per glyph and reads far better in long runs.',
      options: [
        'Fixed Cell, One Width For All',
        'Proportional, Width Per Glyph',
        'Fixed Cell With Wide Numerals',
        'Two Cell Widths, Narrow And Wide',
        'Single Row Strip, One Height',
        'Base Glyph With Accent Marks Apart',
        'Numerals And Punctuation Strip Apart',
      ],
    },
    {
      key: 'clothing',
      label: 'Applied Treatment',
      tooltip:
        'What is drawn over each finished glyph as part of the same component — an outline, an inner bevel, a glow. It goes into the glyph rather than arriving as a separate piece, because an engine renders one sprite per character and has nothing to lay a second pass over.',
      options: [
        'No Treatment',
        'Hard Outline Around Each Glyph',
        'Double Outline, Inner And Outer',
        'Inner Bevel & Highlight',
        'Emissive Glow Within The Silhouette',
        'Etched Inline Down The Stems',
        'Speckled Grain Across The Fill',
        'Hard Extruded Side Face',
        'Chromatic Split Fringe',
        'Rough Stencil Bridges',
      ],
    },
    {
      key: 'worn_details',
      label: 'Interior Detail',
      tooltip:
        'How much detail the inside of each stroke carries. Text is read as a run rather than as a picture, so restraint is usually right — every extra line inside a stem costs contrast that the letterform itself needs more, and detail that does not survive being drawn at 8 px only shows up as noise.',
      options: [
        'Flat Fill, No Interior Detail',
        'Two-Tone Block Shading',
        'Single Rim Highlight',
        'Vertical Gradient Down The Stroke',
        'Hatched Line Shading',
        'Etched Engraved Channels',
        'Scanline Banding Across The Fill',
        'Dot Screen Halftone Fill',
        'Split Two-Tone Diagonal Fill',
        'Outlined Hollow Counter',
      ],
    },
    {
      key: 'primary_colours',
      label: 'Primary Colours',
      tooltip:
        'The dominant colours of the letterforms themselves — what the text is read as. Two colours with a clear value gap keep a glyph legible against every panel the interface might put behind it.',
      options: [
        'Bone White & Cool Shadow',
        'Parchment Cream & Sepia',
        'Matte Black & Bone White',
        'Steel Grey & Cool Shadow',
        'Aged Bronze & Verdigris',
        'Deep Oxblood #7F1D1D & Bone',
        'Slate #1E293B & Pale Ice',
        'Terminal Green #4ADE80 & Black',
        'Ink Blue & Pale Paper',
        'Warm Cream & Chocolate Brown',
        'Neon White & Deep Magenta',
      ],
    },
    {
      key: 'accent_colours',
      label: 'Accent Colours',
      tooltip:
        'The one bright colour the outline, the inline or the glow is carried in — the smallest area on each glyph and the thing that separates this set from a plain one. A hex code pins it far more tightly than a name does, and the swatch beside this field previews whatever it recognises.',
      options: [
        'Legendary Gold #D4AF37',
        'Warning Amber #F59E0B',
        'Health Red #EF4444',
        'Mana Blue #3B82F6',
        'Arcane Violet #8B5CF6',
        'Frost Cyan #22D3EE',
        'Poison Green #4ADE80',
        'Void Magenta #E879F9',
        'Critical Orange #F97316',
        'Rare Blue #60A5FA',
        'Experience Lime #84CC16',
      ],
    },
    {
      key: 'materials',
      label: 'Surface Materials',
      tooltip:
        'What the lettering appears to be made of and how light reads off it: cut metal takes a hard specular edge, painted board stays matte, and a backlit panel carries its light from within. At text size the material read is often all that separates two sets sharing a skeleton.',
      options: [
        'Ink On Parchment',
        'Painted Board & Flaking Varnish',
        'Cut Steel & Polished Edge',
        'Carved Stone & Chisel Marks',
        'Cast Bronze & Patina',
        'Backlit Panel & Diffused Glow',
        'Chalk & Rough Slate',
        'Woven Thread & Cloth',
        'Screen-Printed Ink On Card',
        'Neon Tube & Glass',
        'Embroidered Thread On Felt',
        'Chiselled Marble & Gilt',
      ],
    },
    {
      key: 'exclusions',
      label: 'Explicit Exclusions',
      tooltip:
        'Negative rules keeping everything but the glyphs off the sheet. The first is the one that matters most: the components are single characters drawn apart, so any two of them set side by side as a word is two entries merged rather than a sheet that reads nicely.',
      options: [
        'No word, phrase or specimen line set from the glyphs',
        'No frame, plate or panel behind a glyph',
        'No drop shadow outside a glyph’s own outline',
        'No decorative flourish, swash or ornament',
        'No hand, quill or brush drawing the letters',
        'No background scene, page or paper texture',
        'No caption, key or label naming a glyph',
        'No alternate or swash glyph variants',
        'No baseline, grid or metric guides',
        'No colour fill varying between glyphs',
      ],
    },
    {
      key: 'additional_anatomy',
      label: 'Extra Glyphs',
      tooltip:
        'Further characters beyond the ones the sheet already lists, each isolated into its own sprite slot. Comma-separated, with ×N for how many of each: “Currency Mark ×3, Arrow Glyph ×4” adds seven components to the inventory and to the sheet’s stated count.',
      options: [
        NO_ADDITIONAL_ANATOMY,
        'Currency Mark ×3',
        'Arrow Glyph ×4',
        'Accented Vowel ×5',
        'Suit & Pip Mark ×4',
        'Fraction Numeral ×3, Degree Mark ×1',
        'Punctuation Mark ×6',
        'Bracket Pair ×4',
        'Diacritic Mark ×3',
      ],
    },
  ],
};
