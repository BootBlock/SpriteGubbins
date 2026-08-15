import { describe, expect, it } from 'vitest';
import { PROJECTIONS } from '../../types/rendering.ts';
import { DEFAULT_CAMERA_ELEVATIONS, PROJECTION_TEXT } from './camera.ts';
import {
  cameraElevationRange,
  isPlanView,
  PLAN_VIEW_ELEVATION,
  resolveCameraElevation,
} from './elevation.ts';

/**
 * One camera, described twice — and the range is what stops the two descriptions disagreeing.
 *
 * Section 3 prints the projection's own sentence and the elevation as adjacent lines, so a free
 * number beside a projection that names its own camera produced prompts like `Directly overhead.
 * Only the top of forms is visible` above `Camera elevation: 0° above the horizon`. Both are
 * statements about where one camera stands.
 */
describe('the elevations a projection allows', () => {
  it('leaves the angled-overhead projection a span and pins every other one', () => {
    // The division is what each projection's own description claims rather than a preference: only
    // "angled overhead — both the top *and* the camera-facing vertical surfaces are visible" is
    // satisfied by a range of elevations. Directly overhead is 90°, an axonometric projection is
    // defined by the angle it is drawn at, and a flat elevation has none.
    for (const projection of PROJECTIONS) {
      const { min, max } = cameraElevationRange(projection);
      const pinned = min === max;

      expect(pinned, `${projection}: ${PROJECTION_TEXT[projection]}`).toBe(
        projection !== 'THREE_QUARTER_TOPDOWN',
      );
    }
  });

  it('pins each projection to the elevation the app already writes down for it', () => {
    // Read back off `DEFAULT_CAMERA_ELEVATIONS` rather than restated, so the figure a chosen
    // projection writes into the configuration is by construction one the range accepts — otherwise
    // choosing a projection would leave the field holding a number it refuses.
    for (const projection of PROJECTIONS) {
      const { min, max } = cameraElevationRange(projection);
      const preset = DEFAULT_CAMERA_ELEVATIONS[projection];

      expect(preset, projection).toBeGreaterThanOrEqual(min);
      expect(preset, projection).toBeLessThanOrEqual(max);
      if (projection !== 'THREE_QUARTER_TOPDOWN') expect(min, projection).toBe(preset);
    }
  });

  it('keeps the open range strictly between the two extremes', () => {
    // At 0° the top of a form is invisible and at 90° its vertical surfaces are, so either endpoint
    // falsifies the sentence this projection carries — and 90° would additionally hand the sheet a
    // plan view under a projection that says it is not one.
    const { min, max } = cameraElevationRange('THREE_QUARTER_TOPDOWN');

    expect(min).toBeGreaterThan(0);
    expect(max).toBeLessThan(PLAN_VIEW_ELEVATION);
  });

  it('degrades a stored elevation the projection cannot be drawn at', () => {
    // The same resolution `resolveMode` and `resolveDirectionSet` perform: a configuration saved
    // before the range existed, or hand-edited, must describe a camera the prompt actually carries.
    expect(resolveCameraElevation('PURE_TOPDOWN', 0)).toBe(90);
    expect(resolveCameraElevation('ORTHOGRAPHIC_SIDE', 90)).toBe(0);
    expect(resolveCameraElevation('THREE_QUARTER_TOPDOWN', 90)).toBe(89);
    expect(resolveCameraElevation('THREE_QUARTER_TOPDOWN', 0)).toBe(1);
  });

  it('keeps an elevation the projection does allow', () => {
    expect(resolveCameraElevation('THREE_QUARTER_TOPDOWN', 35)).toBe(35);
    expect(resolveCameraElevation('DIMETRIC_2_1', 30)).toBe(30);
  });

  it('answers with the low bound for a figure that is not a number at all', () => {
    // `NaN` fails every comparison, so a clamp written with `Math.min`/`Math.max` alone returns it
    // unchanged — and `NaN°` in section 3 is a camera the reader cannot stand at.
    expect(resolveCameraElevation('THREE_QUARTER_TOPDOWN', Number.NaN)).toBe(1);
  });

  it('calls only the vertical a plan view', () => {
    expect(isPlanView(90)).toBe(true);
    expect(isPlanView(89)).toBe(false);
    expect(isPlanView(0)).toBe(false);
  });

  it('is reachable from exactly one projection', () => {
    // The two halves of this fix meet here: the occlusion register turns on the elevation, and the
    // ranges above are what decide which elevations a user can reach. A second projection whose
    // range included the vertical would be a second way into the plan-view contract, and a
    // THREE_QUARTER_TOPDOWN that reached 90° would hand it to a projection whose own sentence says
    // the vertical surfaces are visible.
    const overhead = PROJECTIONS.filter((projection) => isPlanView(cameraElevationRange(projection).max));

    expect(overhead).toStrictEqual(['PURE_TOPDOWN']);
  });
});
