import { describe, expect, it } from 'vitest';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { sheetPlanFor } from '../constants/sheetPlans/index.ts';
import { standardSubject } from '../test/sheetSubject.ts';
import type { OutputConfig } from '../types/output.ts';
import type { RigContract } from '../types/rigContract.ts';
import { sheetSizing } from './sheetSizing.ts';

/**
 * The one answer section 2 prints and the native grid is priced from.
 *
 * What is pinned here is that the words and the parse never come apart: a prompt whose text names
 * one figure while its arithmetic seats another is a sheet nobody can satisfy, and each half would
 * be internally consistent, so nothing downstream could see it.
 */

const CONTRACT: RigContract = {
  format: 'unsung-saviour-rig-contract',
  version: 1,
  skeleton_name: 'Humanoid',
  frame_size: { width: 48, height: 96 },
  slots: [
    {
      slot_id: 'pelvis',
      pack_piece_name: 'pelvis',
      parent_slot: '',
      piece_size: { width: 20, height: 12 },
      piece_pivot: { x: 10, y: 6 },
      joint_edge: 'bottom',
      rest_position_in_frame: { x: 0, y: -48 },
    },
  ],
};

const SUBJECT = standardSubject();

/** A rig sheet under `CUSTOM`, the one profile that reads a typed size. */
function output(over: Partial<OutputConfig> = {}): OutputConfig {
  return {
    ...DEFAULT_OUTPUT_CONFIG,
    directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
    resolutionProfile: 'CUSTOM',
    ...over,
  };
}

function rigPlan(config: OutputConfig) {
  return sheetPlanFor('CHARACTER', SUBJECT, config.directionalMode, config.directions, config.sheetIndex);
}

describe('sheetSizing', () => {
  it('reads the reader’s own prose where no rig applies', () => {
    // The raw field rather than the parse, which is narrower: `48 × 96 px assembled (2 metres tall
    // at 48 px per metre)` states a scale the pair alone cannot carry.
    const config = output({ spriteTargetSize: '48 × 96 px assembled (2 metres at 48 px per metre)' });
    const answer = sheetSizing('CHARACTER', SUBJECT, config, rigPlan(config), null, 3);

    expect(answer.text).toBe('48 × 96 px assembled (2 metres at 48 px per metre)');
    expect(answer.stated?.size).toEqual({ width: 48, height: 96 });
  });

  it('states no size under a profile that states a scale of its own', () => {
    // Issue #405: a share of the cell or a retro height printed one line above a pixel size was two
    // scales for one sheet. The typed words stay in the store, and nothing reads them.
    for (const resolutionProfile of ['HIGH_RESOLUTION', 'MID_RESOLUTION', 'RETRO_16_BIT'] as const) {
      const config = output({ resolutionProfile, spriteTargetSize: '16 × 16 px per tile' });
      const answer = sheetSizing('CHARACTER', SUBJECT, config, rigPlan(config), null, 3);

      expect(answer.profile, resolutionProfile).toBe(resolutionProfile);
      expect(answer.text, resolutionProfile).toBe('');
      expect(answer.stated, resolutionProfile).toBeNull();
      expect(answer.nativeScale, resolutionProfile).toBeNull();
    }
  });

  it('resolves the profile to CUSTOM wherever a rig applies, since the rig states the size', () => {
    const config = output({ resolutionProfile: 'HIGH_RESOLUTION' });
    const answer = sheetSizing('CHARACTER', SUBJECT, config, rigPlan(config), CONTRACT, 3);

    expect(answer.profile).toBe('CUSTOM');
    expect(answer.text).toBe('48 × 96 px');
    expect(sheetSizing('CHARACTER', SUBJECT, config, rigPlan(config), null, 3).profile).toBe(
      'HIGH_RESOLUTION',
    );
  });

  it('takes the frame from the rig, over whatever was typed', () => {
    const config = output({ spriteTargetSize: '64 × 128 px assembled' });
    const answer = sheetSizing('CHARACTER', SUBJECT, config, rigPlan(config), CONTRACT, 3);

    expect(answer.text).toBe('48 × 96 px');
    expect(answer.stated?.size).toEqual({ width: 48, height: 96 });
  });

  it('does not repeat the word section 2’s own label already carries', () => {
    // The line reads “Target assembled size, for the complete subject once its pieces are put
    // together: …”, so a value ending in “assembled” says it twice.
    const config = output();
    const answer = sheetSizing('CHARACTER', SUBJECT, config, rigPlan(config), CONTRACT, 3);

    expect(answer.text).not.toContain('assembled');
  });

  it('states the quantity the plan declares rather than a literal of its own', () => {
    // The rig sheet prices an assembly, and `componentTargetSize` owns that enumeration. A literal
    // here would be a second copy of it, wrong the first time a plan's answer changed.
    const config = output();
    const plan = rigPlan(config);
    const answer = sheetSizing('CHARACTER', SUBJECT, config, plan, CONTRACT, 3);

    expect(answer.stated?.quantity).toBe(plan.targetQuantity);
  });

  it('says nothing where the reader typed nothing and no rig applies', () => {
    const config = output({ spriteTargetSize: '' });
    const answer = sheetSizing('CHARACTER', SUBJECT, config, rigPlan(config), null, 3);

    expect(answer.text).toBe('');
    expect(answer.stated).toBeNull();
  });
});
