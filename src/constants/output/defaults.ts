import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/camera.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../promptText/inventory.ts';
import type { ImageOutputConfig, OutputConfig } from '../../types/output.ts';

/**
 * The image the studio opens on, and the base every built-in preset is written against.
 *
 * Every field is set, because `ImageOutputConfig` has no optional members: a field that could be
 * absent would push `?? fallback` handling into the compiler, and "unset" is already expressible as
 * an empty string for the three free-text fields.
 *
 * A pose library in modern pixel art at a three-quarter overhead angle — the most common thing this
 * app is used for, and the configuration the first built-in preset shares.
 */
export const DEFAULT_IMAGE_CONFIG: ImageOutputConfig = {
  directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
  surfaceDetail: 'CLEAN_PRODUCTION',
  resolutionProfile: 'HIGH_RESOLUTION',
  paletteLimit: 'RESTRAINED_64_COLOR',
  outlineStyle: 'DARK_LOCAL_CONTOUR',
  lightingModel: 'FLAT_NEUTRAL_ALBEDO',
  aspectRatio: 'WIDE_16_9',
  targetModel: 'CHATGPT_5_6_SOL',
  // The practical ceiling rather than no cap, because the ceiling is a real property of current
  // models and a studio that never mentions it lets the user compose an unsatisfiable sheet in
  // silence. It is the ceiling itself rather than the default mode's own count: those coincided while
  // that mode was one forty-three-component sheet, and a series is deliberately below it on every
  // sheet — a budget re-derived to sit tight against the largest of them would fire on a sheet that
  // is comfortably within what one generation delivers. A user whose target model does better sets
  // their own number, or zero for no cap.
  componentBudget: PRACTICAL_COMPONENT_CEILING,

  // No machine and no pinned palette. Both are opt-in by nature: they are the answer to "draw this
  // the way a Game Boy could", which is a question most sheets are not asking, and either one
  // defaulted to a machine would put a hardware contract into every prompt the app composes.
  hardwareProfile: 'NONE',
  palette: 'FREE',

  // No reference either, on the same argument: a sheet drawn to match a published game is a specific
  // request, and defaulting to one would put another game's measurements into every prompt. The
  // naming switch is off beneath it and stays off — it is inert with no reference to name, and a
  // reader who does turn it on is asking for a title several targets refuse outright, which is not a
  // thing to be opted into by a default nobody chose.
  styleReference: 'NONE',
  nameStyleReference: false,

  renderStyle: 'PIXEL_ART',
  projection: 'THREE_QUARTER_TOPDOWN',
  cameraElevation: DEFAULT_CAMERA_ELEVATIONS.THREE_QUARTER_TOPDOWN,
  // Five views is the app's standard deliverable: the chosen set steers the directional core now,
  // and FIVE_CLASSIC is the smallest set whose drawn views reach both the facing a player looks at
  // most and the one directly away. THREE_CLASSIC here would silently open the studio on a core
  // that can face the camera only by engine-mirroring — the defect the five-view core was built to
  // remove.
  directions: 'FIVE_CLASSIC',
  // The set's own first facing. Pinning one here would be a facing to keep in step with every
  // change of direction set, for no gain — "the first" is what the studio means until a split run
  // says otherwise.
  primaryDirection: null,
  // The first sheet of whatever series the pairing turns out to be, which is the only index every
  // pairing has. A studio that opened on sheet two of a two-sheet series would be showing the limbs
  // of a character whose trunk had not been drawn yet.
  sheetIndex: 0,
  backgroundKey: 'MAGENTA_FF00FF',
  spriteTargetSize: '',

  rigMode: 'POSE_LIBRARY',
  jointCapStyle: 'ROUNDED',
  overlapMargin: 'HALF_CAP',
  sockets: '',

  identityLock: '',
};

/**
 * The configuration the studio opens on: {@link DEFAULT_IMAGE_CONFIG} plus the two companion
 * deliverables, both off.
 *
 * Written as an extension rather than as a second full literal, so each default value is still
 * stated exactly once — the split here mirrors the one in `OutputConfig` and adds no second place
 * to keep in step.
 *
 * Both companions start off because each adds a section to the prompt and asks the target for a
 * second deliverable, and a user who has not asked for a component map — or for a critique of their
 * own prompt — should not have to read one. They stay wherever the user leaves them: a preset cannot
 * move them, and neither can this constant once the studio is open.
 */
export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
  ...DEFAULT_IMAGE_CONFIG,
  emitComponentMap: false,
  emitPromptFeedback: false,
};
