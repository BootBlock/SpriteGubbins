import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { UNSUNG_SAVIOUR_PRESETS } from '../constants/presets/unsungSaviour.ts';
import { useOutputStore } from '../stores/useOutputStore.ts';
import { useSubjectStore } from '../stores/useSubjectStore.ts';
import { parseAdditionalAnatomy } from '../utils/additionalAnatomy.ts';
import { componentCountFor } from '../utils/componentSet.ts';
import { useExpectedComponents } from './useExpectedComponents.ts';

/**
 * The hook is store reads and a memo around `componentCountFor`, whose arithmetic is pinned in
 * `utils/componentSet.test.ts` — so what can go wrong here is the wiring: an input read from the
 * wrong field, or not read at all. Each case moves **one** input, checks that the count moved, and
 * checks that it moved to what the function says for the stores as they now stand. A hook that
 * dropped the input would still report the count from before the move.
 */

function counted(): number {
  return renderHook(() => useExpectedComponents()).result.current;
}

/** The count the pure function gives for the stores as they stand, read straight off them. */
function fromStores(): number {
  const { category, subject } = useSubjectStore.getState();
  const { output } = useOutputStore.getState();
  return componentCountFor(
    category,
    { anatomy: subject.anatomy, clothing: subject.clothing, face_head: subject.face_head },
    output.directionalMode,
    output.directions,
    output.sheetIndex,
    parseAdditionalAnatomy(subject.additional_anatomy),
    output.rigContract,
  );
}

function expectFollows(before: number) {
  const after = counted();
  expect(after).not.toBe(before);
  expect(after).toBe(fromStores());
}

describe('useExpectedComponents', () => {
  beforeEach(() => {
    useOutputStore.setState(useOutputStore.getInitialState());
    useSubjectStore.setState(useSubjectStore.getInitialState());
  });

  it('reads the count the stores describe', () => {
    expect(counted()).toBe(fromStores());
  });

  it('follows the additional anatomy', () => {
    const before = counted();
    useSubjectStore.getState().setField('additional_anatomy', 'Tail ×2');
    expectFollows(before);
  });

  it('follows the category', () => {
    const before = counted();
    useSubjectStore.setState({ category: 'ICON' });
    expectFollows(before);
  });

  it('follows the directional mode', () => {
    const before = counted();
    useOutputStore.getState().setOutputField('directionalMode', 'SINGLE_DIRECTION_POSE_LIBRARY');
    expectFollows(before);
  });

  it('follows the direction set', () => {
    const before = counted();
    const { directions } = useOutputStore.getState().output;
    useOutputStore
      .getState()
      .setOutputField('directions', directions === 'SINGLE_FRONT' ? 'FIVE_CLASSIC' : 'SINGLE_FRONT');
    expectFollows(before);
  });

  it('follows a loaded rig contract', () => {
    // A contract replaces the rest sheet's inventory with its own slots. The shipped rig declares the
    // same number of pieces the sheet plan does, so it is cut to three here: a count that did not
    // move would then be a hook that never read the contract.
    const preset = UNSUNG_SAVIOUR_PRESETS.find((candidate) => candidate.id === 'us-character-rig');
    const rig = preset?.output.rigContract;
    if (preset === undefined || rig === null || rig === undefined) {
      throw new Error('The rig preset is missing.');
    }
    useSubjectStore.setState({ category: preset.category, subject: preset.subject });
    useOutputStore.setState({
      output: { ...useOutputStore.getState().output, ...preset.output, rigContract: null },
    });
    const before = counted();
    useOutputStore.getState().setOutputField('rigContract', { ...rig, slots: rig.slots.slice(0, 3) });
    expectFollows(before);
  });
});
