import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../output/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * One humanoid per rendering technique that is not the app's default modern pixel art.
 *
 * The render style is the setting a first-time user is least likely to discover on their own —
 * `PIXEL_ART` is the default and the three worked archetypes next door all keep it — yet it changes
 * the compiled prompt more than any field in the subject does. Each preset here pairs a style with the
 * palette, outline and lighting that style actually implies: a painted sheet has no colour budget to
 * enforce, an inked one is a black line over flat fills, and a 16-bit one is a small palette at a small
 * size. The two *production passes* — clay and silhouette — are render styles too, and live with the
 * rigs instead, because what they exist to answer is a question about the sheet rather than a look.
 */
export const CHARACTER_STYLE_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'retro-village-hero',
    name: '16-Bit Village Hero',
    category: 'CHARACTER',
    subject: {
      species: 'Human',
      gender: 'Masculine',
      age: 'Teenage Prodigy',
      role: 'Shield Guardian',
      setting: 'High Magic High Renaissance',
      build: 'Stocky & Robust',
      silhouette: 'Dynamic Sharp Edges',
      face_head: 'Braided Hair & Warpaint',
      anatomy: 'STANDARD HUMANOID',
      clothing: 'Leather Duster Coat',
      worn_details: 'Scabbard & Strap Rig',
      primary_colours: 'Emerald Green & Tan',
      accent_colours: 'Laser Yellow #EAB308',
      materials: 'Burnished Steel & Leather',
      exclusions: 'No floor terrain, no text labels',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      renderStyle: 'RETRO_PIXEL_ART',
      // The three that make a retro sheet retro, rather than a modern sheet described as one: a small
      // figure, a small palette, and no interior detail competing with the outline.
      resolutionProfile: 'RETRO_16_BIT',
      paletteLimit: 'STRICT_32_COLOR',
      surfaceDetail: 'MINIMAL',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      aspectRatio: 'SQUARE_1_1',
      spriteTargetSize: '32 × 48 px per figure',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'painted-storybook-ranger',
    name: 'Painted Storybook Ranger',
    category: 'CHARACTER',
    subject: {
      species: 'High Elf',
      gender: 'Feminine',
      age: 'Young Adult (20s)',
      role: 'Druid Shapeshifter',
      setting: 'High Magic High Renaissance',
      build: 'Tall & Ethereal',
      silhouette: 'Flowing Robes & Cape',
      face_head: 'Hooded Mask & Glowing Eyes',
      anatomy: 'STANDARD HUMANOID',
      clothing: 'Enchanted Runed Robes',
      worn_details: 'Scroll Tubes & Flasks',
      primary_colours: 'Emerald Green & Tan',
      accent_colours: 'Molten Copper',
      materials: 'Woven Silk & Runic Crystals',
      exclusions: 'No glowing trails',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      renderStyle: 'PAINTED_2D',
      // A painted sheet has no colour budget to enforce and no outline to draw — asking for either
      // would fight the technique rather than constrain it.
      paletteLimit: 'UNRESTRICTED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      aspectRatio: 'TALL_9_16',
      targetModel: 'MIDJOURNEY',
    },
  },
  {
    id: 'cel-shaded-duellist',
    name: 'Cel-Shaded Arena Duellist',
    category: 'CHARACTER',
    subject: {
      species: 'Human',
      gender: 'Non-Binary',
      age: 'Young Adult (20s)',
      role: 'Katana Specialist',
      setting: 'Feudal Japan Cyber',
      build: 'Lethal Agile',
      silhouette: 'Sleek Aerodynamic',
      face_head: 'Ornate Crested Visor',
      anatomy: 'STANDARD HUMANOID',
      clothing: 'Nano-Weave Bodysuit',
      worn_details: 'Fibre-Optic Cabling',
      primary_colours: 'Pearl White & Chrome',
      accent_colours: 'Electric Violet',
      materials: 'Synthetic Polymer',
      exclusions: 'No weapons, no floor shadows',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      renderStyle: 'CEL_SHADED',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GEMINI_PRO_IMAGE',
      // A conversational target, so the companion manifest is honoured rather than dropped — the one
      // preset in this file that asks for one, because a sheet whose cells have to be found by grid
      // position is the case it pays for itself on.
      emitManifest: true,
    },
  },
  {
    id: 'inked-plague-doctor',
    name: 'Inked Woodcut Plague Doctor',
    category: 'CHARACTER',
    subject: {
      species: 'Human',
      gender: 'Androgynous / Neutral',
      age: 'Mature / Veteran (40s)',
      role: 'Alchemist',
      setting: 'Dark Fantasy',
      build: 'Skeletal Slender',
      silhouette: 'Flowing Robes & Cape',
      face_head: 'Beaked Mask & Wide Brim',
      anatomy: 'STANDARD HUMANOID',
      clothing: 'Leather Duster Coat',
      worn_details: 'Scroll Tubes & Flasks',
      primary_colours: 'Matte Charcoal Black & Gunmetal',
      accent_colours: 'Spectral Rose',
      materials: 'Waxed Leather & Bone',
      exclusions: 'No background clutter, no pets',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_OUTPUT_CONFIG,
      renderStyle: 'HAND_DRAWN_INK',
      // Hatching is texture, and it is the whole look — so this is the one style that wants the
      // surface detail turned up rather than down.
      surfaceDetail: 'TEXTURED',
      resolutionProfile: 'MID_RESOLUTION',
      paletteLimit: 'STRICT_32_COLOR',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      // White rather than magenta: ink on paper is what the technique means, and a black-line sheet
      // has no light edge for the white to bleed into.
      backgroundKey: 'PURE_WHITE',
      // One facing. A woodcut turned three ways is three woodcuts, and the pose library is what an
      // illustrated sheet is actually for.
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      aspectRatio: 'SQUARE_1_1',
      // A diffusion endpoint suits an illustrated single pass, and this one publishes no prompt
      // ceiling. Stable Diffusion would have been the obvious pick and is the wrong one: its
      // documented context is CLIP's 77 tokens, so a preset naming it arrives thirty times over
      // budget and the only thing the card does on load is raise a warning.
      targetModel: 'MIDJOURNEY',
    },
  },
];
