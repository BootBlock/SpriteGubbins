import { describe, expect, it } from 'vitest';
import { componentTargetSize, statesAssembledSize } from './componentTargetSize.ts';

/** The value every shipped cut-out rig preset holds, in the words its author wrote. */
const ASSEMBLED = '48 × 96 px assembled (2 metres tall at 48 px per metre)';

describe('statesAssembledSize', () => {
  it('says so on every sheet whose inventory is a rig', () => {
    // The four categories with a cut-out rig plan, which `rigModes.test.ts` keeps in step with the
    // four that articulate at all.
    for (const category of ['CHARACTER', 'CREATURE', 'OBJECT', 'VEHICLE'] as const) {
      expect(statesAssembledSize(category, 'CUTOUT_RIG_SINGLE_DIRECTION')).toBe(true);
    }
  });

  it('does not read the stored rig field, because that answers a different question', () => {
    // A pose-library sheet may carry `CUTOUT_RIG` legitimately — its pieces do get bound to bones —
    // and it still states a size per unit, as its own shipped presets write it: `32 × 48 px per
    // frame cell`. Keyed on `resolveRigMode` this would have withheld a size that is perfectly
    // usable, on the commonest character configuration there is.
    expect(statesAssembledSize('CHARACTER', 'SINGLE_DIRECTION_POSE_LIBRARY')).toBe(false);
    expect(statesAssembledSize('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS')).toBe(false);
    expect(statesAssembledSize('BUILDING', 'TILESET_MODULAR')).toBe(false);
  });

  it('degrades a rig sheet a category cannot produce, rather than trusting the stored pairing', () => {
    // An ITEM carrying `CUTOUT_RIG_SINGLE_DIRECTION` from an older build draws a directional core,
    // so its components are whole items and the size it states is one of them.
    expect(statesAssembledSize('ITEM', 'CUTOUT_RIG_SINGLE_DIRECTION')).toBe(false);
  });
});

describe('componentTargetSize', () => {
  it('reads the pair out of the prose where the sheet states a component size', () => {
    expect(
      componentTargetSize('CHARACTER', 'SINGLE_DIRECTION_POSE_LIBRARY', '32 × 48 px per frame cell'),
    ).toEqual({
      width: 32,
      height: 48,
    });
  });

  it('withholds the figure on a cut-out rig sheet', () => {
    // The defect this exists for: 48 × 96 is the whole figure, and every one of a rig sheet's
    // fifteen pieces is smaller than it. Handed on as a component size, it made the Sprites panel's
    // comparison one that reads *within the target* at every scale and can therefore never fail,
    // and it priced the atlas calculator's cells for fifteen whole characters.
    expect(componentTargetSize('CHARACTER', 'CUTOUT_RIG_SINGLE_DIRECTION', ASSEMBLED)).toBeNull();
  });

  it('reads the very same words as a component size where the sheet draws whole figures', () => {
    // Which is what makes this a question about the sheet plan rather than about the text — the
    // word "assembled" is the preset author's, and nothing here parses it.
    expect(componentTargetSize('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', ASSEMBLED)).toEqual({
      width: 48,
      height: 96,
    });
  });

  it('answers null for a field with no readable pair in it, as the parse always did', () => {
    expect(componentTargetSize('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', '')).toBeNull();
    expect(
      componentTargetSize('CHARACTER', 'CORE_DIRECTIONAL_VARIANTS', '2 metres tall at 48 px per metre'),
    ).toBeNull();
  });
});
