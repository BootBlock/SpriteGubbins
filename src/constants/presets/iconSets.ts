import { NO_ADDITIONAL_ANATOMY } from '../anatomy.ts';
import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/index.ts';
import type { PresetArchetype } from '../../types/preset.ts';
import { cataloguePicks } from '../iconCatalogue/cataloguePicks.ts';

/**
 * Icon sets — seven rosters a game actually asks for, each ticked from the catalogue.
 *
 * **Each preset is a roster as well as a look.** An icon sheet draws the reader's picks, so a preset
 * that set only the fields would hand every reader the starter set whatever its card promised. Each
 * one carries the icons its card names — a loot grid's potions and materials, a system bar's panels, a
 * unit frame's status icons, a map's pins, an action bar's consumables, a spellbook's attacks and an
 * emote wheel's gestures — declared in the catalogue's shelving order, which is the order its sheets
 * draw them and the order the store keeps every roster in (`iconRosterShelving.test.ts`).
 *
 * **The camera is what the four older ones vary**, and it is the one place this category is looser than
 * INTERFACE: a flat front-on glyph, a three-quarter potion bottle and an isometric map pin are all
 * shipped icon styles, so the library demonstrates that the choice exists at all.
 *
 * **Every one is square**, because `categoryAspectRatios.ts` binds ICON to `SQUARE_1_1`: four rows of
 * four square cells need a square sheet. `SINGLE_FRONT` is the honest direction set for the reason it is
 * on every category bound to it — an icon in a cell has no yaw.
 *
 * **The three cyberpunk sets are the use case the catalogue was built for**: a cyberpunk MMORPG's
 * consumables and its spellbook, drawn at 128 px for ChatGPT 5.6 Sol as full-bleed squares, the look of
 * an action bar that draws its own frame round each one, and its emote wheel as marks for the wheel's
 * own slots. The spellbook ticks two attacks from each of the eight damage schools, so every school's
 * colour is on its sheet, and draws them face on, as a spell's emblem is; the emote wheel is the
 * shipped set whose every icon is a figure, which only the figure-aware exclusions let it draw.
 *
 * **Three draw full-bleed squares and four draw isolated marks**, by what the game does with them. An
 * action bar, a spellbook and a bag grid show each icon as a painted square inside the slot's frame, as
 * World of Warcraft does; a system button, a status badge, a map pin and an emote sit on a plate, over
 * the map or in a wheel's slot, so each is a mark alone.
 *
 * **A full-bleed preset takes a key its squares' backdrops will not be keyed out with** (R15 of
 * `docs/todo/done/icon-catalogue.md`). Every pixel within the key's reach is removed wherever it sits, and a
 * square's backdrop is painted from the set's colours shaded towards black at its corners. Measured
 * over every hex colour ICON's *Primary Colours* and *Accent Colours* offer, shaded and washed that
 * way, `PURE_BLACK` reaches four primaries — the cyberpunk set's own Gunmetal among them — and
 * `MAGENTA_FF00FF` reaches Void Magenta, while `PURE_WHITE` reaches none. So the two full-bleed
 * cyberpunk sets, the consumables and the spellbook, take `PURE_WHITE`, which keeps the key safe when
 * a reader swaps their colours for others the fields offer; the spellbook's eight school colours are
 * held out of every key's reach by `damageSchools.test.ts`, so they leave the choice where the set's
 * own colours put it, and no cyberpunk look names white (`iconCatalogue.test.ts`). The fantasy grid
 * keeps `TRANSPARENT`, which no painted colour can be confused with, and so does the cyberpunk emote
 * wheel, whose isolated marks have no backdrop to shade.
 * `iconSetKeys.test.ts` holds all of this, and shows the black and magenta measurements failing.
 */
export const ICON_SET_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'fantasy-inventory-icon-grid',
    name: 'Fantasy Inventory Icon Grid',
    description:
      'A painted loot grid of potions, materials and chests at three quarters, each a square painted edge to edge for the bag slot to frame. The rarity tiers are separate pieces the engine lays over any icon.',
    category: 'ICON',
    subject: {
      species: 'Bags & Inventory',
      gender: 'Rare',
      age: 'Serviceable & Lightly Used',
      role: '32 × 32 Pixels',
      setting: 'High Fantasy',
      build: 'Standard Padded Margin',
      silhouette: 'One Bold Readable Shape Each',
      face_head: 'One Bright Focal Accent',
      anatomy: 'Icons With Engine-Applied Overlays',
      clothing: 'Rarity Glow & Aura',
      worn_details: 'Soft Painterly Modelling',
      primary_colours: 'Aged Bronze & Verdigris',
      accent_colours: 'Health Red #EF4444',
      materials: 'Blown Glass & Cork',
      // The one exclusion this category cannot do without. An icon with a stack count painted into
      // it is an icon for one quantity, in one language.
      exclusions: 'No lettering, numerals, stack counts or keybinds',
      additional_anatomy: 'Tier Pip ×3',
      icons: {
        look: 'FULL_BLEED_TILE',
        picks: cataloguePicks([
          'heal-minor',
          'heal-standard',
          'heal-major',
          'mana-minor',
          'mana-major',
          'elixir',
          'food-bread-ration',
          'drink-ale',
          'material-ore',
          'material-ingot',
          'material-herb',
          'material-gemstone',
          'currency-precious-coin',
          'quest-relic',
          'container-small-bag',
          'container-treasure-chest',
        ]),
      },
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PAINTED_2D',
      projection: 'THREE_QUARTER_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.THREE_QUARTER_TOPDOWN,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'flat-system-button-set',
    name: 'Flat System Button Set',
    description:
      'The system panels a button bar opens, drawn face on as flat shapes with no object behind them, so each silhouette alone has to say which panel it opens at the size the bar shows it.',
    category: 'ICON',
    subject: {
      species: 'System Button Bar',
      gender: 'Common',
      age: 'Pristine & Newly Made',
      role: '24 × 24 Pixels',
      setting: 'Far-Future Space Opera',
      build: 'Small Centred Subject',
      silhouette: 'Distinct Outline For Every Icon',
      face_head: 'Plain Object, No Added Motif',
      anatomy: 'Icons With Engine-Applied Overlays',
      clothing: 'Cooldown Dimming Veil',
      worn_details: 'Flat Fill, No Interior Detail',
      primary_colours: 'Slate #1E293B & Pale Ice',
      accent_colours: 'Frost Cyan #22D3EE',
      materials: 'Brushed Alloy & Backlit Panel',
      // The other ban an icon set needs, and the boundary with INTERFACE: the plate a system button sits
      // in is that category's component, so a set that draws its own cannot be dropped into an
      // interface the project already has.
      exclusions: 'No slot plate, frame or border behind the icon',
      additional_anatomy: 'Equipped Corner Tick ×1',
      // Sixteen panels, two of them toggles drawn in both states, so the set runs to a second sheet.
      icons: {
        look: 'ISOLATED_MARK',
        picks: cataloguePicks([
          'system-main-options',
          'system-settings',
          'system-character',
          'system-bags',
          'system-abilities',
          'system-talents',
          'system-quest-log',
          'system-achievements',
          'system-collections',
          'system-world-map',
          'system-calendar',
          'system-store',
          'system-help',
          'system-log-off',
          'system-sound',
          'system-layout-lock',
        ]),
      },
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      // Flat vector shapes rather than cel shading: an unlit glyph with no outline is what the card
      // describes, and cel shading names shadow steps and an ink contour of its own.
      renderStyle: 'VECTOR_FLAT',
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
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'pixel-status-badge-set',
    name: 'Pixel Status Badge Set',
    description:
      'Tiny unit-frame status badges and loot-roll choices at a fixed cell size, drawn to read as a condition rather than as an object. At this size every extra interior line arrives as noise instead of detail.',
    category: 'ICON',
    subject: {
      species: 'Unit Frame & Status Row',
      gender: 'Cursed & Corrupted',
      age: 'Cracked & Failing',
      role: '24 × 24 Pixels',
      setting: 'Grim Dark Fantasy',
      build: 'Tightly Filling The Square',
      silhouette: 'Chunky Low-Detail Forms',
      face_head: 'One Bright Focal Accent',
      anatomy: 'Icons With Engine-Applied Overlays',
      clothing: 'Broken Crack Overlay',
      worn_details: 'Two-Tone Block Shading',
      primary_colours: 'Matte Black & Bone White',
      accent_colours: 'Poison Green #4ADE80',
      materials: 'Bone, Horn & Sinew',
      exclusions: 'No drop shadow cast outside the icon',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
      icons: {
        look: 'ISOLATED_MARK',
        picks: cataloguePicks([
          'loot-need',
          'loot-greed',
          'loot-pass',
          'loot-salvage',
          'status-in-combat',
          'status-resting',
          'status-pvp-flagged',
          'status-dead',
          'status-away',
          'status-busy',
          'status-group-leader',
          'status-loot-master',
          'status-ready-check',
          'status-threat',
        ]),
      },
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
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '24 × 24 px per badge',
      paletteLimit: 'STRICT_32_COLOR',
      surfaceDetail: 'MINIMAL',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'isometric-map-marker-set',
    name: 'Isometric Map Marker Set',
    description:
      'Map pins drawn in true isometric so they sit on the same grid the map does. A pin at a different angle from the terrain beneath it reads as pasted on rather than placed.',
    category: 'ICON',
    subject: {
      species: 'World Map & Minimap',
      gender: 'Uncommon',
      age: 'Pristine & Newly Made',
      role: '32 × 32 Pixels',
      setting: 'Victorian Gaslamp',
      build: 'Upright And Centred',
      silhouette: 'Upright Vertical Masses',
      face_head: 'Engraved Emblem On The Object',
      anatomy: 'Icons With Engine-Applied Overlays',
      clothing: 'New Item Flare & Sparkle',
      worn_details: 'Etched Engraved Lines',
      primary_colours: 'Warm Leather Brown & Tan',
      accent_colours: 'Warning Amber #F59E0B',
      materials: 'Cast Iron & Riveted Plate',
      exclusions: 'No background scene, tabletop or ground plane',
      additional_anatomy: 'Favourite Star ×1',
      icons: {
        look: 'ISOLATED_MARK',
        picks: cataloguePicks([
          'pin-quest-available',
          'pin-quest-turn-in',
          'pin-quest-area',
          'pin-waypoint',
          'pin-player',
          'pin-party-member',
          'pin-flight-point',
          'pin-dungeon',
          'pin-mailbox',
          'pin-inn',
          'pin-treasure',
          'pin-dangerous-foe',
          'pin-respawn',
        ]),
      },
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PIXEL_ART',
      projection: 'TRUE_ISOMETRIC',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.TRUE_ISOMETRIC,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      paletteLimit: 'RESTRAINED_64_COLOR',
      surfaceDetail: 'CLEAN_PRODUCTION',
      lightingModel: 'FLAT_NEUTRAL_ALBEDO',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'GPT_IMAGE',
    },
  },
  {
    id: 'cyberpunk-action-bar-consumables',
    name: 'Cyberpunk Action Bar — Consumables',
    description:
      'Sixteen action-bar consumables for a cyberpunk MMORPG: stim-packs, neuro-boosts, detox pens and grenades, each a 128 px square painted edge to edge for the bar to frame and read mid-fight by one glowing accent.',
    category: 'ICON',
    subject: {
      species: 'Action Bar',
      gender: 'Rare',
      age: 'Scuffed Street-Worn Kit',
      role: '32 × 32 Pixels',
      setting: 'Near-Future Cyberpunk',
      build: 'Diagonal, Corner To Corner',
      silhouette: 'One Bold Readable Shape Each',
      face_head: 'Emissive Core Glow',
      anatomy: 'Icons With Engine-Applied Overlays',
      clothing: 'Cooldown Dimming Veil',
      worn_details: 'Neon Rim Lighting',
      primary_colours: 'Gunmetal #2B2F36 & Chrome',
      accent_colours: 'Electric Cyan #00E5FF',
      materials: 'Scratched Chrome & Rubber Grip',
      exclusions: 'No lettering, numerals, stack counts or keybinds',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
      icons: {
        look: 'FULL_BLEED_TILE',
        picks: cataloguePicks([
          'heal-minor',
          'heal-standard',
          'heal-major',
          'mana-minor',
          'mana-major',
          'stamina-restore',
          'cure-poison',
          'cure-affliction',
          'regeneration',
          'revive',
          'elixir',
          'boost-strength',
          'boost-agility',
          'boost-move-speed',
          'throw-frag-grenade',
          'throw-smoke',
        ]),
      },
    },
    output: {
      ...DEFAULT_IMAGE_CONFIG,
      renderStyle: 'PAINTED_2D',
      projection: 'THREE_QUARTER_TOPDOWN',
      cameraElevation: DEFAULT_CAMERA_ELEVATIONS.THREE_QUARTER_TOPDOWN,
      directionalMode: 'SINGLE_DIRECTION_POSE_LIBRARY',
      directions: 'SINGLE_FRONT',
      primaryDirection: 'front',
      rigMode: 'NONE',
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '128 × 128 px per icon',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'PURE_WHITE',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'cyberpunk-spellbook-combat-abilities',
    name: 'Cyberpunk Spellbook — Combat Abilities',
    description:
      'Sixteen spellbook attacks for a cyberpunk MMORPG, two from each damage school, each a 128 px square painted edge to edge and led by its school’s one colour, so a player reads the school before the shape.',
    category: 'ICON',
    subject: {
      species: 'Spellbook & Ability List',
      gender: 'Epic',
      age: 'Factory-Fresh Chrome',
      role: '32 × 32 Pixels',
      setting: 'Near-Future Cyberpunk',
      build: 'Tightly Filling The Square',
      silhouette: 'One Bold Readable Shape Each',
      face_head: 'Emissive Core Glow',
      anatomy: 'Icons With Engine-Applied Overlays',
      clothing: 'Cooldown Dimming Veil',
      worn_details: 'Neon Rim Lighting',
      primary_colours: 'Gunmetal #2B2F36 & Chrome',
      accent_colours: 'Electric Cyan #00E5FF',
      materials: 'Carbon Fibre & Neon Tubing',
      exclusions: 'No lettering, numerals, stack counts or keybinds',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
      icons: {
        look: 'FULL_BLEED_TILE',
        picks: cataloguePicks([
          'kinetic-strike',
          'kinetic-finisher',
          'thermal-strike',
          'thermal-blast',
          'cryo-strike',
          'cryo-channel',
          'voltaic-strike',
          'voltaic-blast',
          'toxic-strike',
          'toxic-over-time',
          'neural-strike',
          'neural-vulnerability',
          'netrun-strike',
          'netrun-ultimate',
          'nanite-strike',
          'nanite-blast',
        ]),
      },
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
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '128 × 128 px per icon',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'DETAILED_PRODUCTION',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'PURE_WHITE',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
  {
    id: 'cyberpunk-emote-wheel',
    name: 'Cyberpunk Emote Wheel',
    description:
      'Sixteen emotes for a cyberpunk MMORPG’s emote wheel, from a wave to a facepalm, each a chrome cyber-hand, an android face-plate or a neon avatar drawn alone for the wheel’s own slot to hold.',
    category: 'ICON',
    subject: {
      species: 'Social Panels',
      gender: 'Common',
      age: 'Scuffed Street-Worn Kit',
      role: '32 × 32 Pixels',
      setting: 'Near-Future Cyberpunk',
      build: 'Upright And Centred',
      silhouette: 'Distinct Outline For Every Icon',
      face_head: 'Neon Edge Light',
      anatomy: 'Icons With Engine-Applied Overlays',
      clothing: 'Locked Padlock Mark',
      worn_details: 'Neon Rim Lighting',
      primary_colours: 'Gunmetal #2B2F36 & Chrome',
      accent_colours: 'Electric Cyan #00E5FF',
      materials: 'Scratched Chrome & Rubber Grip',
      exclusions: 'No background scene, tabletop or ground plane',
      additional_anatomy: NO_ADDITIONAL_ANATOMY,
      icons: {
        look: 'ISOLATED_MARK',
        picks: cataloguePicks([
          'emote-wave',
          'emote-bow',
          'emote-salute',
          'emote-cheer',
          'emote-laugh',
          'emote-cry',
          'emote-dance',
          'emote-point',
          'emote-thumbs-up',
          'emote-thumbs-down',
          'emote-shrug',
          'emote-facepalm',
          'emote-clap',
          'emote-heart',
          'emote-angry',
          'emote-peace',
        ]),
      },
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
      resolutionProfile: 'CUSTOM',
      spriteTargetSize: '128 × 128 px per icon',
      paletteLimit: 'UNRESTRICTED',
      surfaceDetail: 'CLEAN_PRODUCTION',
      lightingModel: 'ISOMETRIC_TOP_LEFT',
      outlineStyle: 'DARK_LOCAL_CONTOUR',
      backgroundKey: 'TRANSPARENT',
      aspectRatio: 'SQUARE_1_1',
      targetModel: 'CHATGPT_5_6_SOL',
    },
  },
];
