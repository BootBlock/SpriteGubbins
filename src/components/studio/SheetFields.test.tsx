import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { SheetFields } from './SheetFields.tsx';

/**
 * That choosing a sheet leaves the configuration coherent with it.
 *
 * The sheet mode is the one control that decides things about its neighbours: the sheet of a series
 * has to go back to the first, and the cut-out rig sheet settles the rig, because its components
 * *are* the rig pieces. The compiler resolves both whatever the store holds, so what these pin is
 * the store — a configuration that disagrees with the controls showing it is what a saved preset
 * would then carry.
 */
const SHEET_CONTENTS = 'Sheet Contents';
const RIG_SHEET = 'CUTOUT_RIG_SINGLE_DIRECTION';

function chooseMode(mode: string): void {
  act(() => {
    fireEvent.change(screen.getByRole('combobox', { name: SHEET_CONTENTS }), {
      target: { value: mode },
    });
  });
}

beforeEach(() => {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useSubjectStore.setState({ category: 'CHARACTER', subject: defaultSubjectFor('CHARACTER') });
});

describe('SheetFields', () => {
  it('settles the rig when the sheet chosen is the rig itself', () => {
    render(<SheetFields />);
    expect(useOutputStore.getState().output.rigMode).toBe('POSE_LIBRARY');

    chooseMode(RIG_SHEET);

    expect(useOutputStore.getState().output.rigMode).toBe('CUTOUT_RIG');
    expect(useOutputStore.getState().output.sheetIndex).toBe(0);
  });

  it('hands the rig back with the sheet that took it', () => {
    // The value stands where the category can honour it, exactly as a category switch keeps a rig
    // the new category has joints for. What may not survive is a rig its own sheet contradicts.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: RIG_SHEET, rigMode: 'CUTOUT_RIG' },
    });
    render(<SheetFields />);

    chooseMode('SINGLE_DIRECTION_POSE_LIBRARY');

    expect(useOutputStore.getState().output.directionalMode).toBe('SINGLE_DIRECTION_POSE_LIBRARY');
    expect(useOutputStore.getState().output.rigMode).toBe('CUTOUT_RIG');
  });

  it('sends the sheet of the series back to the first', () => {
    // Every mode has a first sheet and not every mode has a second, so an index held over would put
    // the select below on a value its own options do not contain.
    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1 } });
    render(<SheetFields />);

    chooseMode(RIG_SHEET);

    expect(useOutputStore.getState().output.sheetIndex).toBe(0);
  });
});
