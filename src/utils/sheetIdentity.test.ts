import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { sheetIdentity } from './sheetIdentity.ts';

/**
 * What a downloaded manifest says the sheet is.
 *
 * The two halves are pinned separately — `componentSlots.test.ts` for the names, `sheetBatch.test.ts`
 * for the batch — and what can only be checked here is that they are read off the *same* sheet: a
 * manifest whose names came from one position in the batch and whose ordinal came from another would
 * be wrong in a way nothing on screen shows.
 */

const config = (overrides: Partial<OutputConfig> = {}): OutputConfig => ({
  ...DEFAULT_OUTPUT_CONFIG,
  ...overrides,
});

describe('sheetIdentity', () => {
  it('names the sheet the studio is composing, and its place in the batch', () => {
    const { sheet } = sheetIdentity('CHARACTER', config({ directions: 'EIGHT_COMPASS', sheetIndex: 0 }), '');

    expect(sheet).toMatchObject({
      category: 'CHARACTER',
      plan: 'Directional core — cardinal facings',
      ordinal: 1,
      // Two core sheets and one articulation run per facing: the eight-compass character is the
      // batch this whole feature is measured against.
      total: 10,
      components: 12,
    });
    expect(sheet?.facings).toStrictEqual(['south', 'west', 'north', 'east']);
  });

  it('gives one name per component, in the inventory’s own order', () => {
    const { names, sheet } = sheetIdentity(
      'CHARACTER',
      config({ directions: 'EIGHT_COMPASS', sheetIndex: 0 }),
      '',
    );

    // The property a manifest's naming rests on: as many names as the prompt asked for components.
    expect(names).toHaveLength(sheet?.components ?? -1);
    expect(names.slice(0, 2)).toStrictEqual(['heads-south', 'heads-west']);
  });

  it('follows the studio to the next sheet of the batch', () => {
    const { names, sheet } = sheetIdentity(
      'CHARACTER',
      config({ directions: 'EIGHT_COMPASS', sheetIndex: 1 }),
      '',
    );

    expect(sheet).toMatchObject({ ordinal: 2, components: 12 });
    // The diagonal half of the core, which is the sheet the studio is now on.
    expect(names.slice(0, 1)).toStrictEqual(['heads-south-west']);
  });

  it('records the rig the sheet itself demands, not the field beside it', () => {
    // A rig-pieces sheet fixes its own rig, and it is the sheet whose bottom-centre pivots are all
    // the wrong end — so the manifest has to say `CUTOUT_RIG` here however `rigMode` was stored.
    const { sheet } = sheetIdentity(
      'CHARACTER',
      config({ directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION', rigMode: 'POSE_LIBRARY' }),
      '',
    );

    expect(sheet?.rigMode).toBe('CUTOUT_RIG');
  });

  it('degrades a rig the category cannot honour, as every other digest does', () => {
    // A stored pairing from an older build, a preset or a hand-edited export: TERRAIN articulates
    // about nothing, so a manifest claiming a rig for it would be a claim the prompt never made.
    const { sheet } = sheetIdentity('TERRAIN', config({ rigMode: 'CUTOUT_RIG' }), '');

    expect(sheet?.rigMode).toBe('NONE');
  });

  it('counts the subject’s own anatomy, which the sheet contracts for too', () => {
    const { names, sheet } = sheetIdentity(
      'CREATURE',
      config({ directions: 'FOUR_CARDINAL', sheetIndex: 0 }),
      'Tail ×1',
    );

    expect(names).toContain('tail-south');
    expect(names).toHaveLength(sheet?.components ?? -1);
  });
});
