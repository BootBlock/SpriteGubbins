import { DEFAULT_IMAGE_CONFIG } from '../output/index.ts';
import type { ImageOutputConfig } from '../../types/output.ts';
import type { PresetArchetype } from '../../types/preset.ts';
import { sparseSubject } from './sparseSubject.ts';
import { UNSUNG_SAVIOUR_HUMANOID_RIG } from './unsungSaviourRig.ts';

/**
 * Presets encoding the Unsung Saviour art contract, so that project's art can be generated without
 * re-deriving its numbers.
 *
 * **Three sources, and every value here names the one it came from.** The projection, the scale, the
 * palette discipline and the lighting are that game's own `art-style-three-quarter-view.md` — if they
 * change there, these follow. `sockets` is its equipment slots, `GEAR_SLOTS` in
 * `character_pool_manager.gd`, because that document defers visible equipment and names no region for
 * it. And the rig geometry is `humanoid_rig.tres`, by way of the contract its Rig Intake tab exports,
 * which `unsungSaviourRig.ts` carries. A value here with no source named is the defect issue #303 was
 * opened for. They are deliberately *technical* presets: they fix the projection,
 * the scale, the palette discipline and the rig geometry, and leave the subject almost entirely
 * empty, because who the character is changes per sheet while none of the above does.
 *
 * That emptiness is the point of v2's optional lines. A blank field omits its line, and the template
 * states outright that an absent attribute is the generator's to decide — so these presets ask for
 * exactly the constraints that matter and nothing else.
 *
 * **The character preset carries that game's rig, so the prompt states every piece's geometry.**
 * `UNSUNG_SAVIOUR_HUMANOID_RIG` is its Rig Intake's own exported contract, and a contract is a field
 * of the configuration a preset applies — so section 4 lists the fifteen pieces under the names the
 * engine places them by, and section 5 gives each one its size, its joint end and where that joint
 * sits in the frame. Without it the prompt can state the assembled figure and nothing else, and a
 * model draws each limb to its own sense of proportion. See `unsungSaviourRig.ts` for why a copy is
 * shipped rather than left to the reader to load.
 *
 * **`spriteTargetSize` is the rig's, and the contract supersedes it.** Where one is loaded the
 * assembled size comes from its frame and the sheet's pieces from its slots, so the figure written
 * here is what the two presets that carry no contract state, and what the character preset falls
 * back to for a reader who removes it. Deleting it was considered and rejected: it leaves that
 * reader holding a prompt that states no size at all.
 *
 * `EIGHT_COMPASS` is **not** superseded, and a contract has no opinion about it. How many facings
 * to generate is the reader's decision about this run rather than a property of the rig, and the
 * exported document's own `facings` list is deliberately not carried — see `types/rigContract.ts`.
 */

/** What all three share: the projection, scale and lighting discipline the game's renderer needs. */
const US_SHARED: ImageOutputConfig = {
  ...DEFAULT_IMAGE_CONFIG,
  renderStyle: 'PIXEL_ART',
  projection: 'THREE_QUARTER_TOPDOWN',
  cameraElevation: 30,
  // `CUSTOM` because all three state the game's size, and `CUSTOM` is the one profile that reads a
  // stated size: a share of the cell beside “48 × 48 px per tile” was a second scale, 2.7 to 3.5 times
  // the tile on a 4 × 4 Sol sheet. The character preset's rig would resolve it to `CUSTOM` anyway.
  resolutionProfile: 'CUSTOM',
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
      'The projection, scale and palette discipline Unsung Saviour’s art requires, carrying that engine’s own fifteen-piece Humanoid rig so each piece is asked for at the size and joint it is placed by. The subject is yours.',
    category: 'CHARACTER',
    subject: sparseSubject('CHARACTER', {
      exclusions:
        'No baked shadow of any kind, no ground contact shadow, no assembled figure, no equipment in the sockets',
    }),
    output: {
      ...US_SHARED,
      rigMode: 'CUTOUT_RIG',
      directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
      // The engine's own rig, so the inventory and the geometry are its numbers rather than this
      // app's table and the reader's typing. It is the whole reason the preset exists as more than
      // a projection and a palette.
      rigContract: UNSUNG_SAVIOUR_HUMANOID_RIG,
      // Run once per compass direction: eight sheets of fifteen pieces is the 120-piece rig in
      // units a model actually delivers.
      directions: 'EIGHT_COMPASS',
      spriteTargetSize: '48 × 96 px assembled (2 metres tall at 48 px per metre)',
      jointCapStyle: 'ROUNDED',
      overlapMargin: 'HALF_CAP',
      // The engine's own gear slots, spelled as `character_pool_manager.gd`'s `GEAR_SLOTS` spells
      // them, so a region reserved here and a slot equipped there are the same word. `hand_left,
      // hand_right` stood here until issue #303 and named nothing that game has: `hands` is its
      // glove slot, and the two weapon slots are what a hand holds. The subset is the gear that
      // changes a 2 m figure's silhouette at 48 px per metre — `neck`, `wrist`, the fingers and the
      // trinkets are a pixel or two at that scale. Keeping these areas clear is what makes the art
      // contract's deferred visible equipment (D4) cheap later, and nothing is drawn in them today.
      sockets: 'head, chest, back, hands, weapon_main, weapon_offhand',
    },
  },
  {
    id: 'us-creature-rig',
    name: 'Unsung Saviour — Creature rig',
    description:
      'The same projection, scale and palette discipline, carrying no sockets and no rig contract: enemies do not wear the player’s gear, and a humanoid skeleton is not a quadruped’s. Match the sheet mode to its anatomy first.',
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
