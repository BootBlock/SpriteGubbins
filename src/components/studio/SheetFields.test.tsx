import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { defaultSubjectFor } from '../../constants/categories/index.ts';
import { DEFAULT_OUTPUT_CONFIG, DIRECTIONAL_MODE_TOOLTIPS } from '../../constants/output/index.ts';
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

/**
 * What a screen reader is told about the control, resolved through `aria-describedby` rather than
 * read off the page.
 *
 * Asserting that the paragraph is *somewhere* leaves the wiring unchecked, and the wiring is the
 * half that carries this to a reader who cannot see the two together — an attribute naming a stale
 * node renders identically.
 */
function describedBy(control: HTMLElement): string {
  const id = control.getAttribute('aria-describedby') ?? '';
  return document.getElementById(id)?.textContent ?? '';
}

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
    // The value stands where the category can honour it *and* the pairing being chosen can be drawn
    // for it, exactly as a category switch keeps a rig the new category has joints for. An object's
    // directional views turn its moving parts with the camera rather than posing them, so that
    // pairing settles nothing and the rig the sheet had taken over survives the hand-back.
    useSubjectStore.setState({ category: 'OBJECT', subject: defaultSubjectFor('OBJECT') });
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: RIG_SHEET, rigMode: 'CUTOUT_RIG' },
    });
    render(<SheetFields />);

    chooseMode('CORE_DIRECTIONAL_VARIANTS');

    expect(useOutputStore.getState().output.directionalMode).toBe('CORE_DIRECTIONAL_VARIANTS');
    expect(useOutputStore.getState().output.rigMode).toBe('CUTOUT_RIG');
  });

  it('drops the cut-out rig on a pairing whose artwork already carries the poses', () => {
    // What may not survive is a rig the pairing's own sheets contradict, and this is the store half
    // of that fix. A pose library asks in section 4 for each limb segment at three orientations; a
    // cut-out rig then asks in section 5 for every piece straight and unposed, and section 9 audits
    // for it. Landing on that sheet with `CUTOUT_RIG` still in the store is what used to compile a
    // prompt requiring what it forbids, so the write that changes the sheet contents degrades the
    // rig with it — to `POSE_LIBRARY`, which is what a set of separately oriented rigid segments
    // actually is, rather than to `NONE`, which would leave that inventory with no articulation
    // section at all.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: RIG_SHEET, rigMode: 'CUTOUT_RIG' },
    });
    render(<SheetFields />);

    chooseMode('SINGLE_DIRECTION_POSE_LIBRARY');

    expect(useOutputStore.getState().output.directionalMode).toBe('SINGLE_DIRECTION_POSE_LIBRARY');
    expect(useOutputStore.getState().output.rigMode).toBe('POSE_LIBRARY');
  });

  it('drops it on the directional pairing too, where a later sheet is the one that poses', () => {
    // The half a per-sheet answer could not give, and the reason the resolver reads a whole series:
    // a character's `CORE_DIRECTIONAL_VARIANTS` delivers a trunk sheet that settles nothing *and* an
    // articulation sheet of thirty-four limb variants, and those two assemble together. Answered per
    // sheet, the trunk compiled a cut-out rig — stating a joint cap style and an overlap margin —
    // while the sheet supplying the limbs those caps meet compiled a pose library and was told
    // neither.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: RIG_SHEET, rigMode: 'CUTOUT_RIG' },
    });
    render(<SheetFields />);

    chooseMode('CORE_DIRECTIONAL_VARIANTS');

    expect(useOutputStore.getState().output.rigMode).toBe('POSE_LIBRARY');
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

  it('reads out the account of the sheet actually chosen', () => {
    // The ⓘ used to carry the accounts of two of the four sheets, so a reader who had chosen a third
    // was handed both to read past. What is rendered here is the row for the chosen mode alone, and it
    // follows the control — which is why the assertion is on both halves of a change rather than on
    // the opening state.
    render(<SheetFields />);
    const contents = screen.getByRole('combobox', { name: SHEET_CONTENTS });

    expect(describedBy(contents)).toBe(DIRECTIONAL_MODE_TOOLTIPS.CORE_DIRECTIONAL_VARIANTS);

    chooseMode(RIG_SHEET);

    expect(describedBy(contents)).toBe(DIRECTIONAL_MODE_TOOLTIPS.CUTOUT_RIG_SINGLE_DIRECTION);
    expect(screen.queryByText(DIRECTIONAL_MODE_TOOLTIPS.CORE_DIRECTIONAL_VARIANTS)).toBeNull();
  });
});
