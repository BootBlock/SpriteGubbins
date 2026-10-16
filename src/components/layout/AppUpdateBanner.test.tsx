import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useUIStore } from '../../stores/useUIStore.ts';
import type { AppUpdate } from '../../types/appUpdate.ts';
import { AppUpdateBanner } from './AppUpdateBanner.tsx';

const applyAppUpdate = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('../../workers/applyAppUpdate.ts', () => ({ applyAppUpdate }));

/**
 * The offer to start a newer build, which replaced a forced reload that cleared whatever was only on
 * screen (issue #369). Nothing reloads until the reader presses Reload.
 */
function renderWith(update: AppUpdate) {
  act(() => {
    useUIStore.getState().setAppUpdate(update);
  });
  return render(<AppUpdateBanner />);
}

afterEach(() => {
  useUIStore.getState().setAppUpdate('current');
  applyAppUpdate.mockClear();
  vi.unstubAllGlobals();
});

describe('AppUpdateBanner', () => {
  it('shows nothing while this tab runs the newest build it knows of', () => {
    renderWith('current');

    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('starts a waiting build only when the reader asks', async () => {
    const user = userEvent.setup({ delay: null });
    renderWith('waiting');

    expect(screen.getByRole('status')).toHaveTextContent('A new version of Sprite Gubbins is ready.');
    expect(applyAppUpdate).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Reload' }));

    expect(applyAppUpdate).toHaveBeenCalledOnce();
  });

  it('reloads a tab another tab moved to a new build, when the reader asks', async () => {
    const user = userEvent.setup({ delay: null });
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    renderWith('elsewhere');

    expect(screen.getByRole('status')).toHaveTextContent('Another tab started a new version');

    await user.click(screen.getByRole('button', { name: 'Reload' }));

    expect(reload).toHaveBeenCalledOnce();
    expect(applyAppUpdate).not.toHaveBeenCalled();
  });

  it('offers nothing more to press while the new build starts', () => {
    renderWith('starting');

    expect(screen.getByRole('status')).toHaveTextContent('Starting the new version of Sprite Gubbins.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('puts the notice away without starting anything', async () => {
    const user = userEvent.setup({ delay: null });
    renderWith('waiting');

    await user.click(screen.getByRole('button', { name: 'Not now' }));

    expect(useUIStore.getState().appUpdate).toBe('current');
    expect(screen.queryByRole('button', { name: 'Reload' })).not.toBeInTheDocument();
    expect(applyAppUpdate).not.toHaveBeenCalled();
  });
});
