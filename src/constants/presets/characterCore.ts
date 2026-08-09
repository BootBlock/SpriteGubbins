import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * The three worked humanoid examples the app has always shipped, and the one it opens on.
 *
 * These are the *complete* end of the library: every one of the sixteen subject fields is set, and
 * what varies between them is ordinary production choice — resolution, palette, outline, lighting —
 * rather than a technique being put on show. All three keep the app's default modern pixel art at its
 * default camera, so they read as "what a filled-in studio looks like". The presets that showcase a
 * specific render style, projection or rig live in the files beside this one.
 */

/**
 * The archetype the studio opens on — the app boots into the Cyberpunk Katana Specialist rather
 * than an empty form, so the prompt preview has something real in it from the first paint.
 *
 * Bound to a name as well as being first in the list so the subject store can state what it starts
 * from without indexing the array: under `noUncheckedIndexedAccess` an index read is
 * `PresetArchetype | undefined`, and the store would need a fallback for a case that cannot happen.
 */
const CYBERPUNK_KATANA: PresetArchetype = {
  id: 'cyberpunk-katana',
  name: 'Cyberpunk Katana Specialist',
  category: 'CHARACTER',
  subject: {
    species: 'Cybernetic Cyborg',
    gender: 'Feminine',
    age: 'Young Adult (20s)',
    role: 'Katana Specialist',
    setting: 'Cyberpunk Dystopia',
    build: 'Athletic & Slender',
    silhouette: 'Dynamic Sharp Edges',
    face_head: 'Neon Visor & Undercut',
    anatomy: 'Standard Humanoid',
    clothing: 'Tactical Kevlar & Plates',
    worn_details: 'Holstered Sidearm & Pouch',
    primary_colours: 'Matte Charcoal Black & Gunmetal',
    accent_colours: 'Cyan Neon #06B6D4',
    materials: 'Reinforced Composites & Alloy',
    exclusions: 'No weapons, no floor shadows',
    additional_anatomy: NO_ADDITIONAL_ANATOMY,
  },
  output: {
    ...DEFAULT_IMAGE_CONFIG,
    directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
    surfaceDetail: 'CLEAN_PRODUCTION',
    resolutionProfile: 'HIGH_RESOLUTION',
    paletteLimit: 'RESTRAINED_64_COLOR',
    outlineStyle: 'DARK_LOCAL_CONTOUR',
    lightingModel: 'FLAT_NEUTRAL_ALBEDO',
    aspectRatio: 'WIDE_16_9',
    targetModel: 'CHATGPT_5_6_SOL',
  },
};

/** The studio's opening state. See {@link CYBERPUNK_KATANA}. */
export const DEFAULT_PRESET = CYBERPUNK_KATANA;

export const CHARACTER_CORE_PRESETS: readonly PresetArchetype[] = [
  CYBERPUNK_KATANA,
  {
    id: 'scifi-marine',
    name: 'Sci-Fi Void Marine',
    category: 'CHARACTER',
    subject: {
      species: 'Human',
      gender: 'Masculine',
      age: 'Mature / Veteran (40s)',
      role: 'Heavy Mech Marine',
      setting: 'Grimdark Sci-Fi',
      build: 'Heavy Armoured Tank',
      silhouette: 'Bulky Plated Layers',
      face_head: 'Full Enclosed Helmet',
      anatomy: 'Standard Humanoid',
      clothing: 'Gothic Plate Armour',
      worn_details: 'Shoulder Pauldrons & Cloak',
      primary_colours: 'Royal Navy & Deep Silver',
      accent_colours: 'Safety Crimson #EF4444',
      materials: 'Burnished Steel & Leather',
      exclusions: 'No cape, no facial features',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      surfaceDetail: 'DETAILED_PRODUCTION',
      resolutionProfile: 'HIGH_RESOLUTION',
      paletteLimit: 'STRICT_32_COLOR',
      outlineStyle: 'PURE_BLACK_OUTLINE',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      aspectRatio: 'WIDE_16_9',
      targetModel: 'GENERIC',
    },
  },
  {
    id: 'dungeon-knight',
    name: 'Pixel Dungeon Knight',
    category: 'CHARACTER',
    subject: {
      species: 'Human',
      gender: 'Masculine',
      age: 'Young Adult (20s)',
      role: 'Paladin',
      setting: 'Dark Fantasy',
      build: 'Stocky & Robust',
      silhouette: 'Bulky Plated Layers',
      face_head: 'Braided Hair & Warpaint',
      anatomy: 'Standard Humanoid',
      clothing: 'Gothic Plate Armour',
      worn_details: 'Shoulder Pauldrons & Cloak',
      primary_colours: 'Crimson Red & Black',
      accent_colours: 'Polished Gold #F59E0B',
      materials: 'Burnished Steel & Leather',
      exclusions: 'No floor shadows',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
      surfaceDetail: 'CLEAN_PRODUCTION',
      resolutionProfile: 'RETRO_16_BIT',
      paletteLimit: 'STRICT_32_COLOR',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GENERIC',
    },
  },
];
