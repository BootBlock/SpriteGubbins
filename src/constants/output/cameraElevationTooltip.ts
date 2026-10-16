import { cameraElevationRange } from '../promptText/elevation.ts';

const ANGLED = cameraElevationRange('THREE_QUARTER_TOPDOWN');
const OVERHEAD = cameraElevationRange('PURE_TOPDOWN');

/**
 * The Camera Elevation card, with every figure it states read from the range the field obeys.
 *
 * The card once said "At 90° the prompt also changes what it asks of each facing" under
 * `THREE_QUARTER_TOPDOWN`, a projection whose range stops short of 90° (issue #456): the only
 * projection that reaches it is `PURE_TOPDOWN`, which fixes it there. Reading the bounds from
 * `cameraElevationRange` keeps the card true when a range moves.
 */
export const CAMERA_ELEVATION_TOOLTIP =
  'Degrees above the horizon, from 0 at eye level to 90 directly overhead. The projection above sets it, and for every projection but `THREE_QUARTER_TOPDOWN` it is the only elevation that projection can be drawn at.\n\n' +
  `Under \`THREE_QUARTER_TOPDOWN\` it is yours to set, from ${String(ANGLED.min)}° to ${String(ANGLED.max)}°: raising it shows more of the floor plane and foreshortens the figure’s height.\n\n` +
  `\`PURE_TOPDOWN\` fixes it at ${String(OVERHEAD.min)}°, and there the prompt also changes what it asks of each facing, because a turn seen from directly overhead hides nothing.`;
