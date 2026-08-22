import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { SheetFields } from './SheetFields.tsx';

/**
 * That choosing a sheet leaves the configuration coherent with it, and that the panel's two counts
 * of sheets are named for the two different things they count.
 *
 * The sheet mode is the one control that decides things about its neighbours: the part of the
 * inventory has to go back to the first, and the cut-out rig sheet settles the rig, because its
 * components *are* the rig pieces. The compiler resolves both whatever the store holds, so what
 * these pin is the store — a configuration that disagrees with the controls showing it is what a
 * saved preset would then carry.
 */
const SHEET_CONTENTS = 'Sheet Contents';
const INVENTORY_PART = 'Inventory Part';
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

  it('names the two selects for the two different axes they count', () => {
    // The fix for the reported failure, and nothing else pins it. The panel carries two counts of
    // sheets — the parts of an inventory, and the generations a batch comes to — and while the
    // second select was called `Sheet of Series` and numbered its options `1.`, `2.`, a reader who
    // set it to the second entry and read `Sheet 2 of 6` beside the prompt took the six as six of
    // what they had just chosen. So the accessible name is the assertion, and so is the absence of
    // an ordinal on the options: both are what a reader reads.
    render(<SheetFields />);

    expect(screen.getByRole('combobox', { name: INVENTORY_PART })).toBeTruthy();
    expect(screen.queryByRole('combobox', { name: 'Sheet of Series' })).toBeNull();

    const parts = screen.getByRole('combobox', { name: INVENTORY_PART });
    const labels = [...parts.querySelectorAll('option')].map((option) => option.textContent);
    expect(labels).toEqual(['Directional core (15)', 'Articulation (34)']);
  });

  it('sends the part of the inventory back to the first', () => {
    // Every mode has a first part and not every mode has a second, so an index held over would put
    // the select below on a value its own options do not contain.
    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, sheetIndex: 1 } });
    render(<SheetFields />);

    chooseMode(RIG_SHEET);

    expect(useOutputStore.getState().output.sheetIndex).toBe(0);
  });
});
