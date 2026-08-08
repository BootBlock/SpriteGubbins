import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/camera.ts';
import { PRACTICAL_COMPONENT_CEILING } from '../promptText/inventory.ts';
import type { OutputConfig } from '../../types/output.ts';

/**
 * The configuration the studio opens on.
 *
 * Every field is set, because `OutputConfig` has no optional members: a field that could be absent
 * would push `?? fallback` handling into the compiler, and "unset" is already expressible as an
 * empty string for the three free-text fields.
 *
 * A pose library in modern pixel art at a three-quarter overhead angle — the most common thing this
 * app is used for, and the configuration the first built-in preset shares.
 */
export const DEFAULT_OUTPUT_CONFIG: OutputConfig = {
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
  // silence. It sits exactly at the default mode's own count, so the warning is quiet until
  // something — additional anatomy, usually — actually pushes the sheet past what one generation
  // delivers. A user whose target model does better sets their own number, or zero for no cap.
  componentBudget: PRACTICAL_COMPONENT_CEILING,

  // No machine and no pinned palette. Both are opt-in by nature: they are the answer to "draw this
  // the way a Game Boy could", which is a question most sheets are not asking, and either one
  // defaulted to a machine would put a hardware contract into every prompt the app composes.
  hardwareProfile: 'NONE',
  palette: 'FREE',

  renderStyle: 'PIXEL_ART',
  projection: 'THREE_QUARTER_TOPDOWN',
  cameraElevation: DEFAULT_CAMERA_ELEVATIONS.THREE_QUARTER_TOPDOWN,
  directions: 'THREE_CLASSIC',
  // The set's own first facing. Pinning one here would be a facing to keep in step with every
  // change of direction set, for no gain — "the first" is what the studio means until a split run
  // says otherwise.
  primaryDirection: null,
  backgroundKey: 'MAGENTA_FF00FF',
  spriteTargetSize: '',

  rigMode: 'POSE_LIBRARY',
  jointCapStyle: 'ROUNDED',
  overlapMargin: 'HALF_CAP',
  sockets: '',

  identityLock: '',
  emitManifest: false,
  // Off, like the manifest: it adds a section to every prompt and asks for a second deliverable, and
  // a user who has not asked for a critique of their own prompt should not have to read one.
  emitPromptFeedback: false,
};
