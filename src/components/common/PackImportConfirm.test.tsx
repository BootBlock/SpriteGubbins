import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LIBRARY_PACK_ITEMS } from '../../constants/packImport.ts';
import { PackImportConfirm } from './PackImportConfirm.tsx';

/**
 * The question that stands between a press of Import and an irreversible delete of the reader's own
 * work. What it has to get right is that it says what the replacement costs, that either answer is
 * reachable, and that Cancel is where focus lands.
 */
function renderConfirm(overrides: { readonly replacing?: number } = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <PackImportConfirm
      incoming={4}
      replacing={overrides.replacing ?? 11}
      noun={LIBRARY_PACK_ITEMS}
      confirmGuidance="Replaces them for good."
      cancelGuidance="Leaves them alone."
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
  );
  return { onConfirm, onCancel };
}

describe('PackImportConfirm', () => {
  it('names both figures on screen, where a touchscreen can read them', () => {
    // The defect: the only warning was the import button's tooltip, and `ControlTooltip` cannot be
    // reached by touch at all.
    renderConfirm();

    expect(screen.getByText(/4 saved items/)).toBeInTheDocument();
    expect(screen.getByText(/11 saved items/)).toBeInTheDocument();
  });

  it('names both figures on each button, because the sentence cannot be attached to one', async () => {
    // `ControlTooltip` clones its child and writes `aria-describedby` itself, so a description set
    // here is overwritten — absent while its card is hidden, and pointing at the card while it is up.
    renderConfirm();

    expect(
      screen.getByRole('button', {
        name: 'Replace your saved items with the 4 saved items in this file',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Cancel the import and keep your 11 saved items' }),
    ).toBeInTheDocument();
  });

  it('lands focus on Cancel, so a stray Enter is harmless', async () => {
    const { onConfirm, onCancel } = renderConfirm();

    expect(screen.getByRole('button', { name: /^Cancel the import/ })).toHaveFocus();

    await userEvent.keyboard('{Enter}');
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('asks the store to replace only when Replace is pressed', async () => {
    const { onConfirm, onCancel } = renderConfirm();

    await userEvent.click(screen.getByRole('button', { name: /^Replace your/ }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('drops the warning when there is nothing of the reader’s to lose', () => {
    renderConfirm({ replacing: 0 });

    expect(screen.getByText(/deletes nothing of yours/)).toBeInTheDocument();
  });
});
