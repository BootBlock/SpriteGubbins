import type { Projection } from '../../types/rendering.ts';
import { DEFAULT_CAMERA_ELEVATIONS } from './camera.ts';

/**
 * Where the camera is allowed to stand, and the one elevation at which turning the subject stops
 * hiding anything.
 *
 * Section 3 states the camera twice — a named projection and a number of degrees — and for a long
 * time the two were independent controls over one camera, so they could disagree outright:
 * `Projection: Directly overhead. Only the top of forms is visible` sat one line above
 * `Camera elevation: 0° above the horizon`, and `Flat side elevation, no perspective` above `90°`.
 * Both are statements about where one camera stands, and a generator resolves the contradiction
 * however it likes.
 */

/**
 * The elevations each projection's own description leaves open.
 *
 * Derived from what `PROJECTION_TEXT` claims rather than chosen: "angled overhead — both the
 * top **and** the camera-facing vertical surfaces of forms are visible" is true of every elevation
 * strictly between the horizon and the vertical and of neither extreme, so that projection carries a
 * range. Every other option **is** a camera geometry: directly overhead is 90° and nothing else, a
 * flat elevation has no elevation to speak of, and an axonometric projection is defined by the angle
 * it is drawn at — asking for an isometric at 40° is asking for a projection that is not isometric.
 * Those take the elevation the projection already implies, which is the one
 * {@link DEFAULT_CAMERA_ELEVATIONS} writes down, so the two cannot drift apart.
 *
 * A user who wants an angled-overhead camera at some other elevation has somewhere to go — that is
 * what the one open projection is for — so nothing reachable is lost by pinning the rest.
 */
export function cameraElevationRange(projection: Projection): { readonly min: number; readonly max: number } {
  if (projection === 'THREE_QUARTER_TOPDOWN') return { min: 1, max: 89 };
  const fixed = DEFAULT_CAMERA_ELEVATIONS[projection];
  return { min: fixed, max: fixed };
}

/**
 * The elevation this projection can actually be drawn at, given the one a configuration is holding.
 *
 * The same resolution `resolveMode` and `resolveDirectionSet` perform, applied to the camera: a
 * stored configuration can name a pairing the projection cannot honour — one saved before the range
 * existed, or a hand-edited export — and the compiler, the studio's own field and the collapsed
 * digest all read the resolved answer, so no part of the app describes a camera the prompt does not.
 */
export function resolveCameraElevation(projection: Projection, cameraElevation: number): number {
  const { min, max } = cameraElevationRange(projection);
  if (!Number.isFinite(cameraElevation)) return min;
  return Math.min(Math.max(cameraElevation, min), max);
}

/** Straight up. Above the horizon, in degrees. */
export const PLAN_VIEW_ELEVATION = 90;

/**
 * Whether the camera is directly overhead, where object yaw hides and reveals nothing.
 *
 * This is the whole of the elevation's effect on section 3's occlusion contract, and the threshold
 * is exact rather than chosen. At any elevation below the vertical the camera keeps a horizontal
 * component, so which vertical surfaces of a convex form are visible is decided by the yaw alone and
 * decided the same way it is at eye level: the front view presents the front and hides the rear
 * whatever the elevation does to how much of each is left on screen. At the vertical that component
 * is gone. The same top surface faces the camera at every yaw, the views differ by an in-plane
 * rotation and nothing else, and the prompt's "the front is fully presented … no part of the rear is
 * visible" describes a difference the stated camera cannot produce — which section 9 then audits for
 * and fails the sheet over.
 */
export function isPlanView(cameraElevation: number): boolean {
  return cameraElevation >= PLAN_VIEW_ELEVATION;
}
