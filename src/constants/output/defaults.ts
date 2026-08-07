import { DEFAULT_CAMERA_ELEVATIONS } from '../promptText/camera.ts';
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

  renderStyle: 'PIXEL_ART',
  projection: 'THREE_QUARTER_TOPDOWN',
  cameraElevation: DEFAULT_CAMERA_ELEVATIONS.THREE_QUARTER_TOPDOWN,
  directions: 'THREE_CLASSIC',
  backgroundKey: 'MAGENTA_FF00FF',
  spriteTargetSize: '',

  rigMode: 'POSE_LIBRARY',
  jointCapStyle: 'ROUNDED',
  overlapMargin: 'HALF_CAP',
  sockets: '',

  identityLock: '',
  emitManifest: false,
};
