import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import type { ImageOutputConfig } from '../../types/output.ts';
import type { PresetArchetype } from '../../types/preset.ts';
import { sparseSubject } from './sparseSubject.ts';

/**
 * Presets encoding the Unsung Saviour art contract, so that project's art can be generated without
 * re-deriving its numbers.
 *
 * **Every technical value here comes from that game's own `art-style-three-quarter-view.md`** — if it
 * changes there, these follow. They are deliberately *technical* presets: they fix the projection,
 * the scale, the palette discipline and the rig geometry, and leave the subject almost entirely
 * empty, because who the character is changes per sheet while none of the above does.
 *
 * That emptiness is the point of v2's optional lines. A blank field omits its line, and the template
 * states outright that an absent attribute is the generator's to decide — so these presets ask for
 * exactly the constraints that matter and nothing else.
 */

/** What all three share: the projection, scale and lighting discipline the game's renderer needs. */
const US_SHARED: ImageOutputConfig = {
  ...DEFAULT_IMAGE_CONFIG,
  renderStyle: 'PIXEL_ART',
  projection: 'THREE_QUARTER_TOPDOWN',
  cameraElevation: 30,
  resolutionProfile: 'HIGH_RESOLUTION',
  paletteLimit: 'RESTRAINED_64_COLOR',
  outlineStyle: 'DARK_LOCAL_CONTOUR',
  // Load-bearing. The engine lights actors with `CanvasModulate` and `Light2D` and draws its own
  // shadows; baked directional lighting would fight both.
  lightingModel: 'FLAT_NEUTRAL_ALBEDO',
  backgroundKey: 'MAGENTA_FF00FF',
  surfaceDetail: 'CLEAN_PRODUCTION',
  aspectRatio: 'SQUARE_1_1',
};

export const UNSUNG_SAVIOUR_PRESETS: readonly PresetArchetype[] = [
  {
    id: 'us-character-rig',
    name: 'Unsung Saviour — Character rig',
    description:
      'A technical contract rather than a worked example — the projection, scale, palette discipline and rig geometry the Unsung Saviour project’s art requires, with the subject left for you to fill in.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions:
        'No baked shadow of any kind, no ground contact shadow, no assembled figure, no equipment in the sockets',
    }),
    output: {
      ...US_SHARED,
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      // Run once per compass direction with a shared identity lock: eight sheets of fifteen pieces
      // is the 120-piece rig in units a model actually delivers.
      directions: 'EIGHT_COMPASS',
      spriteTargetSize: '48 × 96 px assembled (2 metres tall at 48 px per metre)',
      jointCapStyle: 'ROUNDED',
      overlapMargin: 'HALF_CAP',
      // The slots exist in the art from the start and are kept clear, which is what makes the
      // game's deferred visible-equipment decision cheap later.
      sockets: 'head, chest, back, hand_left, hand_right',
    },
  },
  {
    id: 'us-creature-rig',
    name: 'Unsung Saviour — Creature rig',
    description:
      'The same technical contract with no attachment sockets, because enemies do not wear the player’s gear. Match the sheet mode to the creature’s anatomy before generating.',
    category: 'CREATURE',
    subject: sparseSubject('CREATURE', {
      exclusions:
        'No baked shadow of any kind, no ground contact shadow, no assembled figure, no human clothing',
    }),
    output: {
      ...US_SHARED,
      rigMode: 'CUTOUT_RIG',
      // A starting point: match the mode to the creature's anatomy before generating, because a
      // quadruped's inventory is not a humanoid's.
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      directions: 'EIGHT_COMPASS',
      spriteTargetSize: '48 × 96 px assembled (2 metres tall at 48 px per metre)',
      jointCapStyle: 'ROUNDED',
      overlapMargin: 'HALF_CAP',
      // Empty: enemies do not wear player gear.
      sockets: '',
    },
  },
  {
    id: 'us-tileset-3q',
    name: 'Unsung Saviour — Three-quarter tileset',
    description:
      'The Unsung Saviour tile contract: 48 × 48 px per tile at one metre, three-quarter, with the wall face as its own tile. One view, since tiles have no facing to turn.',
    category: 'BUILDING',
    subject: sparseSubject('BUILDING', {
      anatomy: 'Modular Building Tiles',
      materials:
        'Seamless tiling: opposite edges match so tiles butt without a visible join, and no tile carries a feature that reveals repetition when laid in a field',
      exclusions: 'No characters, no props, no baked lighting, no shadow',
    }),
    output: {
      ...US_SHARED,
      rigMode: 'NONE',
      directionalMode: 'TILESET_MODULAR',
      // Tiles have one view; the three-quarter read comes from the wall *face* being its own tile.
      directions: 'SINGLE_FRONT',
      spriteTargetSize: '48 × 48 px per tile (1 metre)',
    },
  },
];
