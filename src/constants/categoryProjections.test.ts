import { describe, expect, it } from 'vitest';
import { PROJECTIONS } from '../types/rendering.ts';
import { SUBJECT_CATEGORIES } from '../types/subject.ts';
import { CATEGORY_PROJECTIONS, resolveProjection, supportsProjection } from './categoryProjections.ts';
import { projectionChoices } from './output/projectionChoices.ts';
import { PRESETS } from './presets/index.ts';
import { DEFAULT_CAMERA_ELEVATIONS, resolveCameraElevation } from './promptText/index.ts';

/**
 * Which camera each category's subject can be drawn under.
 *
 * The defect: three of the four output settings a category can refuse were narrowed on a category
 * change and the projection was not, so an INTERFACE arriving from a default session still held
 * `THREE_QUARTER_TOPDOWN`. Section 3 asked for a 35° overhead camera over an inventory of button
 * states — a prompt disagreeing with itself, where the direction set's version of the same gap was
 * merely degenerate.
 *
 * What these pin is the property rather than the example — a category may only be offered a camera
 * its subject can honestly be drawn under, and a stored projection outside that must degrade rather
 * than compile.
 */
describe('the table itself', () => {
  it.each(SUBJECT_CATEGORIES)('%s offers at least one camera', (category) => {
    // A category with an empty list would leave `resolveProjection` with no fallback to name and the
    // studio's select with no option to render.
    expect(CATEGORY_PROJECTIONS[category].length).toBeGreaterThan(0);
    expect(projectionChoices(category).length).toBeGreaterThan(0);
  });

  it('binds exactly the one category whose subject is composited rather than photographed', () => {
    // An interface widget is screen-space art: no top for `PURE_TOPDOWN` to show, no ground plane
    // for the axonometric cameras to lay out, no thickness for `OBLIQUE_45` to project. The
    // interesting half of the decision is who is left out, which is what makes naming the bound set
    // worth more than deriving it.
    const bound = SUBJECT_CATEGORIES.filter(
      (category) => CATEGORY_PROJECTIONS[category].length < PROJECTIONS.length,
    );
    expect(bound).toEqual(['INTERFACE']);
    expect(CATEGORY_PROJECTIONS.INTERFACE).toEqual(['ORTHOGRAPHIC_FRONT']);
  });

  it('leaves TERRAIN every camera, because a cliff face is a landform seen from the side', () => {
    // The category this table must *not* bind, and the one that looks bound:
    // `CATEGORY_DIRECTION_SETS` pins TERRAIN to `SINGLE_FRONT` because a tile has no front to turn
    // away from, and the facings and the camera are separate questions. `LANDMARK_TEXT.TERRAIN` says
    // a tile is read from above and then says a landform piece's front is “the exposed face the
    // camera sees, the rock wall, the cut bank” — and `side-on-volcanic-cliff` is that sheet,
    // shipped at `ORTHOGRAPHIC_SIDE`.
    expect(CATEGORY_PROJECTIONS.TERRAIN).toEqual(PROJECTIONS);
    expect(supportsProjection('TERRAIN', 'ORTHOGRAPHIC_SIDE')).toBe(true);
  });

  it('leaves EFFECT every camera, because an effect matches the world it plays over', () => {
    // The same argument `CATEGORY_DIRECTION_SETS` makes about this category, one axis over — and the
    // library is where it stops being an assertion: the eight shipped effect presets stand at six of
    // the seven cameras on purpose, which is the count the table's docblock states.
    expect(CATEGORY_PROJECTIONS.EFFECT).toEqual(PROJECTIONS);

    const effects = PRESETS.filter((preset) => preset.category === 'EFFECT');
    expect(effects).toHaveLength(8);
    expect(new Set(effects.map((preset) => preset.output.projection)).size).toBe(6);
  });

  it('leaves no projection of the union unreachable', () => {
    // A camera nothing can select would be dead weight in stored data, in `configParsers`'
    // validation and in the tooltip that explains when to choose it.
    for (const projection of PROJECTIONS) {
      const owners = SUBJECT_CATEGORIES.filter((category) => supportsProjection(category, projection));
      expect(owners.length, `${projection} belongs to no category`).toBeGreaterThan(0);
    }
  });

  it('offers every shipped preset the camera it was written with', () => {
    // The table and the library have to agree, and this is the assertion that would have caught a
    // TERRAIN bound to the overhead cameras: `side-on-volcanic-cliff` would have compiled at
    // `PURE_TOPDOWN`, silently deleting the one preset in the library that draws an exposed face.
    for (const preset of PRESETS) {
      expect(
        supportsProjection(preset.category, preset.output.projection),
        `${preset.id} (${preset.category}) is written at ${preset.output.projection}`,
      ).toBe(true);
    }
  });
});

describe('resolveProjection', () => {
  it('keeps a camera the subject can be drawn under', () => {
    // Eight of the nine categories are offered every one, so for those this is every case.
    expect(resolveProjection('CHARACTER', 'TRUE_ISOMETRIC')).toBe('TRUE_ISOMETRIC');
    expect(resolveProjection('TERRAIN', 'ORTHOGRAPHIC_SIDE')).toBe('ORTHOGRAPHIC_SIDE');
    expect(resolveProjection('INTERFACE', 'ORTHOGRAPHIC_FRONT')).toBe('ORTHOGRAPHIC_FRONT');
  });

  it('degrades a stored camera the subject has no geometry for', () => {
    // A preset written before this table existed, a history row from an older build, an art style
    // reference applied under this category, or a hand-edited export can all carry one.
    expect(resolveProjection('INTERFACE', 'THREE_QUARTER_TOPDOWN')).toBe('ORTHOGRAPHIC_FRONT');
    expect(resolveProjection('INTERFACE', 'DIMETRIC_2_1')).toBe('ORTHOGRAPHIC_FRONT');
  });

  it('always answers with a camera the category actually offers', () => {
    // The property the compiler, the digest and the studio's select all rely on: whatever arrives,
    // what comes back is selectable and drawable.
    for (const category of SUBJECT_CATEGORIES) {
      for (const projection of PROJECTIONS) {
        expect(supportsProjection(category, resolveProjection(category, projection))).toBe(true);
      }
    }
  });

  it('carries the camera elevation with it, so section 3’s two lines stay one statement', () => {
    // The elevation is resolved against the *projection*, never against the category, so this table
    // is the whole of the category's reach into it. A 35° held over from the default camera has to
    // land on the flat front elevation's 0°, not stay where it was.
    const degraded = resolveProjection('INTERFACE', 'THREE_QUARTER_TOPDOWN');
    expect(resolveCameraElevation(degraded, 35)).toBe(DEFAULT_CAMERA_ELEVATIONS.ORTHOGRAPHIC_FRONT);
  });
});

describe('projectionChoices', () => {
  it('offers a category only what it can be drawn under', () => {
    expect(projectionChoices('INTERFACE').map((choice) => choice.value)).toEqual(['ORTHOGRAPHIC_FRONT']);
    expect(projectionChoices('TERRAIN')).toHaveLength(PROJECTIONS.length);
    expect(projectionChoices('CHARACTER')).toHaveLength(PROJECTIONS.length);
  });

  it('lists them in the union’s own order, which is also the table’s', () => {
    // Unlike the direction sets, there is no second ordering to reconcile: the union leads with the
    // studio's opening camera, which is both the label list's first entry and the fallback.
    expect(projectionChoices('CHARACTER').map((choice) => choice.value)).toEqual([...PROJECTIONS]);
    expect(CATEGORY_PROJECTIONS.CHARACTER[0]).toBe('THREE_QUARTER_TOPDOWN');
  });
});
