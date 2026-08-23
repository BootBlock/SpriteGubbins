import { describe, expect, it } from 'vitest';
import { DIRECTION_SETS } from '../types/rendering.ts';
import { componentTargetSize, statedTargetSize, statesAssembledSize } from './componentTargetSize.ts';

/** The value every shipped cut-out rig preset holds, in the words its author wrote. */
const ASSEMBLED = '48 × 96 px assembled (2 metres tall at 48 px per metre)';

describe('statesAssembledSize', () => {
  it('says so on every sheet whose components are the parts of one subject', () => {
    // Not the rig alone, which is only where the two quantities separate hardest. A CHARACTER pose
    // library draws a head, a torso, a pelvis and limb variants; the articulation sheet draws
    // thirty-four limbs; an ITEM part library draws a grip, a shaft and a working end. Every one of
    // those states the subject the parts assemble into, and each category's own presets write it —
    // `32 × 48 px per figure` on a directional core, `32 × 48 px per frame cell` on a pose library,
    // `64 × 64 px per icon cell` on a part library.
    for (const category of ['CHARACTER', 'CREATURE', 'OBJECT', 'VEHICLE', 'ITEM'] as const) {
      for (const mode of [
        'SINGLE_DIRECTION_POSE_LIBRARY',
        'CORE_DIRECTIONAL_VARIANTS',
        'CUTOUT_RIG_SINGLE_DIRECTION',
      ] as const) {
        for (const directions of DIRECTION_SETS) {
          for (const sheetIndex of [0, 1, 2, 3]) {
            expect(statesAssembledSize(category, mode, directions, sheetIndex)).toBe(true);
          }
        }
      }
    }
  });

  it('says the opposite wherever the components are whole deliverable units', () => {
    // A tile, a glyph, an icon cell, a frame and a nine-slice piece are each the thing the reader is
    // pricing, and their presets say so. The nine-slice is the one that reads like a decomposition
    // and is not: what its corners, edges and centre assemble into is a panel at any width and
    // height, so there is no assembled size to state.
    for (const [category, mode] of [
      ['BUILDING', 'TILESET_MODULAR'],
      ['BUILDING', 'SINGLE_DIRECTION_POSE_LIBRARY'],
      ['TERRAIN', 'TILESET_MODULAR'],
      ['INTERFACE', 'TILESET_MODULAR'],
      ['FONT', 'SINGLE_DIRECTION_POSE_LIBRARY'],
      ['ICON', 'SINGLE_DIRECTION_POSE_LIBRARY'],
      ['EFFECT', 'SINGLE_DIRECTION_POSE_LIBRARY'],
      ['PORTRAIT', 'SINGLE_DIRECTION_POSE_LIBRARY'],
      ['BACKGROUND', 'TILESET_MODULAR'],
    ] as const) {
      for (const directions of DIRECTION_SETS) {
        expect(statesAssembledSize(category, mode, directions, 0)).toBe(false);
      }
    }
  });

  it('is the resolved sheet’s answer, not the category’s and not the stored mode’s', () => {
    // One `DirectionalMode` draws parts for a CHARACTER and whole glyphs for a FONT, which is what
    // made the field mean two things. And a stored pairing a category cannot produce is degraded
    // first: a FONT carrying `CUTOUT_RIG_SINGLE_DIRECTION` from an older build is drawn its glyph
    // set, so it states a glyph.
    expect(statesAssembledSize('CHARACTER', 'SINGLE_DIRECTION_POSE_LIBRARY', 'SINGLE_FRONT', 0)).toBe(true);
    expect(statesAssembledSize('FONT', 'SINGLE_DIRECTION_POSE_LIBRARY', 'SINGLE_FRONT', 0)).toBe(false);
    expect(statesAssembledSize('FONT', 'CUTOUT_RIG_SINGLE_DIRECTION', 'SINGLE_FRONT', 0)).toBe(false);
  });

  it('does not read the stored rig field, because that answers a different question', () => {
    // A BUILDING module library may carry `CUTOUT_RIG` legitimately — its pieces do get bound to
    // bones — and it still states a size per module, as its own shipped preset writes it: `96 × 128
    // px per bay`. Keyed on `resolveRigMode` this would have withheld a size that is perfectly
    // usable.
    expect(statesAssembledSize('BUILDING', 'SINGLE_DIRECTION_POSE_LIBRARY', 'SINGLE_FRONT', 0)).toBe(false);
  });
});

describe('componentTargetSize', () => {
  it('reads the pair out of the prose where the sheet states a component size', () => {
    expect(
      componentTargetSize('BUILDING', 'TILESET_MODULAR', 'SINGLE_FRONT', 0, '32 × 32 px per tile'),
    ).toEqual({
      width: 32,
      height: 32,
    });
  });

  it('withholds the figure wherever the sheet draws parts of one subject', () => {
    // The defect this exists for: 48 × 96 is the whole figure, and every one of a rig sheet's
    // fifteen pieces is smaller than it. Handed on as a component size, it made the Sprites panel's
    // comparison one that reads *within the target* at every scale and can therefore never fail,
    // and it priced the atlas calculator's cells for fifteen whole characters. The pose library and
    // the directional core draw parts of one figure too, so the same is true of both.
    for (const mode of [
      'CUTOUT_RIG_SINGLE_DIRECTION',
      'SINGLE_DIRECTION_POSE_LIBRARY',
      'CORE_DIRECTIONAL_VARIANTS',
    ] as const) {
      expect(componentTargetSize('CHARACTER', mode, 'SINGLE_FRONT', 0, ASSEMBLED)).toBeNull();
    }
  });

  it('reads the very same words as a component size where the sheet draws whole units', () => {
    // Which is what makes this a question about the sheet plan rather than about the text — the
    // word "assembled" is the preset author's, and nothing here parses it.
    expect(componentTargetSize('TERRAIN', 'TILESET_MODULAR', 'SINGLE_FRONT', 0, ASSEMBLED)).toEqual({
      width: 48,
      height: 96,
    });
  });

  it('is not the same question as whether a size has been stated', () => {
    // `statesAssembledSize` is the sheet's answer and is right while the field is empty, which is
    // what the studio's label and the prompt's gate need. A caller asserting the reader *has* named
    // an assembly needs the field's answer, or it describes a size that is not there — which is what
    // put "Not a component size" over an empty box in the atlas panel.
    expect(statesAssembledSize('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 'SINGLE_FRONT', 0)).toBe(true);
    expect(statedTargetSize('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 'SINGLE_FRONT', 0, '')).toBeNull();
  });

  it('carries the quantity beside the size, for the readers that can use an assembly', () => {
    expect(
      statedTargetSize('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', 'SINGLE_FRONT', 0, ASSEMBLED),
    ).toEqual({
      quantity: 'ASSEMBLED',
      size: { width: 48, height: 96 },
    });
    expect(statedTargetSize('BUILDING', 'TILESET_MODULAR', 'SINGLE_FRONT', 0, '32 × 32 px per tile')).toEqual(
      {
        quantity: 'COMPONENT',
        size: { width: 32, height: 32 },
      },
    );
  });

  it('answers null for a field with no readable pair in it, as the parse always did', () => {
    expect(componentTargetSize('TERRAIN', 'TILESET_MODULAR', 'SINGLE_FRONT', 0, '')).toBeNull();
    expect(
      componentTargetSize(
        'TERRAIN',
        'TILESET_MODULAR',
        'SINGLE_FRONT',
        0,
        '2 metres tall at 48 px per metre',
      ),
    ).toBeNull();
  });
});
