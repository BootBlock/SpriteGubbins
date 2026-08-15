import { beforeEach, describe, expect, it } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { RiggingFields } from './RiggingFields.tsx';

/**
 * That the rig this panel shows is the rig the prompt will carry.
 *
 * Two settings can take the choice away, and the panel has to answer each differently. A category
 * with no joints has nothing to choose between, so the select goes and a sentence says why. The
 * cut-out rig **sheet** is not that: there is a real value, it is one of the three the category
 * offers, and the joint, overlap and socket settings appear with it — so the control stays, showing
 * that value and naming the sheet that settled it. `src/utils/rigModes.test.ts` holds the compiled
 * prompt's half of the same agreement.
 */
const RIG_MODE = 'Rig Mode';
const RIG_SHEET = 'CUTOUT_RIG_SINGLE_DIRECTION';

function rigSelect(): HTMLSelectElement {
  return screen.getByRole('combobox', { name: RIG_MODE });
}

beforeEach(() => {
  useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
  useSubjectStore.setState({ category: 'CHARACTER' });
});

describe('RiggingFields', () => {
  it('leaves the rig open on a sheet that does not settle it', () => {
    render(<RiggingFields />);

    expect(rigSelect()).toHaveValue('POSE_LIBRARY');
    expect(rigSelect()).toHaveAttribute('aria-disabled', 'false');
    // The three that only mean anything for a cut-out rig, absent until one is asked for.
    expect(screen.queryByRole('combobox', { name: 'Joint Cap Style' })).not.toBeInTheDocument();

    act(() => {
      fireEvent.change(rigSelect(), { target: { value: 'CUTOUT_RIG' } });
    });
    expect(useOutputStore.getState().output.rigMode).toBe('CUTOUT_RIG');
    expect(screen.getByRole('combobox', { name: 'Joint Cap Style' })).toBeInTheDocument();
  });

  it('hands the rig to the sheet whose inventory is the rig, and says which sheet took it', () => {
    // The reported defect at the control: this sheet draws the rig pieces themselves, and the panel
    // used to leave `POSE_LIBRARY` selected beside it with the geometry settings hidden — so a user
    // on the rig sheet could not see that three of their settings were being dropped.
    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: RIG_SHEET } });
    render(<RiggingFields />);

    expect(rigSelect()).toHaveValue('CUTOUT_RIG');
    expect(rigSelect()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(new RegExp(`${RIG_SHEET} draws the rig pieces themselves`))).toBeInTheDocument();

    expect(screen.getByRole('combobox', { name: 'Joint Cap Style' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Overlap Margin' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Attachment Sockets' })).toBeInTheDocument();
  });

  it('refuses a change while the sheet holds the choice', () => {
    // `aria-disabled` keeps the control in the tab order so a keyboard user hears the reason, which
    // is what leaves the change itself to be refused in the handler — a `<select>` has no `readOnly`
    // to lean on the way the number field does.
    useOutputStore.setState({ output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: RIG_SHEET } });
    render(<RiggingFields />);

    act(() => {
      fireEvent.change(rigSelect(), { target: { value: 'NONE' } });
    });
    expect(useOutputStore.getState().output.rigMode).toBe(DEFAULT_OUTPUT_CONFIG.rigMode);
    expect(rigSelect()).toHaveValue('CUTOUT_RIG');
  });

  it('shows the rig the prompt will carry, not one a stored configuration is holding', () => {
    // A preset or history row written before the two axes were related, and the reproduction from
    // the report: the sheet is the rig sheet and the stored rig is the studio's own default.
    useOutputStore.setState({
      output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: RIG_SHEET, rigMode: 'NONE' },
    });
    render(<RiggingFields />);

    expect(rigSelect()).toHaveValue('CUTOUT_RIG');
  });

  it('replaces the select with a sentence where the category articulates about nothing', () => {
    // The other way the choice goes away, and the one that genuinely has nothing to show: a select
    // offering a single option is a control with nothing to do.
    useSubjectStore.setState({ category: 'BUILDING' });
    render(<RiggingFields />);

    expect(screen.queryByRole('combobox', { name: RIG_MODE })).not.toBeInTheDocument();
    expect(screen.getByText(/BUILDING sheets carry nothing that turns about a pivot/)).toBeInTheDocument();
  });
});
