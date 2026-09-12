import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HistoryControls } from './HistoryControls.tsx';

/**
 * The panel two tabs put over an undo stack.
 *
 * Each caller's suite checks that its own store's counts arrive here. What is left for this one is what
 * the panel makes of any counts at all: the empty state, a count that reads in the singular and the
 * plural, each step offered only when there is somewhere for it to go — and the shortcut, which the
 * panel claims for the window on the stack's behalf. That last is why the panel is shared rather than
 * written twice: a second copy is where one tab quietly stops answering Ctrl+Z.
 */
function renderControls(stepsBack: number, canRedo: boolean) {
  const undo = vi.fn();
  const redo = vi.fn();
  const view = render(
    <HistoryControls
      label="Dial history"
      stepsBack={stepsBack}
      canRedo={canRedo}
      undo={undo}
      redo={redo}
      undoTooltip="Steps the dials back one move."
      redoTooltip="Puts back the move you stepped back from."
      guidance="Every dial you move can be stepped back."
    />,
  );
  return { undo, redo, view };
}

describe('HistoryControls', () => {
  it('says there is nothing to step back to, and offers neither step', () => {
    renderControls(0, false);

    expect(screen.getByText('Dial history')).toBeInTheDocument();
    expect(screen.getByText('Nothing to step back to')).toBeInTheDocument();
    expect(screen.getByText('Every dial you move can be stepped back.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('counts the steps back in the singular and the plural', () => {
    const { view } = renderControls(1, false);
    expect(screen.getByText('1 step back')).toBeInTheDocument();

    view.unmount();
    renderControls(3, false);
    expect(screen.getByText('3 steps back')).toBeInTheDocument();
  });

  it('offers each step only where there is somewhere for it to go, and takes it on a press', async () => {
    const user = userEvent.setup();
    const { undo, redo } = renderControls(2, true);

    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await user.click(screen.getByRole('button', { name: 'Redo' }));

    expect(undo).toHaveBeenCalledOnce();
    expect(redo).toHaveBeenCalledOnce();
  });

  it('keeps Redo shut once the stack has been written over', () => {
    renderControls(2, false);

    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDisabled();
  });

  it('answers the keyboard shortcut on the stack’s behalf', async () => {
    const user = userEvent.setup();
    const { undo, redo } = renderControls(2, true);

    await user.keyboard('{Control>}z{/Control}');
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    expect(undo).toHaveBeenCalledOnce();
    expect(redo).toHaveBeenCalledOnce();
  });
});
