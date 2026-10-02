import { describe, expect, it } from 'vitest';
import { defaultSubjectFor } from '../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../constants/output/index.ts';
import { DEFAULT_MODE_FOR } from '../constants/sheetPlans/index.ts';
import type { OutputConfig } from '../types/output.ts';
import { outputFollowingBase } from './outputFollowingBase.ts';

const TURRET = { ...defaultSubjectFor('OBJECT'), anatomy: 'Multi-Segment Turret' };
const RIGID = { ...defaultSubjectFor('OBJECT'), anatomy: 'Single Rigid Object' };
const RIGGED: OutputConfig = {
  ...DEFAULT_OUTPUT_CONFIG,
  directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION',
  rigMode: 'CUTOUT_RIG',
};

describe('outputFollowingBase', () => {
  it('settles the mode and the rig a new base’s plans cannot draw', () => {
    const settled = outputFollowingBase('OBJECT', TURRET, RIGID, RIGGED);
    expect(settled?.directionalMode).toBe(DEFAULT_MODE_FOR.OBJECT);
    expect(settled?.rigMode).toBe('NONE');
  });

  it('moves nothing where the plans are one table before and after', () => {
    expect(outputFollowingBase('OBJECT', TURRET, { ...TURRET, setting: 'Deep Space' }, RIGGED)).toBeNull();
  });

  it('moves nothing where the new plans can draw the output as it stands', () => {
    expect(outputFollowingBase('OBJECT', RIGID, TURRET, DEFAULT_OUTPUT_CONFIG)).toBeNull();
  });
});
