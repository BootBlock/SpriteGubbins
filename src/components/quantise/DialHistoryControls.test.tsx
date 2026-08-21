import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_COLOR_MERGE } from '../../constants/quantiser.ts';
import { useQuantiseStore } from '../../stores/useQuantiseStore.ts';
import { DialHistoryControls } from './DialHistoryControls.tsx';

/**
 * The panel's agreement with the store, and the shortcut's one hard rule.
 *
 * The stack's own behaviour is pinned in `utils/dialHistory.test.ts`, and what can only be checked
 * here is the wiring: that the buttons offer exactly the steps there are, and that Ctrl+Z reaches
 * the dials from wherever the reader's focus happens to be — except from inside a text box, where
 * it is the browser's own undo and taking it would eat their typing.
 */

describe('DialHistoryControls', () => {
  beforeEach(() => {
    useQuantiseStore.getState().clear();
  });

  it('offers nothing to step back to until a dial moves', () => {
    render(<DialHistoryControls />);

    expect(screen.getByText('Nothing to step back to')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('counts the steps back and walks them on a press', async () => {
    const user = userEvent.setup();
    useQuantiseStore.getState().setColorMerge(24);
    useQuantiseStore.getState().setCleanupPasses(3);
    render(<DialHistoryControls />);

    expect(screen.getByText('2 steps back')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useQuantiseStore.getState().cleanupPasses).toBe(1);
    expect(screen.getByText('1 step back')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(useQuantiseStore.getState().cleanupPasses).toBe(3);
  });

  it('undoes and redoes from the keyboard, wherever the focus is', async () => {
    const user = userEvent.setup();
    useQuantiseStore.getState().setColorMerge(24);
    render(<DialHistoryControls />);

    await user.keyboard('{Control>}z{/Control}');
    expect(useQuantiseStore.getState().colorMerge).toBe(DEFAULT_COLOR_MERGE);

    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');
    expect(useQuantiseStore.getState().colorMerge).toBe(24);

    await user.keyboard('{Control>}z{/Control}');
    await user.keyboard('{Control>}y{/Control}');
    expect(useQuantiseStore.getState().colorMerge).toBe(24);
  });

  it('leaves the shortcut to a text box that has its own undo', async () => {
    // The grid box and the two preset name fields. A reader pressing Ctrl+Z while typing in one
    // means their typing, and a window-wide binding that took it would delete a name they were
    // halfway through instead.
    const user = userEvent.setup();
    useQuantiseStore.getState().setColorMerge(24);
    render(
      <>
        <input aria-label="A name" type="text" />
        <DialHistoryControls />
      </>,
    );

    await user.click(screen.getByLabelText('A name'));
    await user.keyboard('{Control>}z{/Control}');

    expect(useQuantiseStore.getState().colorMerge).toBe(24);
  });

  it('keeps the shortcut for a slider, which has no undo of its own', async () => {
    // The other half of that rule, and the half that decides it: fifteen of the eighteen dials are a
    // slider or a select, so a guard written as "an input has focus" would turn the shortcut off
    // exactly where a reader has just used it.
    const user = userEvent.setup();
    useQuantiseStore.getState().setColorMerge(24);
    render(
      <>
        <input aria-label="A dial" type="range" />
        <DialHistoryControls />
      </>,
    );

    await user.click(screen.getByLabelText('A dial'));
    await user.keyboard('{Control>}z{/Control}');

    expect(useQuantiseStore.getState().colorMerge).toBe(DEFAULT_COLOR_MERGE);
  });
});
