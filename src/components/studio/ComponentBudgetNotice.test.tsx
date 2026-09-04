import { beforeEach, describe, expect, it } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { NO_COMPONENT_BUDGET } from '../../constants/componentBudget.ts';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { DEFAULT_PRESET } from '../../constants/presets/index.ts';
import { componentCountFor } from '../../utils/componentSet.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { ComponentBudgetNotice } from './ComponentBudgetNotice.tsx';

/**
 * The budget's visible effect on the sheet the studio is configured to; the split drawer's per-row
 * chip is the other half, and `SheetSplitContents.test.tsx` pins that. What is being pinned here is the
 * boundary — a warning that fires a component early would train the user to ignore it, and one that
 * fires a component late is not there for the sheet it exists to catch.
 */
const RIG = componentCountFor(
  DEFAULT_PRESET.category,
  'CUTOUT_RIG_SINGLE_DIRECTION',
  DEFAULT_OUTPUT_CONFIG.directions,
  0,
  '',
  [],
);

/** Is the warning on screen? Matched on the phrase the notice leads with. */
function isWarning(): boolean {
  return screen.queryByText(/asks for \d+ components against a budget of/) !== null;
}

beforeEach(() => {
  useSubjectStore.setState({ category: DEFAULT_PRESET.category, subject: DEFAULT_PRESET.subject });
  useOutputStore.setState({
    output: { ...DEFAULT_OUTPUT_CONFIG, directionalMode: 'CUTOUT_RIG_SINGLE_DIRECTION' },
  });
});

describe('ComponentBudgetNotice', () => {
  it('says nothing while the sheet fits, and speaks the moment it does not', () => {
    useOutputStore.setState({
      output: { ...useOutputStore.getState().output, componentBudget: RIG },
    });
    render(<ComponentBudgetNotice />);
    expect(isWarning()).toBe(false);

    act(() => {
      useOutputStore.getState().setOutputField('componentBudget', RIG - 1);
    });

    expect(isWarning()).toBe(true);
    expect(
      screen.getByText(
        `This sheet asks for ${String(RIG)} components against a budget of ${String(RIG - 1)}.`,
      ),
    ).toBeInTheDocument();
  });

  it('counts the subject’s additional anatomy into what it is warning about', () => {
    // The case the budget is actually for: the mode alone fits, and the anatomy is what pushes it
    // over. A notice reading the mode's own count would stay silent here.
    useOutputStore.setState({
      output: { ...useOutputStore.getState().output, componentBudget: RIG },
    });
    render(<ComponentBudgetNotice />);
    expect(isWarning()).toBe(false);

    act(() => {
      useSubjectStore.getState().setField('additional_anatomy', 'Wing ×2');
    });

    expect(
      screen.getByText(
        `This sheet asks for ${String(RIG + 2)} components against a budget of ${String(RIG)}.`,
      ),
    ).toBeInTheDocument();
  });

  it('stays quiet when the budget is zero, however large the sheet', () => {
    useOutputStore.setState({
      output: {
        ...useOutputStore.getState().output,
        directionalMode: 'CORE_DIRECTIONAL_VARIANTS',
        componentBudget: NO_COMPONENT_BUDGET,
      },
    });
    useSubjectStore.getState().setField('additional_anatomy', 'Wing ×4, Tail ×1');

    render(<ComponentBudgetNotice />);
    expect(isWarning()).toBe(false);
  });

  it('announces through a live region that was already in the document', () => {
    // A region added at the same moment as its text is not reliably announced, so the wrapper is
    // rendered even while the sheet fits. This is the assertion that catches someone "tidying" the
    // component into an early return.
    useOutputStore.setState({
      output: { ...useOutputStore.getState().output, componentBudget: RIG },
    });
    const { container } = render(<ComponentBudgetNotice />);

    const region = container.querySelector('[aria-live="polite"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe('');
  });

  it('marks itself as needing attention, not as an error or a live value', () => {
    // Gold is the palette's "needs attention". Rose would claim the configuration is invalid when
    // it compiles perfectly well, and cyan is reserved for state recomputing as the user types.
    useOutputStore.setState({
      output: { ...useOutputStore.getState().output, componentBudget: RIG - 1 },
    });
    render(<ComponentBudgetNotice />);

    expect(screen.getByText('Over budget')).toHaveClass('text-gold');
  });
});
