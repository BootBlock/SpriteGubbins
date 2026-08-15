import type { StyleReference, StyleReferenceId } from '../../types/styleReference.ts';

/**
 * The two references drawn onto a projected ground grid, both pre-rendered from 3D.
 *
 * **They share a projection and are distinguished by their facings**, and the second half is widely
 * got wrong. Both lay their ground out as a 2:1 diamond — a tile edge running two pixels sideways
 * for every one down, which is 26.57° on screen and a camera 30° above the horizon — and that is
 * `DIMETRIC_2_1`, not `TRUE_ISOMETRIC`. Both games are routinely called isometric and neither is:
 * measured alike on all three axes the ground would come out at 1.73:1, and a 160 × 80 or 97 × 49
 * tile would not tessellate. Where they genuinely differ from each other is how many views exist:
 * one renders every facing from its own camera position, and the other draws five and flips three of
 * them. **That difference is carried by each preset's direction set and by its card**, not by the
 * characteristics below, which never speak about facings — see `StyleReference.characteristics` for
 * why.
 *
 * Both take a baked key light. Neither publishes the angle it was rendered from, so the setting is
 * the app's own fixed-key convention rather than a measurement, and neither characteristic list
 * states a direction.
 */

const DIABLO_II: StyleReference = {
  id: 'DIABLO_II',
  name: 'Diablo II',
  label: 'Diablo II — 2:1 diamond, pre-rendered',
  characteristics: [
    'A floor tile spans 160 × 80 pixels, so a tile edge runs two pixels sideways for every one it drops.',
    'The display is 640 × 480 in 256 colours, raised to 800 × 600 by the expansion. The art is drawn at actual size, so a larger screen shows more ground rather than larger figures.',
    'Each view is rendered from its own camera position around a scene whose light does not move, so the lit side of a figure changes as it turns.',
    'A character is not one image: the body, the armour, the helm and each weapon are rendered separately and layered as the figure is drawn, so the pieces have to stay separable.',
  ],
  settings: {
    renderStyle: 'RENDERED_3D',
    surfaceDetail: 'DETAILED_PRODUCTION',
    // No figure size, and its absence is a property of the format rather than a gap in the record:
    // every frame carries its own width, height and anchor, so there is no one dimension to state.
    resolutionProfile: 'MID_RESOLUTION',
    spriteTargetSize: '',
    // A rendered figure has no drawn contour — what reads as an outline is the render's own shading
    // falling away at the silhouette.
    outlineStyle: 'OUTLINE_LESS_ALBEDO',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    projection: 'DIMETRIC_2_1',
    cameraElevation: 30,
    hardwareProfile: 'NONE',
    palette: 'FREE',
    paletteLimit: 'EXPANDED_ALBEDO',
  },
};

const AGE_OF_EMPIRES_II: StyleReference = {
  id: 'AGE_OF_EMPIRES_II',
  name: 'Age of Empires II',
  label: 'Age of Empires II — 2:1 diamond, 5 facings',
  characteristics: [
    'A terrain tile spans 97 pixels across and 49 rows down, its edge advancing two pixels sideways for every row it drops.',
    'Every pixel is an index into a single 256-colour palette, and each player’s colours occupy a reserved block of it that is substituted as the unit is drawn.',
    'Silhouettes are hard-edged: a pixel is either drawn or not, with no partial transparency and no softening against the background.',
    'Units are small, roughly 20 to 100 pixels in each direction, while buildings are drawn far larger.',
  ],
  settings: {
    renderStyle: 'RENDERED_3D',
    surfaceDetail: 'CLEAN_PRODUCTION',
    // Absent for the same reason as above: each frame stores its own dimensions and anchor.
    resolutionProfile: 'MID_RESOLUTION',
    spriteTargetSize: '',
    outlineStyle: 'OUTLINE_LESS_ALBEDO',
    lightingModel: 'ISOMETRIC_TOP_LEFT',
    projection: 'DIMETRIC_2_1',
    cameraElevation: 30,
    hardwareProfile: 'NONE',
    palette: 'FREE',
    paletteLimit: 'EXPANDED_ALBEDO',
  },
};

export const PROJECTED_STYLE_REFERENCES: Readonly<
  Record<Extract<StyleReferenceId, 'DIABLO_II' | 'AGE_OF_EMPIRES_II'>, StyleReference>
> = {
  DIABLO_II,
  AGE_OF_EMPIRES_II,
};
