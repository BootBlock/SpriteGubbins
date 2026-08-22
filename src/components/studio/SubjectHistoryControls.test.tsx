import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_OUTPUT_CONFIG } from '../../constants/output/index.ts';
import { DEFAULT_PRESET } from '../../constants/presets/index.ts';
import { useOutputStore } from '../../stores/useOutputStore.ts';
import { useSubjectStore } from '../../stores/useSubjectStore.ts';
import { SubjectHistoryControls } from './SubjectHistoryControls.tsx';

/**
 * The panel's agreement with the store, and the shortcut's one hard rule.
 *
 * The stack's own behaviour is pinned in `utils/studioHistory.test.ts` and its wiring to the two
 * stores in `stores/useSubjectStore.test.ts`. What can only be checked here is that the buttons
 * offer exactly the steps there are, and that Ctrl+Z reaches the subject from wherever focus
 * happens to be — except from inside a text box, where it is the browser's own undo and taking it
 * would eat the reader's typing into a combo box.
 */

describe('SubjectHistoryControls', () => {
  beforeEach(() => {
    useOutputStore.setState({ output: DEFAULT_OUTPUT_CONFIG });
    useSubjectStore.setState({
      category: DEFAULT_PRESET.category,
      subject: DEFAULT_PRESET.subject,
    });
    useSubjectStore.getState().openStudio();
  });

  it('offers nothing to step back to until an act is performed', () => {
    render(<SubjectHistoryControls />);

    expect(screen.getByText('Nothing to step back to')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('does not count a field edit as a step', () => {
    useSubjectStore.getState().setField('role', 'Bartender');
    render(<SubjectHistoryControls />);

    expect(screen.getByText('Nothing to step back to')).toBeInTheDocument();
  });

  it('counts the steps back and walks them on a press', async () => {
    const user = userEvent.setup();
    useSubjectStore.getState().setCategory('BUILDING');
    useSubjectStore.getState().setCategory('CREATURE');
    render(<SubjectHistoryControls />);

    expect(screen.getByText('2 steps back')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(useSubjectStore.getState().category).toBe('BUILDING');
    expect(screen.getByText('1 step back')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Redo' }));
    expect(useSubjectStore.getState().category).toBe('CREATURE');
    expect(screen.getByText('2 steps back')).toBeInTheDocument();
  });

  it('steps back on Ctrl+Z from anywhere on the page', async () => {
    const user = userEvent.setup();
    useSubjectStore.getState().setCategory('BUILDING');
    render(<SubjectHistoryControls />);

    await user.keyboard('{Control>}z{/Control}');

    expect(useSubjectStore.getState().category).toBe(DEFAULT_PRESET.category);
  });

  it('leaves Ctrl+Z alone inside a text box, which has an undo of its own', async () => {
    const user = userEvent.setup();
    useSubjectStore.getState().setCategory('BUILDING');
    render(
      <>
        <SubjectHistoryControls />
        <input aria-label="A subject field" type="text" />
      </>,
    );

    await user.click(screen.getByRole('textbox', { name: 'A subject field' }));
    await user.keyboard('{Control>}z{/Control}');

    expect(useSubjectStore.getState().category).toBe('BUILDING');
  });
});
