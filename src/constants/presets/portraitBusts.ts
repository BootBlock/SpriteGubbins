import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';

/**
 * Portrait busts — the four dialogue sheets a portrait is actually asked for.
 *
 * **All four share a camera, and that is the category rather than an oversight.** A portrait is read
 * at eye level, straight on: `categoryProjections.ts` binds it to `ORTHOGRAPHIC_FRONT`, so the four
 * cannot vary the camera even if they wanted to. What they vary instead are the axes that carry
 * information here — the crop, the head's own turn, how the set is meant to be cut, and how it is
 * rendered. Four fantasy heroes in four colourways would have demonstrated the option pool and none
 * of the machinery.
 *
 * **The crop is the axis worth spending most of that variation on**, because it is the one setting a
 * project cannot change its mind about later: a dialogue box built for a head and shoulders cannot
 * take a half body, and a set drawn to two crops cannot be swapped one for another at runtime. So
 * the four cover a head-and-shoulders, a bust, a half body and a full standing figure.
 *
 * `SINGLE_FRONT` is the honest direction set rather than what makes the prompt coherent: the one
 * sheet mode this category has covers a single facing whatever the control says, so the set decides
 * only how many *sheets* the deliverable is. Any wider set turns one expression library into a run
 * of identical libraries at yaws the camera does not have.
 */
export const PORTRAIT_BUST_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'fantasy-quest-giver-portrait',
    name: 'Fantasy Quest Giver Portrait',
    description:
      'A painted head-and-shoulders elder for a dialogue box, drawn flat so every expression can be swapped for another. It excludes the name plate, which the engine draws in the player’s own language.',
    category: 'PORTRAIT',
    subject: {
      species: 'Human',
      gender: 'Male',
      age: 'Elderly & Weathered',
      role: 'Quest Giver & Elder',
      setting: 'High Fantasy',
      build: 'Head And Shoulders',
      silhouette: 'Facing The Viewer, Level',
      face_head: 'Broad Heavy Features, Full Beard',
      anatomy: 'Single Flat Portrait Per Expression',
      clothing: 'Layered Silk Robes',
      worn_details: 'Freckles & Sun Damage',
      primary_colours: 'Fair Skin & Pale Gold Hair',
      accent_colours: 'Amber Eyes #F59E0B',
      materials: 'Soft Skin, Matte Cloth & Wet Eyes',
      // The one exclusion this category cannot do without. A portrait with a name painted beside it
      // serves one character in one language, and the box the engine draws would sit over it.
      exclusions: 'No name plate, caption or speech bubble',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
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
      // A fixed key light rather than flat albedo: a painted portrait is the one deliverable in this
      // app where modelling the form *is* the art, and a flat sheet reads as an unfinished layer.
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'visual-novel-layered-bust',
    name: 'Visual Novel Layered Bust',
    description:
      'A cel-shaded bust cut for feature swapping, so a dialogue system builds dozens of expressions from one head. The mouth shapes for lip-sync are asked for as extra components.',
    category: 'PORTRAIT',
    subject: {
      species: 'Human',
      gender: 'Female',
      age: 'Young Adult',
      role: 'Party Member & Ally',
      setting: 'Modern Day',
      build: 'Bust To Upper Chest',
      silhouette: 'Slight Three-Quarter Turn',
      face_head: 'Wide Expressive Eyes, Loose Curls',
      anatomy: 'Shared Head With Swappable Brows, Eyes And Mouths',
      clothing: 'Tailored Coat & Cravat',
      worn_details: 'Piercings & Ear Cuffs',
      primary_colours: 'Olive Skin & Dark Copper Hair',
      accent_colours: 'Emerald Eyes #10B981',
      materials: 'Soft Skin, Matte Cloth & Wet Eyes',
      exclusions: 'No background scene behind the head',
      // The pieces a layered cut needs beyond the twelve expressions, asked for through the field
      // that exists for exactly this — the plan is a function of the category and the mode, never of
      // a subject field, so `additional_anatomy` is where a per-project deliverable is stated.
      additional_anatomy: 'Speaking Mouth Shapes ×4',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'CEL_SHADED',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'CLEAN_PRODUCTION',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'TALL_9_16',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'pixel-roster-face-sheet',
    name: 'Pixel Roster Face Sheet',
    description:
      'A tightly restricted pixel face sheet for a party roster, where each portrait is only a few dozen pixels across and the silhouette of the hair carries the whole likeness.',
    category: 'PORTRAIT',
    subject: {
      species: 'Dwarf & Stout Folk',
      gender: 'Androgynous',
      age: 'Prime Adult',
      role: 'Player Avatar',
      setting: 'Grim Dark Fantasy',
      build: 'Head Only',
      silhouette: 'Facing The Viewer, Level',
      face_head: 'Scarred Asymmetric Features, Shaven Head',
      anatomy: 'Single Flat Portrait Per Expression',
      clothing: 'Plate Gorget & Pauldrons',
      worn_details: 'Battle Scars Across The Face',
      primary_colours: 'Deep Brown Skin & Black Coils',
      accent_colours: 'Ice Blue Eyes #7DD3FC',
      materials: 'Polished Plate & Oiled Leather',
      exclusions: 'No frame, vignette or decorative border',
      additional_anatomy: 'Blood Spatter ×1, Bruising ×1',
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
      // A roster portrait is drawn at the size the roster shows it, so the target size is the
      // statement of scale the prompt would otherwise have none of.
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '48 × 48 px per portrait',
      paletteLimit: 'STRICT_32_COLOR',
      surfaceDetail: 'MINIMAL',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'sci-fi-full-body-cutscene-bust',
    name: 'Sci-Fi Full Body Cutscene Figure',
    description:
      'A full standing figure for a cutscene overlay, lit as though from the screen it stands in front of. The crop reaches the feet, so the extra limbs a generator adds are what the audit looks for.',
    category: 'PORTRAIT',
    subject: {
      species: 'Construct, Android & Automaton',
      gender: 'Ambiguous & Concealed',
      age: 'Ageless & Unreadable',
      role: 'Antagonist & Villain',
      setting: 'Far-Future Space Opera',
      build: 'Full Body Standing',
      silhouette: 'Chin Lifted, Looking Down',
      face_head: 'Faceplate & Optic Lenses',
      anatomy: 'Shared Body With Swappable Heads',
      clothing: 'Sealed Suit Collar Ring',
      worn_details: 'Subdermal Circuit Tracery',
      primary_colours: 'Burnished Bronze Plating',
      accent_colours: 'Arcane Violet Glow #8B5CF6',
      materials: 'Brushed Alloy & Backlit Lens',
      exclusions: 'No held prop or weapon entering the crop',
      additional_anatomy: 'Closed Eyes For Blinking ×1',
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'CLAY_RENDER',
      projection: 'ORTHOGRAPHIC_FRONT',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'RESTRAINED_64_COLOR',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'UNLIT_EMISSIVE_BAKED',
      outlineStyle: 'OUTLINE_LESS_ALBEDO',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'TALL_9_16',
      targetModel: 'GEMINI_PRO_IMAGE',
    },
  },
];
