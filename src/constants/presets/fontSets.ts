import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Bitmap fonts — the four glyph sets a game is actually asked for.
 *
 * **The camera and the facings are the same in all four, and that is the honest answer rather than a
 * missing axis.** `categoryProjections.ts` pins `ORTHOGRAPHIC_FRONT` and `categoryDirectionSets.ts`
 * pins `SINGLE_FRONT`, because a glyph an engine can render text from is a glyph drawn face on. So
 * what these four vary instead is the thing a font sheet is actually decided by: the construction,
 * the metrics and the surface.
 *
 * **Every one of them names an autoregressive target**, and that is a recommendation this library
 * makes rather than a rule the app enforces. Lettering is the deliverable image generators get wrong
 * most often, and a set with three malformed glyphs has to be redrawn by hand — so the archetypes
 * lead with the targets most likely to return something usable, while the category itself stays
 * available on all eleven. `categories/font.ts` says the same thing to the reader, under
 * `Font Family`, which is where somebody choosing this category will read it.
 *
 * **Autoregressive is not `deliberates`, and the two are easy to conflate here.** Three of the four
 * targets named below do carry that flag, but `GPT_IMAGE` does not — `constants/models.ts` has it
 * returning images only, so it gets no self-audit and no component map. What these four have in
 * common is how they *draw*, which is a claim about glyph fidelity and not about whether the target
 * can work through a specification. Nothing in the app gates on it, which is why it is a library
 * recommendation rather than a capability.
 *
 * **The first two pin the exclusion no other category needs.** The components of this sheet are
 * characters, so the failure is not that lettering appeared but that it was *set*: two glyphs drawn
 * side by side as a word are two entries merged, which mis-maps every component after them. The other
 * two pin what their own deliverable gets wrong instead — a display face attracts the flourishes that
 * make it unusable at small sizes, and a terminal face attracts the panel it is normally seen on.
 */
export const FONT_SET_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'retro-pixel-interface-font',
    name: 'Retro Pixel Interface Font',
    description:
      'A printable ASCII set on a hard pixel grid, one cell wide per glyph so a renderer can index it by codepoint. Caps and lower case share a height, and the fills are flat: a gradient in a stem is noise at HUD size.',
    category: 'FONT',
    subject: {
      species: 'Square Grid Pixel Face',
      gender: 'Regular',
      age: 'Clean & Newly Cut',
      role: 'Interface Labels & Buttons',
      setting: 'Modern Day',
      build: 'Unicase, One Height Throughout',
      silhouette: 'Straight Segments, Sharp Corners',
      face_head: 'Flat Cut Terminals',
      anatomy: 'Fixed Cell, One Width For All',
      clothing: 'No Treatment',
      worn_details: 'Flat Fill, No Interior Detail',
      primary_colours: 'Bone White & Cool Shadow',
      accent_colours: 'Frost Cyan #22D3EE',
      materials: 'Backlit Panel & Diffused Glow',
      // The exclusion this category cannot do without. Two glyphs drawn side by side are two
      // inventory entries merged, and grid position is the only thing identifying either of them.
      exclusions: 'No word, phrase or specimen line set from the glyphs',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PIXEL_ART',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'STRICT_32_COLOR',
      surfaceDetail: 'MINIMAL',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'storybook-dialogue-font',
    name: 'Storybook Dialogue Font',
    description:
      'A painted serif face with proportional widths, for dialogue read in long runs. The x-height is short against tall capitals, which is what keeps a page of narration from reading as a wall.',
    category: 'FONT',
    subject: {
      species: 'Serif Storybook Face',
      gender: 'Regular',
      age: 'Lightly Inked & Even',
      role: 'Dialogue & Narration',
      setting: 'Cosy Storybook',
      build: 'Short X-Height, Tall Caps',
      silhouette: 'Thick Stems, Thin Crossbars',
      face_head: 'Bracketed Serif Terminals',
      anatomy: 'Proportional, Width Per Glyph',
      clothing: 'No Treatment',
      worn_details: 'Flat Fill, No Interior Detail',
      primary_colours: 'Parchment Cream & Sepia',
      accent_colours: 'Legendary Gold #D4AF37',
      materials: 'Ink On Parchment',
      exclusions: 'No word, phrase or specimen line set from the glyphs',
      additional_anatomy: 'Currency Mark ×3',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PAINTED_2D',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'TEXTURED',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GEMINI_PRO_IMAGE',
    },
  },
  {
    id: 'carved-stone-title-font',
    name: 'Carved Stone Title Font',
    description:
      'Heavy letterforms cut into stone, for title cards and chapter breaks. It excludes the swashes and flourishes a display face attracts, because a glyph whose ornament crosses the cell cannot be cut out as one sprite.',
    category: 'FONT',
    subject: {
      species: 'Blocky Display Face',
      gender: 'Heavy Poster Weight',
      age: 'Ancient & Weathered Carving',
      role: 'Headings & Title Cards',
      setting: 'Mythic Antiquity',
      build: 'Equal Caps And Ascenders',
      silhouette: 'Straight Segments, Cut Corners',
      face_head: 'Notched & Chiselled Terminals',
      anatomy: 'Two Cell Widths, Narrow And Wide',
      clothing: 'Inner Bevel & Highlight',
      worn_details: 'Etched Engraved Channels',
      primary_colours: 'Steel Grey & Cool Shadow',
      accent_colours: 'Warning Amber #F59E0B',
      materials: 'Carved Stone & Chisel Marks',
      // What a display face actually gets wrong. An ornament that leaves the glyph's own cell is a
      // component the cutter takes half of, and a swash joining two letters is two entries merged.
      exclusions: 'No decorative flourish, swash or ornament',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'RENDERED_3D',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'MAGENTA_FF00FF',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GEMINI_FLASH_IMAGE',
    },
  },
  {
    id: 'terminal-damage-numeral-font',
    name: 'Terminal Damage Numeral Font',
    description:
      'An emissive monospace face for damage numbers and readouts, with the digits drawn to one width so a rising score does not shuffle sideways. It excludes the panel a terminal face is normally seen on.',
    category: 'FONT',
    subject: {
      species: 'Numeric & Damage Face',
      gender: 'Bold',
      age: 'Glowing & Unblemished',
      role: 'Damage & Score Numerals',
      setting: 'Near-Future Cyberpunk',
      build: 'Equal Caps And Ascenders',
      silhouette: 'Uniform Stroke Throughout',
      face_head: 'Angled Cut Terminals',
      anatomy: 'Fixed Cell With Wide Numerals',
      clothing: 'Emissive Glow Within The Silhouette',
      worn_details: 'Scanline Banding Across The Fill',
      primary_colours: 'Terminal Green #4ADE80 & Black',
      accent_colours: 'Poison Green #4ADE80',
      materials: 'Backlit Panel & Diffused Glow',
      // The thing a terminal face attracts. A readout drawn on its own screen is a sprite the engine
      // cannot put anywhere else, and the glow bleeding past the silhouette is what the compositor
      // then cannot key out.
      exclusions: 'No frame, plate or panel behind a glyph',
      additional_anatomy: 'Fraction Numeral ×3, Degree Mark ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'RETRO_PIXEL_ART',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'RESTRAINED_64_COLOR',
      surfaceDetail: 'MINIMAL',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GPT_IMAGE',
    },
  },
];
