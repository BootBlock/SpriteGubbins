import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { useComponentTarget } from './useComponentTarget.ts';

/**
 * Which size the Quantise tab and the atlas calculator hold one component against. The per-plan rule
 * is pinned in `utils/componentTargetSize.test.ts`; these cases pin that the hook reads the field and
 * the plan from the studio as it stands, and withdraws the figure where the plan states an assembly.
 */

function target() {
  return renderHook(() => useComponentTarget()).result.current;
}

describe('useComponentTarget', () => {
  beforeEach(() => {
    useOutputStore.setState(useOutputStore.getInitialState());
    useSubjectStore.setState(useSubjectStore.getInitialState());
    // An icon library states its size per icon, so the field reaches the reader as typed.
    useSubjectStore.setState({ category: 'ICON' });
    useOutputStore.getState().setOutputField('directionalMode', 'SINGLE_DIRECTION_POSE_LIBRARY');
    // The one profile that reads a typed size.
    useOutputStore.getState().setOutputField('resolutionProfile', 'CUSTOM');
  });

  it('reads the size the studio states for one component', () => {
    useOutputStore.getState().setOutputField('spriteTargetSize', '24 × 40 px');

    expect(target()).toStrictEqual({ width: 24, height: 40 });
  });

  it('states nothing under a profile that states a scale of its own', () => {
    // Issue #405: the prompt carries no size there, so no panel may measure against one.
    useOutputStore.getState().setOutputField('spriteTargetSize', '24 × 40 px');
    for (const profile of ['HIGH_RESOLUTION', 'MID_RESOLUTION', 'RETRO_16_BIT'] as const) {
      useOutputStore.getState().setOutputField('resolutionProfile', profile);
      expect(target(), profile).toBeNull();
    }
  });

  it('states nothing while the field names no size', () => {
    useOutputStore.getState().setOutputField('spriteTargetSize', '');

    expect(target()).toBeNull();
  });

  it('withdraws the size where the sheet states the subject its parts assemble into', () => {
    useSubjectStore.setState({ category: 'CHARACTER' });
    useOutputStore.getState().setOutputField('directionalMode', 'CUTOUT_RIG_SINGLE_DIRECTION');
    useOutputStore.getState().setOutputField('spriteTargetSize', '48 × 96 px');

    expect(target()).toBeNull();
  });
});
